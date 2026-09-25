/**
 * Typed funding errors from the streaming endpoints.
 *
 * The backend checks the viewer's USDC allowance and balance before it opens a
 * streaming session (POST /v2/streaming/sessions) and again on every gated-URL
 * refresh (POST /v2/streaming/sessions/{id}/playback-url):
 *
 *   402 {"detail": {"reason": "insufficient_allowance" | "insufficient_balance",
 *                   "message", "required_micro", "allowance_micro",
 *                   "balance_micro", "spender", "token", "chain_id"}}
 *   503 {"detail": {"reason": "funding_unverifiable", "message"}}
 *
 * Pure and DOM-free so it is unit-tested directly (test/fundingErrors.test.ts).
 * Parsing NEVER throws: a missing or garbled body yields null and the caller
 * keeps its ordinary "failed: <status>" error.
 */
/** USDC has 6 decimals: 500000 micro = $0.50. */
export declare const USDC_MICRO = 1000000;
/** The backend's minimum; used only when a 402 body omits required_micro. */
export declare const DEFAULT_REQUIRED_MICRO = 500000;
export type FundingRequiredReason = 'insufficient_allowance' | 'insufficient_balance';
/** "$0.50" from 500000 micro USDC. */
export declare function formatMicroUsdc(micro: number): string;
/**
 * The user-facing gate text for a funding error. Exported so a host that
 * renders its own UI (the Farcaster mini-app) can show exactly what the
 * built-in gate shows.
 */
export declare function fundingMessage(err: FundingRequiredError | FundingUnverifiableError): {
    title: string;
    sub: string;
    action: string;
};
/**
 * 402: the viewer cannot fund streaming. `spender` is the address the USDC
 * allowance must be granted to (the creator pool), NOT the payment router.
 * Amounts are micro-USDC; null when the backend did not send one.
 */
export declare class FundingRequiredError extends Error {
    readonly name = "FundingRequiredError";
    readonly status = 402;
    readonly retryable = false;
    readonly reason: FundingRequiredReason;
    readonly requiredMicro: number;
    readonly allowanceMicro: number | null;
    readonly balanceMicro: number | null;
    readonly spender: string | null;
    readonly token: string | null;
    readonly chainId: number | null;
    constructor(fields: {
        reason: FundingRequiredReason;
        message?: string;
        requiredMicro?: number | null;
        allowanceMicro?: number | null;
        balanceMicro?: number | null;
        spender?: string | null;
        token?: string | null;
        chainId?: number | null;
    });
}
/** 503 funding_unverifiable: the backend could not read the chain. Retry. */
export declare class FundingUnverifiableError extends Error {
    readonly name = "FundingUnverifiableError";
    readonly status = 503;
    readonly retryable = true;
    readonly reason: "funding_unverifiable";
    constructor(message?: string);
}
export declare function isFundingRequiredError(err: unknown): err is FundingRequiredError;
export declare function isFundingUnverifiableError(err: unknown): err is FundingUnverifiableError;
/**
 * Turn a failed response into a typed funding error, or null when it is not
 * one (any other status, or a body that does not carry a known reason).
 * Accepts the raw body text; never throws.
 */
export declare function parseFundingError(status: number, bodyText: string | null | undefined): FundingRequiredError | FundingUnverifiableError | null;
