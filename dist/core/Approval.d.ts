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
     */
    private static _boundedStandingAllowance;
    isApproved(): Promise<boolean>;
    approve(): Promise<void>;
    ensureApproved(): Promise<boolean>;
}
