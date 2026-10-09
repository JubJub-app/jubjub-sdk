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
/**
 * Start listening for EIP-6963 announcements and ask wallets to announce.
 * Idempotent. Wallets answer synchronously or within a tick, so calling this
 * at init() leaves the list ready by the time a viewer presses play.
 */
export declare function startProviderDiscovery(win: WindowLike | undefined): void;
/** Wallets announced so far (EIP-6963), in announcement order. */
export declare function announcedProviders(): ProviderCandidate[];
/** Test seam. */
export declare function resetProviderDiscovery(): void;
/**
 * Every provider the page exposes: EIP-6963 announcements, the legacy
 * `window.ethereum.providers` array (Coinbase Wallet and others), and
 * `window.ethereum` itself. De-duplicated by object identity.
 */
export declare function candidateProviders(win: WindowLike | undefined): ProviderCandidate[];
/** A short, log-safe description of a provider: its rdns or its flag set. */
export declare function describeProvider(c: ProviderCandidate | null | undefined): string;
/**
 * Pick the provider for this page. Pure given its inputs; `authorised`
 * answers whether a candidate already lists an authorised account for this
 * origin (the caller probes eth_accounts; a probe that throws is `false`).
 * Returns the chosen candidate and the reason, for the log line.
 */
export declare function selectProvider(candidates: ProviderCandidate[], opts?: {
    injected?: any;
    preferRdns?: string | null;
    authorised?: (c: ProviderCandidate) => Promise<boolean>;
    /** `window.ethereum` itself, so the fallback is the same object as before even when it was announced too. */
    legacy?: any;
}): Promise<{
    chosen: ProviderCandidate | null;
    reason: string;
}>;
export {};
