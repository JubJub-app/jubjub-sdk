import type { Wallet } from './Wallet';
export { DEFAULT_STREAMING_ALLOWANCE_USD, MAX_STREAMING_ALLOWANCE_USD, PREFLIGHT_FLOOR_MICRO, } from '../allowancePolicy';
export declare class Approval {
    private wallet;
    private usdc;
    private spender;
    private chain;
    private standingAllowance;
    private publicClient;
    constructor(wallet: Wallet, chainConfig: {
        usdc_address: string;
        payment_router: string;
        chain_id: number;
        /**
         * Accepted for compatibility with callers that pass playback-info
         * through. Since 2.2.0 the price plays no part in the approval
         * decision: the threshold is the backend's floor, whatever the price.
         */
        price_per_minute_usdc?: number;
        standing_allowance_usd?: number;
    });
    /** The current allowance(viewer, spender) in micro-USDC. */
    currentAllowance(): Promise<bigint>;
    /**
     * Pre-flight: does the pot cover the backend's floor? True when
     * allowance(viewer, spender) >= PREFLIGHT_FLOOR_MICRO, whatever the price
     * and however much of the standing amount has been drawn. Only below the
     * floor does ensureApproved() top the pot back up to the standing amount.
     */
    isApproved(): Promise<boolean>;
    approve(): Promise<void>;
    /**
     * Make sure `spender` may pull at least `requiredMicro` USDC from the viewer.
     * Used when the backend answers a session create or URL refresh with 402
     * insufficient_allowance: the spender comes from THAT response (the
     * streaming spender the backend actually draws against, the same address
     * playback-info serves as `payment_router`), never a hard-coded address.
     * This is the authority for exact figures; the pre-flight only mirrors the
     * floor.
     *
     * Same bounded standing amount as approve(): the larger of the standing
     * allowance and `requiredMicro`, and never above the ceiling. Returns true
     * when an approve transaction was sent, false when the allowance already
     * covered it.
     *
     * `exact`: approve `requiredMicro` itself, not the standing amount. Used
     * for an unpaid tab (402 tab_unpaid), where the viewer is shown one figure
     * (the tab plus the floor) and the wallet must ask for that figure.
     */
    ensureSpenderApproved(spender: string, requiredMicro: number, exact?: boolean): Promise<boolean>;
    ensureApproved(): Promise<boolean>;
}
