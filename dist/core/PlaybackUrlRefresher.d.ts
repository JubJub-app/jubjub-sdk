import type { ApiClient } from '../api/ApiClient';
export interface RefresherCallbacks {
    /** Called after a successful re-resolve + source swap. */
    onRefreshed?: (url: string) => void;
    /**
     * Called when a fresh URL could NOT be resolved — session no longer active
     * (403/404), or a network failure. The refresher has ALREADY paused the
     * <video> before invoking this; the SDK gates here. There is no
     * unsigned/durable fallback anywhere in this class — fail closed.
     */
    onFailure: (err: unknown) => void;
}
type RefreshReason = 'ttl' | 'error' | 'manual';
/**
 * Tier-2 only. Keeps a gated <video> playing across short-lived signed-URL
 * expiry by re-resolving a fresh session-scoped URL from the backend BEFORE
 * the current one expires, and by reacting to an expiry-driven media error.
 *
 * FAIL CLOSED: it never holds or reverts to a durable URL. The only URLs it
 * ever puts on the element come straight from getSessionPlaybackUrl(), which
 * the backend refuses unless the paid session is still active. If re-resolve
 * fails, it pauses the element and calls onFailure so the SDK can gate.
 *
 * Progressive mp4 vs HLS — IMPORTANT:
 *   - Progressive mp4 (the GCS signer path): the browser re-issues HTTP range
 *     requests against whatever URL `video.src` holds, so swapping in a fresh
 *     signed URL (and restoring currentTime) sustains playback. The swap costs
 *     a brief re-buffer at the swap point; refreshing ahead of expiry keeps it
 *     off the critical path. Fully seamless mp4 would need a signed cookie (so
 *     the SAME url keeps working) or MSE — out of scope here.
 *   - HLS master (.m3u8): signing the master URL does NOT sign the per-segment
 *     URLs, and swapping the master mid-stream is not seamless on most players.
 *     A short master TTL therefore does NOT protect or sustain segment fetches.
 *     The correct mechanism is signed segment URLs or a signed cookie at the
 *     CDN. We log that here rather than pretend the master swap covers it. (The
 *     backend's only live gated signer is GCS/mp4; the Mux/HLS signer refuses
 *     until the segment-signing mechanism exists, so HLS can't currently be
 *     issued as a gated URL at all.)
 */
export declare class PlaybackUrlRefresher {
    private video;
    private api;
    private sessionId;
    private cb;
    private timer;
    private errorHandler;
    private endedHandler;
    private playHandler;
    private stopped;
    /**
     * Set while the content has played to its end. SUSPENDED IS NOT STOPPED:
     * `stopped` is terminal teardown, this is a pause in the refresh loop that
     * `play` lifts. Keeping them separate is what allows a replay to work.
     */
    private suspended;
    private refreshing;
    private isHls;
    constructor(video: HTMLVideoElement, api: ApiClient, sessionId: string, cb: RefresherCallbacks);
    /**
     * Begin managing expiry for the URL already set on the element.
     * @param signedUrl the URL currently on video.src (to classify mp4 vs HLS)
     * @param expiresInSeconds TTL the backend stamped on that URL
     */
    start(signedUrl: string, expiresInSeconds: number): void;
    /**
     * Re-resolve a fresh signed URL now and swap it onto the element.
     * Returns true on success, false if it failed (and gated via onFailure).
     * Safe to call from the proactive timer, the error handler, or a user retry.
     */
    refreshNow(_reason?: RefreshReason): Promise<boolean>;
    /** Tear down timers + listeners (called on session end / disconnect). */
    stop(): void;
    private _schedule;
    /**
     * Content finished. Cancel the pending refresh and stop scheduling new ones.
     *
     * NOT `stop()`: teardown would drop the listeners and make replay unfixable.
     * The session itself is deliberately left open — closing it here would move
     * settlement, and settlement is already correct. A viewer who finished may
     * still replay within the backend's idle window; if they don't, the idle cron
     * closes and settles exactly as it does today.
     */
    private _onEnded;
    /** Playback resumed after the end — lift the suspension and re-resolve. */
    private _onPlay;
    private _onMediaError;
    /**
     * Swap a fresh URL onto the element, preserving position + play state. For
     * progressive mp4 this sustains playback (browser re-requests ranges against
     * the new URL); restoring currentTime keeps the swap as close to seamless as
     * the media element allows.
     */
    private _swapSource;
    /** Strip the query string so signed-URL params don't fool extension checks. */
    private _pathOf;
}
export {};
