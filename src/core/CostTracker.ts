import { EventEmitter } from '../EventEmitter';
import type { ApiClient } from '../api/ApiClient';
import type { Session } from './Session';
import type { CostInfo } from '../types';

const SEGMENT_SECONDS = 6;
const MAX_NORMAL_DELTA = 2; // seconds — anything larger is a seek

export class CostTracker extends EventEmitter {
  private video: HTMLVideoElement;
  private pricePerMinute: number;
  private pricePerSecond: number;
  private session: Session;
  private api: ApiClient;
  private displayInterval: number | null = null;
  private timeUpdateHandler: (() => void) | null = null;

  // Accumulative playback tracking — never decreases.
  private totalPlaybackSeconds = 0;
  private lastCurrentTime = 0;
  private lastSegmentBoundary = 0; // based on totalPlaybackSeconds

  constructor(
    video: HTMLVideoElement,
    pricePerMinute: number,
    session: Session,
    api: ApiClient,
  ) {
    super();
    this.video = video;
    this.pricePerMinute = pricePerMinute;
    this.pricePerSecond = pricePerMinute / 60;
    this.session = session;
    this.api = api;
    this.lastCurrentTime = video.currentTime;
  }

  start(): void {
    this.timeUpdateHandler = () => {
      const now = this.video.currentTime;
      const delta = now - this.lastCurrentTime;
      this.lastCurrentTime = now;

      // Normal forward playback (small positive delta): accumulate
      if (delta > 0 && delta <= MAX_NORMAL_DELTA) {
        this.totalPlaybackSeconds += delta;
      }
      // delta <= 0 → backward seek: ignore (don't subtract cost)
      // delta > MAX_NORMAL_DELTA → forward seek: ignore (didn't watch)

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

    this.video.addEventListener('timeupdate', this.timeUpdateHandler);

    // Smooth 200ms display update
    this.displayInterval = window.setInterval(() => {
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
