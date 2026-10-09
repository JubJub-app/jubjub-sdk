/**
 * Getting an account this origin is actually authorised to sign with.
 *
 * MEASURED 2026-10-09 on bankrtv.app (one wallet, MetaMask, EIP-6963
 * "only-candidate", 2.1.3): `eth_requestAccounts` answered 0x6870... at once
 * with no popup, `eth_accounts` for the same origin answered [] and MetaMask
 * itself logged "'eth_accounts' unexpectedly updated accounts. Please report
 * this bug. []". The wallet holds a stale connection record for the site:
 * the request path serves the cached account, the permission path has no
 * account. 2.1.3 refused (correctly) and asked the viewer to connect the
 * site, but retrying re-ran `eth_requestAccounts`, which served the same
 * cached answer, so the connect popup never came and the gate looped.
 *
 * The way out is a FRESH PERMISSION PROMPT, which is a different RPC method:
 * `wallet_requestPermissions([{ eth_accounts: {} }])` (EIP-2255) always shows
 * the wallet's connect dialog and rewrites the site's permission. After it,
 * `eth_accounts` is read again and is the only source of truth. If it is
 * still empty the wallet's record is wedged beyond what a page can repair,
 * and the viewer is told exactly what to do: open the wallet, disconnect this
 * site, reload.
 *
 * Pure given a provider: no DOM, no viem, no module state, so the loop is
 * unit-tested with a fake provider (test/walletAuthorise.test.ts).
 */
import { STALE_CONNECTION_CODE } from './walletErrors';
export { STALE_CONNECTION_CODE };
type Provider = {
    request: (args: {
        method: string;
        params?: unknown[];
    }) => Promise<unknown>;
};
export interface AuthoriseLog {
    (message: string, ...detail: unknown[]): void;
}
export declare function staleConnectionError(requested: string | null, host?: string): Error & {
    code: string;
    address: string | null;
};
/** eth_accounts, or null when the provider cannot answer it. */
export declare function accountsOf(provider: Provider): Promise<string[] | null>;
/**
 * Ask the wallet for a fresh eth_accounts permission (its connect dialog).
 * A wallet that does not implement the method is not an error: the caller
 * re-reads eth_accounts either way. A refusal (declined, pending) is thrown
 * as a wallet error.
 */
export declare function requestFreshPermission(provider: Provider, log?: AuthoriseLog): Promise<void>;
/**
 * The account to use for this origin, confirmed authorised.
 *
 *   1. eth_requestAccounts: the wallet's answer, possibly a cached one.
 *   2. eth_accounts: the check. Listed: done.
 *   3. Not listed: wallet_requestPermissions, then eth_accounts again. The
 *      account the wallet now lists wins, even if it differs from step 1
 *      (the viewer may have picked another account in the dialog).
 *   4. Still nothing listed: STALE_CONNECTION_CODE.
 *
 * A provider that cannot answer eth_accounts at all is given the benefit of
 * the doubt (the signature will decide), as before.
 */
export declare function requestAuthorisedAccount(provider: Provider, host: string, log?: AuthoriseLog): Promise<string>;
/**
 * Before a signature: is `address` still authorised for this origin on the
 * provider that connected it? Not listed: one fresh permission prompt, then
 * re-check. Returns the address to sign with (the wallet's choice if it
 * changed), or throws a wallet error.
 */
export declare function reconfirmAuthorisedAccount(provider: Provider, address: string, host: string, log?: AuthoriseLog): Promise<string>;
