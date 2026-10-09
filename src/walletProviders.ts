/**
 * Which EIP-1193 provider the SDK talks to when the host did not pass one.
 *
 * Before this module the SDK used `window.ethereum` and nothing else. With
 * two or more wallet extensions installed that object is whichever extension
 * injected last, or a multiplexer that forwards each request to a wallet of
 * its own choosing, so `eth_requestAccounts` can be answered by one wallet
 * and `personal_sign` by another. The second wallet has no permission for
 * the first wallet's account on this origin and refuses with EIP-1193 4100;
 * MetaMask's inpage script logs "StreamMiddleware - Unknown response id"
 * when replies arrive for requests it did not send.
 *
 * EIP-6963 fixes the ambiguity: every wallet announces itself with an `info`
 * (uuid, name, icon, rdns) and its own provider, so the SDK can pick one
 * deterministically and keep using it for the whole flow.
 *
 * Selection, in order (see `selectProvider`):
 *   1. the provider the host passed to init({ provider });
 *   2. the announced wallet whose rdns matches init({ walletRdns });
 *   3. the only candidate, when there is one;
 *   4. an announced wallet that already lists an authorised account for this
 *      origin (eth_accounts non-empty), when exactly one does;
 *   5. `window.ethereum`, as before, with a warning naming every candidate.
 *
 * The discovery parts take a `window`-like object so they are unit-tested
 * with a fake (test/walletProviders.test.ts).
 */

export interface Eip6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface ProviderCandidate {
  provider: any;
  info: Eip6963ProviderInfo | null;
  /** 'eip6963' | 'window.ethereum.providers' | 'window.ethereum' */
  source: string;
}

type WindowLike = {
  addEventListener?: (type: string, listener: (ev: any) => void) => void;
  dispatchEvent?: (ev: any) => boolean;
  ethereum?: any;
  CustomEvent?: any;
  Event?: any;
};

const _announced = new Map<string, ProviderCandidate>();
let _listening = false;

/**
 * Start listening for EIP-6963 announcements and ask wallets to announce.
 * Idempotent. Wallets answer synchronously or within a tick, so calling this
 * at init() leaves the list ready by the time a viewer presses play.
 */
export function startProviderDiscovery(win: WindowLike | undefined): void {
  if (!win || typeof win.addEventListener !== 'function' || typeof win.dispatchEvent !== 'function') {
    return;
  }
  if (!_listening) {
    _listening = true;
    win.addEventListener('eip6963:announceProvider', (ev: any) => {
      const detail = ev?.detail;
      const info = detail?.info;
      const provider = detail?.provider;
      if (!provider || !info || typeof info.rdns !== 'string') return;
      _announced.set(info.rdns, { provider, info, source: 'eip6963' });
    });
  }
  try {
    const EventCtor = win.Event ?? (typeof Event !== 'undefined' ? Event : null);
    if (EventCtor) win.dispatchEvent(new EventCtor('eip6963:requestProvider'));
  } catch {
    // A host without Event: discovery is simply unavailable there.
  }
}

/** Wallets announced so far (EIP-6963), in announcement order. */
export function announcedProviders(): ProviderCandidate[] {
  return Array.from(_announced.values());
}

/** Test seam. */
export function resetProviderDiscovery(): void {
  _announced.clear();
  _listening = false;
}

/**
 * Every provider the page exposes: EIP-6963 announcements, the legacy
 * `window.ethereum.providers` array (Coinbase Wallet and others), and
 * `window.ethereum` itself. De-duplicated by object identity.
 */
export function candidateProviders(win: WindowLike | undefined): ProviderCandidate[] {
  const out: ProviderCandidate[] = [];
  const seen = new Set<any>();
  const add = (c: ProviderCandidate) => {
    if (!c.provider || seen.has(c.provider)) return;
    seen.add(c.provider);
    out.push(c);
  };
  for (const c of announcedProviders()) add(c);
  const eth = win?.ethereum;
  if (eth && Array.isArray(eth.providers)) {
    for (const p of eth.providers) add({ provider: p, info: null, source: 'window.ethereum.providers' });
  }
  if (eth) add({ provider: eth, info: null, source: 'window.ethereum' });
  return out;
}

/** A short, log-safe description of a provider: its rdns or its flag set. */
export function describeProvider(c: ProviderCandidate | null | undefined): string {
  if (!c) return 'none';
  if (c.info?.rdns) return `${c.info.rdns} (${c.source})`;
  const p = c.provider ?? {};
  const flags = [
    'isMetaMask',
    'isCoinbaseWallet',
    'isRabby',
    'isPhantom',
    'isBraveWallet',
    'isTrust',
    'isOkxWallet',
    'isRainbow',
    'isZerion',
    'isFrame',
  ].filter((f) => p[f] === true);
  const multi = Array.isArray(p.providers) ? ` providers[${p.providers.length}]` : '';
  return `${flags.length ? flags.join(',') : 'unknown wallet'}${multi} (${c.source})`;
}

/**
 * Pick the provider for this page. Pure given its inputs; `authorised`
 * answers whether a candidate already lists an authorised account for this
 * origin (the caller probes eth_accounts; a probe that throws is `false`).
 * Returns the chosen candidate and the reason, for the log line.
 */
export async function selectProvider(
  candidates: ProviderCandidate[],
  opts: {
    injected?: any;
    preferRdns?: string | null;
    authorised?: (c: ProviderCandidate) => Promise<boolean>;
    /** `window.ethereum` itself, so the fallback is the same object as before even when it was announced too. */
    legacy?: any;
  } = {},
): Promise<{ chosen: ProviderCandidate | null; reason: string }> {
  if (opts.injected) {
    return {
      chosen: { provider: opts.injected, info: null, source: 'init({ provider })' },
      reason: 'host-provided',
    };
  }
  if (!candidates.length) return { chosen: null, reason: 'no-provider' };

  if (opts.preferRdns) {
    const want = opts.preferRdns.toLowerCase();
    const match = candidates.find((c) => c.info?.rdns?.toLowerCase() === want);
    if (match) return { chosen: match, reason: `walletRdns=${opts.preferRdns}` };
  }

  if (candidates.length === 1) return { chosen: candidates[0], reason: 'only-candidate' };

  const announced = candidates.filter((c) => c.source === 'eip6963');
  if (announced.length === 1) return { chosen: announced[0], reason: 'only-announced' };

  if (opts.authorised && announced.length > 1) {
    const ready: ProviderCandidate[] = [];
    for (const c of announced) {
      let ok = false;
      try {
        ok = await opts.authorised(c);
      } catch {
        ok = false;
      }
      if (ok) ready.push(c);
    }
    if (ready.length === 1) return { chosen: ready[0], reason: 'already-authorised' };
  }

  const legacy =
    (opts.legacy && candidates.find((c) => c.provider === opts.legacy)) ??
    candidates.find((c) => c.source === 'window.ethereum') ??
    candidates[0];
  return { chosen: legacy, reason: 'ambiguous-fallback' };
}
