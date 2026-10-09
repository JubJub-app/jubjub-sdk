/**
 * Typed refusals from POST /v2/streaming/sessions that are about the CONTENT,
 * not the viewer's funds (those are in fundingErrors.ts) and not the wallet
 * (walletErrors.ts).
 *
 *   409 {"detail": "Content cnt_... cannot be streamed for payment
 *                   (contract=none, ownership_status=pending,
 *                   publish_confirmed=True). JubJub only meters media that
 *                   has been published on-chain against a live contract ..."}
 *
 * The backend raises ContentNotSellableError (streaming_session_manager.py)
 * before any chain call when the piece has no live ownership contract yet, or
 * lives on another platform with no file at JubJub. The SDK used to report
 * both as "Payment service unavailable"; the service was fine, the piece was
 * not ready. Pure and DOM-free; parsing never throws.
 */
export type ContentNotPlayableReason = 'not_minted' | 'hosted_elsewhere' | 'unknown';
export declare class ContentNotPlayableError extends Error {
    readonly name = "ContentNotPlayableError";
    readonly status = 409;
    readonly retryable = true;
    readonly reason: ContentNotPlayableReason;
    readonly detail: string;
    constructor(reason: ContentNotPlayableReason, detail: string);
}
export declare function isContentNotPlayableError(err: unknown): err is ContentNotPlayableError;
/**
 * Turn a failed session-create response into a ContentNotPlayableError, or
 * null when it is not one (any other status, or a 409 body that does not
 * carry the backend's wording).
 */
export declare function parseContentNotPlayable(status: number, bodyText: string | null | undefined): ContentNotPlayableError | null;
/** The gate text for a content refusal. */
export declare function contentNotPlayableMessage(err: ContentNotPlayableError): {
    title: string;
    sub: string;
    action: string;
};
