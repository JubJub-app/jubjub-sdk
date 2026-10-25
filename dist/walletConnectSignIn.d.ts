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
type Provider = {
    request: (args: {
        method: string;
        params?: unknown[];
    }) => Promise<unknown>;
};
type FetchLike = (url: string, init?: any) => Promise<{
    ok: boolean;
    status: number;
    json(): Promise<any>;
}>;
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
export declare function mayConnectAndSignIn(provider: unknown): boolean;
/**
 * Try the one-prompt sign-in. Returns the proof, or null when the wallet (or
 * the backend nonce) cannot do it, in which case the caller connects and
 * signs the usual way. Throws only when the viewer declined (4001), marked
 * as a wallet error.
 */
export declare function connectAndSignIn(provider: Provider, apiUrl: string, deps?: {
    fetch?: FetchLike;
    log?: (m: string, ...d: unknown[]) => void;
}): Promise<WalletBuiltProof | null>;
export {};
