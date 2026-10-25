/**
 * One wallet prompt that connects AND signs in (2.5.0): ERC-7846
 * `wallet_connect` with the `signInWithEthereum` capability. The wallet
 * writes the SIWE message from a nonce and a chain id and returns the
 * account, the message and the signature together.
 *
 * Supported today by Base Account / Coinbase Smart Wallet. Every other
 * wallet answers "method not supported" with no popup, and the player falls
 * back to connect, then sign (two prompts, one step). A viewer who DECLINES
 * the prompt is not offered the fallback silently: that is a refusal, and it
 * propagates as one.
 *
 * Pure given a provider and a fetch: unit-tested in
 * test/walletConnectSignIn.test.ts.
 */

import { classifyWalletError, markWalletError } from './walletErrors';

type Provider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

/** A proof the wallet made; posted with viewer-session as `siwe_message`. */
export interface WalletBuiltProof {
  address: string;
  message: string;
  signature: string;
  nonce: string;
}

/**
 * Whether to try wallet_connect at all. Only wallets that identify as
 * Coinbase / Base: some embedded providers (the Farcaster host wallet, see
 * farcaster_miniapp host-gate.js) never answer a method they do not know, so
 * a blind probe could hang the play button. Everyone else connects and signs
 * the usual way, which they would have to anyway.
 */
export function mayConnectAndSignIn(provider: unknown): boolean {
  const p = provider as Record<string, unknown> | null;
  if (!p || typeof (p as any).request !== 'function') return false;
  return !!(p.isCoinbaseWallet || p.isCoinbaseBrowser || p.isBaseAccount || p.isCoinbaseSmartWallet);
}

/** Answers that mean "this wallet cannot do it", never "the viewer said no". */
function unsupported(err: any): boolean {
  const code = err?.code;
  if (code === 4100 || code === 4200 || code === -32601 || code === -32602 || code === -32600) return true;
  const msg = String(err?.message ?? err ?? '').toLowerCase();
  return /not supported|unsupported|does not exist|not found|unknown method|not implemented|invalid method/.test(msg);
}

function pickAccount(result: unknown): { address: string; message: string; signature: string } | null {
  const accounts = (result as any)?.accounts;
  if (!Array.isArray(accounts) || accounts.length === 0) return null;
  const first = accounts[0] ?? {};
  const address = typeof first === 'string' ? first : first.address;
  const siwe = first?.capabilities?.signInWithEthereum;
  if (typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(address)) return null;
  if (!siwe || typeof siwe.message !== 'string' || typeof siwe.signature !== 'string') return null;
  return { address, message: siwe.message, signature: siwe.signature };
}

/**
 * Try the one-prompt sign-in. Returns the proof, or null when the wallet (or
 * the backend nonce) cannot do it, in which case the caller connects and
 * signs the usual way. Throws only when the viewer declined (4001), marked
 * as a wallet error.
 */
export async function connectAndSignIn(
  provider: Provider,
  apiUrl: string,
  deps: { fetch?: FetchLike; log?: (m: string, ...d: unknown[]) => void } = {},
): Promise<WalletBuiltProof | null> {
  const doFetch = deps.fetch ?? ((u: string, i?: any) => fetch(u, i));
  const log = deps.log ?? (() => {});

  let nonce: string;
  let chainId: number;
  try {
    const res = await doFetch(`${apiUrl}/v2/auth/wallet-nonce`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.wallet_built || !data.nonce || !data.chain_id) return null;
    nonce = String(data.nonce);
    chainId = Number(data.chain_id);
  } catch {
    return null;
  }

  let result: unknown;
  try {
    result = await provider.request({
      method: 'wallet_connect',
      params: [
        {
          version: '1',
          capabilities: {
            signInWithEthereum: {
              nonce,
              chainId: '0x' + chainId.toString(16),
              statement: 'Sign in to JubJub.',
            },
          },
        },
      ],
    });
  } catch (err) {
    if (classifyWalletError(err) === 'rejected') throw markWalletError(err);
    if (!unsupported(err)) log('[JubJub] wallet_connect failed; connecting the usual way', err);
    return null;
  }

  const picked = pickAccount(result);
  if (!picked) {
    // Connected but without a sign-in (a wallet that ignores the
    // capability): the usual sign step follows, still one step for the viewer.
    return null;
  }
  return { ...picked, nonce };
}
