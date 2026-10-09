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

import { isChainMismatchError, isUserRejection } from './walletChain';

export type WalletErrorKind =
  | 'rejected'
  | 'unauthorised'
  | 'pending'
  | 'unsupported'
  | 'disconnected'
  | 'chain_mismatch'
  | 'no_account'
  | 'no_reply'
  | 'other';

/** Error code the SDK attaches when its own eth_accounts check fails. */
export const UNAUTHORISED_ACCOUNT_CODE = 'JUBJUB_ACCOUNT_UNAUTHORISED';

/**
 * The numeric code of a wallet error, wherever the wallet put it. MetaMask
 * sets `code` on the error; some providers nest it under `data`, `error` or
 * `cause` (viem wraps the provider error and keeps the original as `cause`).
 */
export function walletErrorCode(err: unknown): number | string | undefined {
  const e = err as any;
  if (!e || typeof e !== 'object') return undefined;
  const candidates = [e.code, e.data?.code, e.error?.code, e.cause?.code, e.cause?.cause?.code];
  for (const c of candidates) {
    if (typeof c === 'number') return c;
  }
  for (const c of candidates) {
    if (typeof c === 'string' && c) return c;
  }
  return undefined;
}

function textOf(err: unknown): string {
  const e = err as any;
  if (!e) return '';
  if (typeof e === 'string') return e;
  const parts = [e.name, e.message, e.shortMessage, e.details, e.cause?.message];
  return parts.filter((p) => typeof p === 'string').join(' ');
}

/** Map a wallet error to the case the gate explains. Never throws. */
export function classifyWalletError(err: unknown): WalletErrorKind {
  if (err == null) return 'other';
  const code = walletErrorCode(err);
  const text = textOf(err);

  if (code === UNAUTHORISED_ACCOUNT_CODE) return 'unauthorised';
  if (code === -32002 || /already pending|request .*pending/i.test(text)) return 'pending';
  if (code === 4001 || isUserRejection(err)) return 'rejected';
  if (code === 4100 || /not been authori[sz]ed|unauthori[sz]ed/i.test(text)) return 'unauthorised';
  if (code === 4200 || /unsupported method|method not supported|does not support/i.test(text)) {
    return 'unsupported';
  }
  if (code === 4900 || code === 4901 || /disconnected/i.test(text)) return 'disconnected';
  if (isChainMismatchError(err)) return 'chain_mismatch';
  if (/no accounts? (returned|available)/i.test(text)) return 'no_account';
  if (
    err instanceof TypeError ||
    /reading 'error'|Cannot read properties of undefined/i.test(text)
  ) {
    return 'no_reply';
  }
  return 'other';
}

/**
 * What the gate shows for a wallet error. `host` is the page's hostname
 * (window.location.host), named so the viewer knows which site to connect in
 * the wallet; `chainLabel` is the network the SDK was configured for.
 */
export function walletGateMessage(
  kind: WalletErrorKind,
  ctx: { host?: string; chainLabel?: string; detail?: string } = {},
): { title: string; sub: string; action: string } {
  const site = ctx.host ? `this site (${ctx.host})` : 'this site';
  switch (kind) {
    case 'rejected':
      return {
        title: 'You cancelled the request',
        sub: 'Approve the request in your wallet to start watching. Signing is free and costs no gas.',
        action: 'Try again',
      };
    case 'unauthorised':
      return {
        title: 'Connect your wallet to this site',
        sub:
          `Your wallet has not authorised ${site} for that account. ` +
          'Open the wallet, connect this site with the account you want to pay from, then retry.',
        action: 'Connect wallet',
      };
    case 'pending':
      return {
        title: 'Wallet request waiting',
        sub: 'Your wallet already has a request open. Open the wallet extension and answer it, then retry.',
        action: 'Try again',
      };
    case 'unsupported':
      return {
        title: 'This wallet cannot sign messages',
        sub: 'JubJub needs a signature to confirm the wallet is yours. Use a wallet that supports personal_sign.',
        action: 'Try again',
      };
    case 'disconnected':
      return {
        title: 'Wallet disconnected',
        sub: 'Your wallet disconnected from the page. Unlock it, reconnect, then retry.',
        action: 'Reconnect wallet',
      };
    case 'chain_mismatch':
      return {
        title: `Switch your wallet to ${ctx.chainLabel ?? 'Base'}`,
        sub: `Your wallet is on another network. Switch it to ${ctx.chainLabel ?? 'Base'} and retry.`,
        action: 'Try again',
      };
    case 'no_account':
      return {
        title: 'No account in your wallet',
        sub: 'Your wallet returned no account. Unlock it, pick an account, then retry.',
        action: 'Try again',
      };
    case 'no_reply':
      return {
        title: 'Your wallet did not answer',
        sub: 'Check that the wallet extension is unlocked and that only one wallet is handling this site, then retry.',
        action: 'Try again',
      };
    default:
      return {
        title: 'Your wallet returned an error',
        sub: ctx.detail
          ? `${ctx.detail.slice(0, 160)} Check the wallet and retry.`
          : 'Check the wallet and retry.',
        action: 'Try again',
      };
  }
}

/** Case-insensitive membership of `address` in a wallet's account list. */
export function accountIsAuthorised(accounts: unknown, address: string): boolean {
  if (!Array.isArray(accounts)) return false;
  const want = String(address || '').toLowerCase();
  if (!want) return false;
  return accounts.some((a) => typeof a === 'string' && a.toLowerCase() === want);
}

/**
 * The error the connect path throws when eth_accounts does not list the
 * account eth_requestAccounts returned: the origin is not authorised for it.
 */
export function unauthorisedAccountError(
  address: string,
  host?: string,
): Error & { code: string; address: string } {
  const err = new Error(
    `Wallet account ${address.slice(0, 10)}... is not authorised for ${host || 'this origin'} ` +
      '(eth_accounts does not list it). Connect this site in the wallet first.',
  ) as Error & { code: string; address: string };
  err.code = UNAUTHORISED_ACCOUNT_CODE;
  err.address = address;
  return err;
}

/**
 * Mark an error as having come from the wallet (the signer, the provider),
 * so a caller that also talks to the backend in the same step can tell the
 * two apart without guessing from message text. A `fetch` failure is a
 * TypeError too, so classification by shape alone would misreport a backend
 * outage as the wallet not answering.
 */
const WALLET_ERROR_MARK = '__jubjubWalletError';

export function markWalletError<T>(err: T): T {
  if (err && typeof err === 'object') {
    try {
      Object.defineProperty(err, WALLET_ERROR_MARK, { value: true, enumerable: false });
    } catch {
      // frozen error object: fall through, classification still works by code
    }
  }
  return err;
}

export function isWalletError(err: unknown): boolean {
  return !!err && typeof err === 'object' && (err as any)[WALLET_ERROR_MARK] === true;
}
