import type { ApiClient } from '../api/ApiClient';

/**
 * Fraction of the TTL at which we proactively re-resolve. 0.8 means a 120s URL
 * refreshes at ~96s — comfortably before expiry, so a fresh signed URL is in
 * place before the current one 403s mid-stream. Refreshing ahead of expiry
 * (rather than after a failed media request) is what keeps the swap quiet.
 */
const REFRESH_AT_TTL_FRACTION = 0.8;

/** Never schedule a refresh tighter than this (guards against tiny TTLs). */
const MIN_REFRESH_SECONDS = 5;

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
export class PlaybackUrlRefresher {
  private video: HTMLVideoElement;
  private api: ApiClient;
  private sessionId: string;
  private cb: RefresherCallbacks;

  private timer: ReturnType<typeof setTimeout> | null = null;
  private errorHandler: (() => void) | null = null;
  private stopped = false;
  private refreshing = false;
  private isHls = false;

  constructor(
    video: HTMLVideoElement,
    api: ApiClient,
    sessionId: string,
    cb: RefresherCallbacks,
  ) {
    this.video = video;
    this.api = api;
    this.sessionId = sessionId;
    this.cb = cb;
  }

  /**
   * Begin managing expiry for the URL already set on the element.
   * @param signedUrl the URL currently on video.src (to classify mp4 vs HLS)
   * @param expiresInSeconds TTL the backend stamped on that URL
   */
  start(signedUrl: string, expiresInSeconds: number): void {
    this.isHls = /\.m3u8$/i.test(this._pathOf(signedUrl));
    if (this.isHls) {
      console.warn(
        '[JubJub] Gated HLS (.m3u8) detected. Re-resolving the master URL ' +
          'does NOT sign segment URLs and is not seamless mid-stream — HLS ' +
          'needs signed segment URLs or a signed cookie at the CDN. Proactive ' +
          'master refresh is best-effort only; progressive mp4 is the ' +
          'supported gated path.',
      );
    }

    // Reactive path: a media error during gated playback is, in practice, the
    // signed URL expiring (a range/segment request 403s). Try a re-resolve.
    this.errorHandler = () => this._onMediaError();
    this.video.addEventListener('error', this.errorHandler);

    // Proactive path: refresh ahead of expiry so the old URL is replaced
    // before it can fail.
    this._schedule(expiresInSeconds);
  }

  /**
   * Re-resolve a fresh signed URL now and swap it onto the element.
   * Returns true on success, false if it failed (and gated via onFailure).
   * Safe to call from the proactive timer, the error handler, or a user retry.
   */
  async refreshNow(_reason: RefreshReason = 'manual'): Promise<boolean> {
    if (this.stopped || this.refreshing) return false;
    this.refreshing = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    try {
      const { url, expiresInSeconds } = await this.api.getSessionPlaybackUrl(
        this.sessionId,
      );
      if (!url) throw new Error('empty playback url');
      if (this.stopped) return false;
      await this._swapSource(url);
      this._schedule(expiresInSeconds);
      this.cb.onRefreshed?.(url);
      return true;
    } catch (err) {
      // FAIL CLOSED. Pause immediately so no protected frames keep playing on
      // a dead URL, then let the SDK gate. Never revert to a durable URL.
      try {
        this.video.pause();
      } catch {
        /* ignore */
      }
      if (!this.stopped) this.cb.onFailure(err);
      return false;
    } finally {
      this.refreshing = false;
    }
  }

  /** Tear down timers + listeners (called on session end / disconnect). */
  stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.errorHandler) {
      this.video.removeEventListener('error', this.errorHandler);
      this.errorHandler = null;
    }
  }

  // ---------------------------------------------------------------------------

  private _schedule(expiresInSeconds: number): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.stopped) return;
    const ttl =
      Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
        ? expiresInSeconds
        : 120;
    const refreshIn = Math.max(
      MIN_REFRESH_SECONDS,
      ttl * REFRESH_AT_TTL_FRACTION,
    );
    this.timer = setTimeout(() => {
      void this.refreshNow('ttl');
    }, refreshIn * 1000);
  }

  private _onMediaError(): void {
    if (this.stopped || this.refreshing) return;
    // Genuine non-expiry errors also funnel here; they will gate after a failed
    // re-resolve, which is the correct fail-closed outcome.
    void this.refreshNow('error');
  }

  /**
   * Swap a fresh URL onto the element, preserving position + play state. For
   * progressive mp4 this sustains playback (browser re-requests ranges against
   * the new URL); restoring currentTime keeps the swap as close to seamless as
   * the media element allows.
   */
  private _swapSource(url: string): Promise<void> {
    const video = this.video;
    const wasPlaying = !video.paused && !video.ended;
    const resumeAt = video.currentTime || 0;
    return new Promise<void>((resolve) => {
      const onLoaded = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        try {
          if (resumeAt > 0 && Number.isFinite(resumeAt)) {
            video.currentTime = resumeAt;
          }
        } catch {
          /* seeking may be momentarily unavailable; ignore */
        }
        if (wasPlaying) video.play().catch(() => {});
        resolve();
      };
      video.addEventListener('loadedmetadata', onLoaded);
      video.src = url;
      try {
        video.load();
      } catch {
        /* ignore */
      }
    });
  }

  /** Strip the query string so signed-URL params don't fool extension checks. */
  private _pathOf(url: string): string {
    const q = url.indexOf('?');
    return q === -1 ? url : url.slice(0, q);
  }
}
