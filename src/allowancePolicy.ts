/**
 * The pot model's allowance policy (Tom, 2026-10-24). Pure and DOM-free so it
 * is unit-tested directly (test/allowancePolicy.test.ts); core/Approval.ts
 * applies it on-chain.
 *
 * A viewer approves a standing USDC allowance ONCE. That approval is their
 * pot. Every session on every site draws from it, and the viewer is asked
 * again only when the pot runs below the backend's floor. The SDK, the
 * dashboard's /watch and /embed and the backend all use the same floor, so a
 * viewer with $0.50 or more approved is never asked on any surface.
 */

/** USDC has 6 decimals on every supported chain. */
export const USDC_DECIMALS = 6;

/**
 * The pre-flight threshold, in micro-USDC. Mirrors the backend's
 * FUNDING_FLOOR_MICRO (session_funding.py): the backend opens a session only
 * when allowance AND balance cover $0.50 plus anything owed, and answers 402
 * otherwise. The SDK approves before opening ONLY when the allowance is below
 * this figure. Above it, the backend decides; a 402 with `required_micro`
 * drives an exact approval (Approval.ensureSpenderApproved).
 */
export const PREFLIGHT_FLOOR_MICRO = 500_000n;

/**
 * Standing allowance approved when an approval is needed: whole dollars,
 * configurable with init({ streamingAllowanceUsd }). Finite by design, never
 * MAX_UINT256: an unlimited approval trips the wallets' "unlimited approval"
 * warning and kills conversion.
 */
export const DEFAULT_STREAMING_ALLOWANCE_USD = 10;

/** Hard ceiling so a mis-set config can never ask for an absurd allowance. */
export const MAX_STREAMING_ALLOWANCE_USD = 500;

export const MAX_STREAMING_ALLOWANCE_MICRO =
  BigInt(MAX_STREAMING_ALLOWANCE_USD) * 10n ** BigInt(USDC_DECIMALS);

/**
 * Pre-flight decision: must the SDK ask the wallet for an approval before it
 * opens a session? Only when the pot is below the floor. Never on a guess
 * above it: with $0.50 or more approved the backend would open the session,
 * so asking would be a prompt the pot did not need.
 */
export function needsPreflightApproval(allowanceMicro: bigint): boolean {
  return allowanceMicro < PREFLIGHT_FLOOR_MICRO;
}

/**
 * The amount to approve when an approval is needed, in micro-USDC. Defaulted
 * ($10), NaN-guarded, clamped to the ceiling, and never below the floor: an
 * approval below the floor would be refused by the backend at once and ask
 * the viewer again on the very next play.
 */
export function standingAllowanceMicro(standingAllowanceUsd: number | undefined): bigint {
  let usd = Number(standingAllowanceUsd);
  if (!Number.isFinite(usd) || usd <= 0) usd = DEFAULT_STREAMING_ALLOWANCE_USD;
  if (usd > MAX_STREAMING_ALLOWANCE_USD) usd = MAX_STREAMING_ALLOWANCE_USD;
  // Dollars to base units, ceil to a finite integer before BigInt().
  const micro = BigInt(Math.ceil(usd * 10 ** USDC_DECIMALS));
  return micro < PREFLIGHT_FLOOR_MICRO ? PREFLIGHT_FLOOR_MICRO : micro;
}
