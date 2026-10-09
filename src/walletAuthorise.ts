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

import {
  STALE_CONNECTION_CODE,
  accountIsAuthorised,
  classifyWalletError,
  markWalletError,
  unauthorisedAccountError,
} from './walletErrors';

export { STALE_CONNECTION_CODE };

type Provider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

export interface AuthoriseLog {
  (message: string, ...detail: unknown[]): void;
}

const noop: AuthoriseLog = () => {};

export function staleConnectionError(
  requested: string | null,
  host?: string,
): Error & { code: string; address: string | null } {
  const site = host || 'this site';
  const err = new Error(
    `The wallet answers eth_requestAccounts with ${requested ? requested.slice(0, 10) + '...' : 'an account'} ` +
      `but lists no account for ${site} even after a fresh permission request. ` +
      `Open the wallet, disconnect ${site}, reload the page and connect again.`,
  ) as Error & { code: string; address: string | null };
  err.code = STALE_CONNECTION_CODE;
  err.address = requested;
  return err;
}

/** eth_accounts, or null when the provider cannot answer it. */
export async function accountsOf(provider: Provider): Promise<string[] | null> {
  try {
    const accs = await provider.request({ method: 'eth_accounts' });
    return Array.isArray(accs) ? (accs as string[]) : null;
  } catch {
    return null;
  }
}

/**
 * Ask the wallet for a fresh eth_accounts permission (its connect dialog).
 * A wallet that does not implement the method is not an error: the caller
 * re-reads eth_accounts either way. A refusal (declined, pending) is thrown
 * as a wallet error.
 */
export async function requestFreshPermission(provider: Provider, log: AuthoriseLog = noop): Promise<void> {
  try {
    log('[JubJub] Asking the wallet for a fresh eth_accounts permission (wallet_requestPermissions)');
    await provider.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
  } catch (e) {
    if (classifyWalletError(e) === 'unsupported') {
      log('[JubJub] wallet_requestPermissions is not supported by this wallet; re-reading eth_accounts');
      return;
    }
    throw markWalletError(e);
  }
}

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
export async function requestAuthorisedAccount(
  provider: Provider,
  host: string,
  log: AuthoriseLog = noop,
): Promise<string> {
  let accounts: unknown;
  try {
    accounts = await provider.request({ method: 'eth_requestAccounts' });
  } catch (e) {
    throw markWalletError(e);
  }
  const requested = Array.isArray(accounts) && typeof accounts[0] === 'string' ? (accounts[0] as string) : null;
  if (!requested) throw markWalletError(new Error('No accounts returned from wallet.'));

  const listed = await accountsOf(provider);
  if (listed === null || accountIsAuthorised(listed, requested)) return requested;

  log(
    `[JubJub] eth_requestAccounts returned ${requested.slice(0, 10)}... but eth_accounts lists`,
    listed,
    `for ${host || 'this origin'}; asking for a fresh permission`,
  );
  await requestFreshPermission(provider, log);

  const relisted = await accountsOf(provider);
  if (relisted === null || accountIsAuthorised(relisted, requested)) return requested;
  const chosen = relisted.find((a) => typeof a === 'string' && a);
  if (chosen) {
    log(`[JubJub] The wallet authorised ${chosen.slice(0, 10)}... for ${host || 'this origin'}; using it`);
    return chosen;
  }
  throw markWalletError(staleConnectionError(requested, host));
}

/**
 * Before a signature: is `address` still authorised for this origin on the
 * provider that connected it? Not listed: one fresh permission prompt, then
 * re-check. Returns the address to sign with (the wallet's choice if it
 * changed), or throws a wallet error.
 */
export async function reconfirmAuthorisedAccount(
  provider: Provider,
  address: string,
  host: string,
  log: AuthoriseLog = noop,
): Promise<string> {
  const listed = await accountsOf(provider);
  if (listed === null || accountIsAuthorised(listed, address)) return address;
  log(
    `[JubJub] Before signing: wallet lists`,
    listed,
    `for ${host || 'this origin'} but the connected account is ${address.slice(0, 10)}...; asking for a fresh permission`,
  );
  await requestFreshPermission(provider, log);
  const relisted = await accountsOf(provider);
  if (relisted === null || accountIsAuthorised(relisted, address)) return address;
  const chosen = relisted.find((a) => typeof a === 'string' && a);
  if (chosen) return chosen;
  if (relisted.length === 0) throw markWalletError(staleConnectionError(address, host));
  throw markWalletError(unauthorisedAccountError(address, host));
}
