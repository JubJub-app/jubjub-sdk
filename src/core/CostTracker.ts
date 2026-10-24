import { EventEmitter } from '../EventEmitter';
import type { ApiClient } from '../api/ApiClient';
import type { Session } from './Session';
import type { CostInfo } from '../types';

const SEGMENT_SECONDS = 6;

/**
 * Bills the time that was actually played, never a seek.
 *
 * Two facts decide what a `timeupdate` delta is worth:
 *   - The element's `seeking` / `seeked` events. A delta while seeking, and
 *     the first delta after `seeked`, is a jump and is ignored (forward or
 *     back). Before this the tracker guessed: any delta over 2 s was treated
 *     as a seek, so a background-throttled tab, whose `timeupdate` arrives
 *     seconds apart, accrued nothing and sent no segments (AUDIT-SDK K3-4).
 *   - Wall-clock time since the previous update, scaled by the playback rate.
 *     A delta is credited up to that bound, so sparse updates are credited in
 *     full while a jump the events did not announce can never be worth more
 *     than the time that actually passed.
 */
export class CostTracker extends EventEmitter {
  private video: HTMLVideoElement;
  private pricePerMinute: number;
  private pricePerSecond: number;
  private session: Session;
  private api: ApiClient;
  private displayInterval: ReturnType<typeof setInterval> | null = null;
  private timeUpdateHandler: (() => void) | null = null;
  private seekingHandler: (() => void) | null = null;
  private seekedHandler: (() => void) | null = null;
  private now: () => number;

  // Accumulative playback tracking; never decreases.
  private totalPlaybackSeconds = 0;
  private lastCurrentTime = 0;
  private lastWallClockMs: number | null = null;
  private lastSegmentBoundary = 0; // based on totalPlaybackSeconds
  private seeking = false;
  private skipNextDelta = false;

  constructor(
    video: HTMLVideoElement,
    pricePerMinute: number,
    session: Session,
    api: ApiClient,
    /** Wall clock in milliseconds; injectable for tests. */
    now: () => number = () => Date.now(),
  ) {
    super();
    this.video = video;
    this.pricePerMinute = pricePerMinute;
    this.pricePerSecond = pricePerMinute / 60;
    this.session = session;
    this.api = api;
    this.now = now;
    this.lastCurrentTime = video.currentTime;
  }

  start(): void {
    this.lastWallClockMs = this.now();

    this.seekingHandler = () => {
      this.seeking = true;
    };
    this.seekedHandler = () => {
      // Land here: the next delta is measured from the seek target, and the
      // first one after a seek is dropped so a late timeupdate carrying the
      // jump is never credited.
      this.seeking = false;
      this.skipNextDelta = true;
      this.lastCurrentTime = this.video.currentTime;
      this.lastWallClockMs = this.now();
    };

    this.timeUpdateHandler = () => {
      const current = this.video.currentTime;
      const wallMs = this.now();
      const mediaDelta = current - this.lastCurrentTime;
      const wallDelta =
        this.lastWallClockMs == null ? 0 : Math.max(0, (wallMs - this.lastWallClockMs) / 1000);
      this.lastCurrentTime = current;
      this.lastWallClockMs = wallMs;

      if (this.seeking) {
        // A jump in progress: not watched.
        return;
      }
      if (this.skipNextDelta) {
        this.skipNextDelta = false;
        return;
      }
      if (mediaDelta > 0) {
        // Forward playback. Credit the media time that passed, bounded by the
        // wall-clock time that passed (at the element's playback rate), so a
        // throttled update is credited in full and a jump cannot be.
        const rate = Number(this.video.playbackRate);
        const bound = wallDelta * (Number.isFinite(rate) && rate > 0 ? rate : 1);
        this.totalPlaybackSeconds += Math.min(mediaDelta, bound);
      }
      // mediaDelta <= 0: a backward jump the events did not announce. Ignore
      // (never subtract cost).

      // Segment boundary based on accumulated playback, not timeline
      const currentBoundary = Math.floor(
        this.totalPlaybackSeconds / SEGMENT_SECONDS,
      );
      if (currentBoundary > this.lastSegmentBoundary) {
        const crossed = currentBoundary - this.lastSegmentBoundary;
        for (let i = 0; i < crossed; i++) {
          this.api.recordSegment(this.session.id).catch(() => {});
        }
        this.lastSegmentBoundary = currentBoundary;
      }
    };

    this.video.addEventListener('seeking', this.seekingHandler);
    this.video.addEventListener('seeked', this.seekedHandler);
    this.video.addEventListener('timeupdate', this.timeUpdateHandler);

    // Smooth 200ms display update
    this.displayInterval = setInterval(() => {
      if (this.video.paused) return;
      const cost = this.getCost();
      this.emit('cost', cost);
    }, 200);
  }

  stop(): void {
    if (this.timeUpdateHandler) {
      this.video.removeEventListener('timeupdate', this.timeUpdateHandler);
      this.timeUpdateHandler = null;
    }
    if (this.seekingHandler) {
      this.video.removeEventListener('seeking', this.seekingHandler);
      this.seekingHandler = null;
    }
    if (this.seekedHandler) {
      this.video.removeEventListener('seeked', this.seekedHandler);
      this.seekedHandler = null;
    }
    if (this.displayInterval !== null) {
      clearInterval(this.displayInterval);
      this.displayInterval = null;
    }
  }

  getPlaybackSeconds(): number {
    return this.totalPlaybackSeconds;
  }

  getCost(): CostInfo {
    const seconds = this.totalPlaybackSeconds;
    const usdc = seconds * this.pricePerSecond;
    return {
      usdc,
      seconds,
      formatted: `$${usdc.toFixed(4)}`,
    };
  }
}
