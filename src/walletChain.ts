/**
 * Pure helpers for the browser-wallet connect path. No DOM, no viem, no
 * module state, so they can be unit-tested with node:test (see test/).
 */

/** Error code the SDK attaches to a wrong-network failure it raised itself. */
export const CHAIN_MISMATCH_CODE = 'JUBJUB_CHAIN_MISMATCH';

/**
 * True when a wallet's eth_chainId reply names `expected`. Wallets return a
 * hex string (0x2105, 0x14a34, mixed case) but some providers hand back a
 * number or a decimal string, so all three shapes are accepted.
 */
export function chainIdMatches(observed: unknown, expected: number): boolean {
  if (typeof observed === 'number') return Number.isInteger(observed) && observed === expected;
  if (typeof observed !== 'string') return false;
  const text = observed.trim();
  if (!text) return false;
  const parsed = /^0x[0-9a-f]+$/i.test(text)
    ? parseInt(text, 16)
    : /^[0-9]+$/.test(text)
      ? parseInt(text, 10)
      : NaN;
  return Number.isInteger(parsed) && parsed === expected;
}

/**
 * True when an error is the viewer declining a wallet prompt, rather than a
 * capability or network failure. EIP-1193 uses code 4001; wallets vary in
 * message wording, so match both.
 */
export function isUserRejection(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown; name?: unknown } | null;
  if (!e) return false;
  if (e.code === 4001 || e.code === 'ACTION_REJECTED') return true;
  const text = `${e.name ?? ''} ${e.message ?? ''}`;
  return /user rejected|user denied|rejected the request|declined/i.test(text);
}

/**
 * True when an error means the wallet is on a different network than the
 * one the SDK needs and the viewer has to switch it themselves. Covers the
 * SDK's own post-switch verification (CHAIN_MISMATCH_CODE) and Phantom, which
 * refuses wallet_switchEthereumChain with text like "The requested chain ID
 * does not match the currently active chain" or "... cannot be shown ..."
 * instead of a 4001/4902 code.
 */
export function isChainMismatchError(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown; name?: unknown } | null;
  if (!e) return false;
  if (e.code === CHAIN_MISMATCH_CODE) return true;
  const text = `${e.name ?? ''} ${e.message ?? ''}`;
  if (/chain\s*id/i.test(text) && /does not match|cannot be shown|mismatch/i.test(text)) {
    return true;
  }
  return /wrong network|switch (your wallet |the wallet )?to/i.test(text);
}

/**
 * The error the connect path throws when the wallet is verifiably on another
 * network after the switch attempt. `label` is the chain registry label of
 * the network the SDK was configured for (Base or Base Sepolia).
 */
export function chainMismatchError(label: string, cause?: unknown): Error & { code: string; cause?: unknown } {
  const err = new Error(
    `Your wallet is on another network. Switch it to ${label} to continue.`,
  ) as Error & { code: string; cause?: unknown };
  err.code = CHAIN_MISMATCH_CODE;
  if (cause !== undefined) err.cause = cause;
  return err;
}
