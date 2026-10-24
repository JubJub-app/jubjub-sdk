import { EventEmitter } from '../EventEmitter';
import type { ApiClient } from '../api/ApiClient';
import type { Session } from './Session';
import type { CostInfo, SegmentResponse } from '../types';
import { segmentOutcome, type SegmentOutcome } from '../sessionLifecycle';

const SEGMENT_SECONDS = 6;

/**
 * Bills the time that was actually played, never a seek, never a pause and
 * nothing after the end.
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
 *
 * Metering derives only from played media time (pot model rule 7): a paused
 * element emits no `timeupdate`, and the one some browsers emit on pause
 * carries no media delta, so a pause of any length accrues nothing and sends
 * no segment. After `ended` nothing accrues and nothing is sent, whatever the
 * element fires; the SDK closes the session at that moment.
 *
 * Every segment's answer is read (rule 2): the tracker emits 'segment' with
 * the backend's SegmentResponse and its outcome (sessionLifecycle.
 * segmentOutcome), and once the backend says the session is no longer active
 * the tracker sends nothing more to it, before the SDK has even torn it down.
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
  private endedHandler: (() => void) | null = null;
  private now: () => number;

  // Accumulative playback tracking; never decreases.
  private totalPlaybackSeconds = 0;
  private lastCurrentTime = 0;
  private lastWallClockMs: number | null = null;
  private lastSegmentBoundary = 0; // based on totalPlaybackSeconds
  private seeking = false;
  private skipNextDelta = false;
  /** Set by the element's `ended`: nothing accrues or is sent afterwards. */
  private ended = false;
  /** Set once the backend said this session is no longer active. */
  private sessionEnded = false;

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
    this.endedHandler = () => {
      this.ended = true;
    };

    this.timeUpdateHandler = () => {
      const current = this.video.currentTime;
      const wallMs = this.now();
      const mediaDelta = current - this.lastCurrentTime;
      const wallDelta =
        this.lastWallClockMs == null ? 0 : Math.max(0, (wallMs - this.lastWallClockMs) / 1000);
      this.lastCurrentTime = current;
      this.lastWallClockMs = wallMs;

      if (this.ended || this.video.ended === true) {
        // The content has played to its end: nothing more is watched.
        this.ended = true;
        return;
      }
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
        // throttled update is credited in full and a jump cannot be. A pause
        // of any length arrives here with a media delta of zero (or the few
        // milliseconds that played before the pause) and so costs nothing.
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
        this.lastSegmentBoundary = currentBoundary;
        if (!this.sessionEnded) {
          for (let i = 0; i < crossed; i++) this._sendSegment();
        }
      }
    };

    this.video.addEventListener('seeking', this.seekingHandler);
    this.video.addEventListener('seeked', this.seekedHandler);
    this.video.addEventListener('ended', this.endedHandler);
    this.video.addEventListener('timeupdate', this.timeUpdateHandler);

    // Smooth 200ms display update
    this.displayInterval = setInterval(() => {
      if (this.video.paused) return;
      const cost = this.getCost();
      this.emit('cost', cost);
    }, 200);
  }

  /**
   * One segment POST. The answer decides whether this session keeps
   * metering: 'continue' changes nothing; 'rollover' and 'closed' stop every
   * further segment to this session at once and are announced on 'segment'
   * so the SDK can close locally and, for the cap, open a new session.
   */
  private _sendSegment(): void {
    this.api
      .recordSegment(this.session.id)
      .then((response) => {
        const outcome: SegmentOutcome = segmentOutcome(response);
        if (outcome !== 'continue') this.sessionEnded = true;
        this.emit('segment', { outcome, response });
      })
      .catch(() => {});
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
    if (this.endedHandler) {
      this.video.removeEventListener('ended', this.endedHandler);
      this.endedHandler = null;
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

/** The payload of the tracker's 'segment' event. */
export interface SegmentEvent {
  outcome: SegmentOutcome;
  response: SegmentResponse | null;
}
