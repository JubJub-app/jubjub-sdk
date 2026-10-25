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

export class ContentNotPlayableError extends Error {
  readonly name = 'ContentNotPlayableError';
  readonly status = 409;
  readonly retryable = true;
  readonly reason: ContentNotPlayableReason;
  readonly detail: string;

  constructor(reason: ContentNotPlayableReason, detail: string) {
    super(detail || reason);
    Object.setPrototypeOf(this, ContentNotPlayableError.prototype);
    this.reason = reason;
    this.detail = detail;
  }
}

export function isContentNotPlayableError(err: unknown): err is ContentNotPlayableError {
  return err instanceof ContentNotPlayableError;
}

/**
 * Turn a failed session-create response into a ContentNotPlayableError, or
 * null when it is not one (any other status, or a 409 body that does not
 * carry the backend's wording).
 */
export function parseContentNotPlayable(
  status: number,
  bodyText: string | null | undefined,
): ContentNotPlayableError | null {
  // 409 is the documented shape (since 2026-10-09 with a machine-readable
  // {reason, content_id, message, ...} body). 400 is the shape the backend
  // used before for "no ownership contract deployed", kept so a 2.1.5 page
  // against an older backend still says the right thing.
  if (status !== 409 && status !== 400) return null;
  let detail = '';
  let reason: string | null = null;
  try {
    const body = bodyText ? JSON.parse(bodyText) : null;
    const d = body && typeof body === 'object' ? (body as any).detail : null;
    if (typeof d === 'string') detail = d;
    else if (d && typeof d === 'object') {
      if (typeof d.reason === 'string') reason = d.reason;
      if (typeof d.message === 'string') detail = d.message;
      else if (typeof d.detail === 'string') detail = d.detail;
    }
  } catch {
    detail = typeof bodyText === 'string' ? bodyText : '';
  }
  // The documented code first: the piece exists, its contract does not yet.
  if (reason === 'ownership_pending') {
    return new ContentNotPlayableError('not_minted', detail || 'This piece has no ownership contract yet.');
  }
  if (status === 400 && !/no ownership contract/i.test(detail)) return null;
  if (reason === 'content_not_sellable' && /holds no file|nothing to stream here|lives on/i.test(detail)) {
    return new ContentNotPlayableError('hosted_elsewhere', detail);
  }
  if (
    reason === 'content_not_sellable' ||
    /cannot be streamed for payment|published on-chain|live contract|no ownership contract/i.test(detail)
  ) {
    return new ContentNotPlayableError('not_minted', detail);
  }
  if (/holds no file|nothing to stream here|lives on/i.test(detail)) {
    return new ContentNotPlayableError('hosted_elsewhere', detail);
  }
  if (detail) return new ContentNotPlayableError('unknown', detail);
  return null;
}

/** The gate text for a content refusal. */
export function contentNotPlayableMessage(
  err: ContentNotPlayableError,
): { title: string; sub: string; action: string } {
  if (err.reason === 'hosted_elsewhere') {
    return {
      title: 'This video is watched on its own platform',
      sub: 'JubJub holds no file for it, so there is nothing to stream for payment here.',
      action: 'Try again',
    };
  }
  if (err.reason === 'not_minted') {
    return {
      title: "This video isn't ready for paid streaming yet",
      sub:
        'Its ownership record on Base is still being set up, so payments have nowhere to go. ' +
        'Check back shortly.',
      action: 'Try again',
    };
  }
  return {
    title: 'This video cannot be streamed for payment right now',
    sub: err.detail ? err.detail.slice(0, 200) : 'Check back shortly.',
    action: 'Try again',
  };
}

// --- The per-session cap on a gated URL refresh (2.2.0) -----------------------

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
export class SessionCappedError extends Error {
  readonly name = 'SessionCappedError';
  readonly status = 409;
  readonly reason = 'session_capped' as const;
  readonly detail: string;

  constructor(detail?: string) {
    super(detail || 'session_capped');
    Object.setPrototypeOf(this, SessionCappedError.prototype);
    this.detail = detail || '';
  }
}

export function isSessionCappedError(err: unknown): err is SessionCappedError {
  return err instanceof SessionCappedError;
}

/**
 * Turn a failed playback-url response into a SessionCappedError, or null when
 * it is not one (any other status, or a 409 whose detail does not carry the
 * session_capped reason or code). Never throws.
 */
export function parseSessionCapped(
  status: number,
  bodyText: string | null | undefined,
): SessionCappedError | null {
  if (status !== 409) return null;
  try {
    const body = bodyText ? JSON.parse(bodyText) : null;
    const d = body && typeof body === 'object' ? (body as any).detail : null;
    if (!d || typeof d !== 'object') return null;
    if (d.reason !== 'session_capped' && d.code !== 'session_capped') return null;
    return new SessionCappedError(typeof d.message === 'string' ? d.message : undefined);
  } catch {
    return null;
  }
}

/**
 * POST /v2/streaming/sessions with card_token_id answers 409
 * {"detail": {"reason": "card_not_accepted"}} when this piece's catalogue
 * does not take card payments (2.4.0, card-rail-api.md). Not a gate: in
 * payerMode 'auto' the SDK falls back silently to the approve flow.
 */
export class CardNotAcceptedError extends Error {
  readonly name = 'CardNotAcceptedError';
  readonly status = 409;
  readonly reason = 'card_not_accepted' as const;

  constructor(message?: string) {
    super(message || 'card_not_accepted');
    Object.setPrototypeOf(this, CardNotAcceptedError.prototype);
  }
}

export function isCardNotAcceptedError(err: unknown): err is CardNotAcceptedError {
  return err instanceof CardNotAcceptedError;
}

/** A CardNotAcceptedError from a failed response, or null. Never throws. */
export function parseCardNotAccepted(
  status: number,
  bodyText: string | null | undefined,
): CardNotAcceptedError | null {
  if (status !== 409) return null;
  try {
    const body = bodyText ? JSON.parse(bodyText) : null;
    const d = body && typeof body === 'object' ? (body as any).detail : null;
    if (!d || typeof d !== 'object') return null;
    if (d.reason !== 'card_not_accepted' && d.code !== 'card_not_accepted') return null;
    return new CardNotAcceptedError(typeof d.message === 'string' ? d.message : undefined);
  } catch {
    return null;
  }
}
