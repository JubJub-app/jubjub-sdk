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
/**
 * POST /v2/streaming/sessions/{id}/playback-url answers 409 for a session the
 * backend ended because it reached its per-session cap:
 *
 *   409 {"detail": {"reason": "session_capped", "code": "session_capped",
 *                   "message": "This session reached its per-session limit.
 *                               Start a new one to keep watching."}}
 *
 * It is not a refusal of the viewer or the content: the pot still covers
 * viewing, this session has simply done its $2.00. The SDK answers it the way
 * it answers a segment response with end_reason "cap_reached" (Tier 2 of the
 * same rule): mark the session closed, open a new one quietly, keep playing,
 * and prompt only if the open answers 402.
 */
export declare class SessionCappedError extends Error {
    readonly name = "SessionCappedError";
    readonly status = 409;
    readonly reason: "session_capped";
    readonly detail: string;
    constructor(detail?: string);
}
export declare function isSessionCappedError(err: unknown): err is SessionCappedError;
/**
 * Turn a failed playback-url response into a SessionCappedError, or null when
 * it is not one (any other status, or a 409 whose detail does not carry the
 * session_capped reason or code). Never throws.
 */
export declare function parseSessionCapped(status: number, bodyText: string | null | undefined): SessionCappedError | null;
/**
 * POST /v2/streaming/sessions with card_token_id answers 409
 * {"detail": {"reason": "card_not_accepted"}} when this piece's catalogue
 * does not take card payments (2.4.0, card-rail-api.md). Not a gate: in
 * payerMode 'auto' the SDK falls back silently to the approve flow.
 */
export declare class CardNotAcceptedError extends Error {
    readonly name = "CardNotAcceptedError";
    readonly status = 409;
    readonly reason: "card_not_accepted";
    constructor(message?: string);
}
export declare function isCardNotAcceptedError(err: unknown): err is CardNotAcceptedError;
/** A CardNotAcceptedError from a failed response, or null. Never throws. */
export declare function parseCardNotAccepted(status: number, bodyText: string | null | undefined): CardNotAcceptedError | null;
