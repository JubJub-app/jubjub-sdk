import type { Wallet } from './Wallet';
export declare class Approval {
    private wallet;
    private usdc;
    private router;
    private chain;
    private approvalAmount;
    private publicClient;
    constructor(wallet: Wallet, chainConfig: {
        usdc_address: string;
        payment_router: string;
        chain_id: number;
        price_per_minute_usdc: number;
    });
    /**
     * Bounded USDC approval amount: enough for one full-length session, never
     * unlimited. The calculation is TOTAL (price-per-minute × max minutes).
     * It is NaN-guarded so BigInt() only ever receives a finite integer — a
     * missing / non-numeric / zero price returns the floor BEFORE any
     * BigInt() or exponent math runs, and Math.ceil guarantees an integer.
     */
    private static _boundedApprovalAmount;
    isApproved(): Promise<boolean>;
    approve(): Promise<void>;
    ensureApproved(): Promise<boolean>;
}
