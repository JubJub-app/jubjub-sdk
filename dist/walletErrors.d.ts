/**
 * Wallet (EIP-1193) error classification and the honest gate text for each.
 *
 * Pure: no DOM, no viem, no module state, unit-tested with node:test
 * (test/walletErrors.test.ts).
 *
 * WHY (measured 2026-10-09 on bankrtv.app, desktop Chrome, MetaMask; the same
 * sequence was measured on mini.jubjubapp.com on 2026-09-25 and fixed there in
 * the mini-app's own sign-in flow, never in this SDK):
 *
 *   [JubJub] Step 2 done: wallet 0x68709311...        <- eth_requestAccounts answered
 *   [JubJub] Step 3: Creating viewer session...
 *   MetaMask - RPC Error: The requested account and/or method has not been
 *     authorized by the user.                          <- EIP-1193 4100 on personal_sign
 *   [JubJub] Gating playback (no free play): Payment service unavailable ...
 *
 * The wallet handed back an account this origin was not authorised to sign
 * with, the SDK signed with it anyway, and the refusal was reported as a
 * payment-service outage. "Payment service unavailable" is for a backend
 * failure only; a wallet refusal is the viewer's to fix and must say how.
 *
 * Codes (EIP-1193 and the MetaMask JSON-RPC extension):
 *   4001   user rejected        -> 'rejected'
 *   4100   unauthorised         -> 'unauthorised' (account or method not authorised for this origin)
 *   4200   unsupported method   -> 'unsupported'
 *   4900/4901 disconnected      -> 'disconnected'
 *   -32002 request pending      -> 'pending' (a prompt is already open in the wallet)
 */
export type WalletErrorKind = 'rejected' | 'unauthorised' | 'pending' | 'unsupported' | 'disconnected' | 'chain_mismatch' | 'no_account' | 'no_reply' | 'other';
/** Error code the SDK attaches when its own eth_accounts check fails. */
export declare const UNAUTHORISED_ACCOUNT_CODE = "JUBJUB_ACCOUNT_UNAUTHORISED";
/**
 * The numeric code of a wallet error, wherever the wallet put it. MetaMask
 * sets `code` on the error; some providers nest it under `data`, `error` or
 * `cause` (viem wraps the provider error and keeps the original as `cause`).
 */
export declare function walletErrorCode(err: unknown): number | string | undefined;
/** Map a wallet error to the case the gate explains. Never throws. */
export declare function classifyWalletError(err: unknown): WalletErrorKind;
/**
 * What the gate shows for a wallet error. `host` is the page's hostname
 * (window.location.host), named so the viewer knows which site to connect in
 * the wallet; `chainLabel` is the network the SDK was configured for.
 */
export declare function walletGateMessage(kind: WalletErrorKind, ctx?: {
    host?: string;
    chainLabel?: string;
    detail?: string;
}): {
    title: string;
    sub: string;
    action: string;
};
/** Case-insensitive membership of `address` in a wallet's account list. */
export declare function accountIsAuthorised(accounts: unknown, address: string): boolean;
/**
 * The error the connect path throws when eth_accounts does not list the
 * account eth_requestAccounts returned: the origin is not authorised for it.
 */
export declare function unauthorisedAccountError(address: string, host?: string): Error & {
    code: string;
    address: string;
};
export declare function markWalletError<T>(err: T): T;
export declare function isWalletError(err: unknown): boolean;
