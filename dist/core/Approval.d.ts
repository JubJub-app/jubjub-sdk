import type { Wallet } from './Wallet';
export declare class Approval {
    private wallet;
    private usdc;
    private router;
    private chain;
    private standingAllowance;
    private sessionBound;
    private publicClient;
    constructor(wallet: Wallet, chainConfig: {
        usdc_address: string;
        payment_router: string;
        chain_id: number;
        price_per_minute_usdc: number;
        standing_allowance_usd?: number;
    });
    /**
     * Per-SESSION bound: the most a single session can draw (price-per-minute ×
     * max minutes), floored at $2 to cover the backend's per-session cap. This
     * is the reuse THRESHOLD used by isApproved() — not the approve amount.
     *
     * NaN-guarded so BigInt() only ever receives a finite integer — a missing /
     * non-numeric / zero price returns the floor BEFORE any BigInt() or exponent
     * math runs, and Math.ceil guarantees an integer. (Unchanged from the prior
     * per-session calculation; only its ROLE changed — threshold, not amount.)
     */
    private static _boundedSessionAmount;
    /**
     * Standing allowance to APPROVE when an approve is needed. Bounded + finite:
     * defaulted ($10), NaN-guarded, and clamped to [sessionBound, ceiling]. It
     * is NEVER MAX_UINT256 — that would trip the unlimited-approval scam warning.
     *
     * Floored at sessionBound because a standing allowance below one session's
     * bound would re-approve forever (isApproved() gates on sessionBound).
     *
     * THE CEILING IS CHECKED LAST, ON THE OUTPUT.
     * It used to be applied to the INPUT `usd` and then overridden by a FLOOR
     * against `sessionBound`, which has no upper bound of its own
     * (`ceil(price × 120 × 1e6)`). So whenever sessionBound exceeded the ceiling
     * the floor won and the clamp was bypassed entirely: above $4.1667/min the
     * prompt asked for `price × 120` USD, unbounded — exactly the "absurd
     * allowance" the comment above says can never happen. Checking the returned
     * value means no future reordering of the two bounds can reopen it.
     *
     * REFUSING, NOT CLAMPING, when sessionBound is over the ceiling. See the
     * thrown error for why.
     */
    private static _boundedStandingAllowance;
    isApproved(): Promise<boolean>;
    approve(): Promise<void>;
    ensureApproved(): Promise<boolean>;
}
