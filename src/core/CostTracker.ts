import { EventEmitter } from '../EventEmitter';
import type { ApiClient } from '../api/ApiClient';
import type { Session } from './Session';
import type { CostInfo } from '../types';

const SEGMENT_SECONDS = 6;

export class CostTracker extends EventEmitter {
  private video: HTMLVideoElement;
  private pricePerMinute: number;
  private pricePerSecond: number;
  private lastBoundaryIndex = 0;
  private lastReportedSecond = 0;
  private session: Session;
  private api: ApiClient;
  private displayInterval: number | null = null;
  private timeUpdateHandler: (() => void) | null = null;

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
  }

  start(): void {
    // Segment boundary tracking via timeupdate
    this.timeUpdateHandler = () => {
      const currentTime = this.video.currentTime;

      // Backward jump — reset pointer
      if (currentTime < this.lastReportedSecond) {
        this.lastReportedSecond = currentTime;
        return;
      }
      // Large forward jump (>12s) — skip, don't charge
      if (currentTime - this.lastReportedSecond > 12) {
        this.lastReportedSecond = currentTime;
        return;
      }

      const currentIndex = Math.floor(currentTime / SEGMENT_SECONDS);
      if (currentIndex > this.lastBoundaryIndex) {
        const crossed = currentIndex - this.lastBoundaryIndex;
        for (let i = 0; i < crossed; i++) {
          this.api.recordSegment(this.session.id).catch(() => {});
        }
        this.lastBoundaryIndex = currentIndex;
      }
      this.lastReportedSecond = currentTime;
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
    return this.video.currentTime;
  }

  getCost(): CostInfo {
    const seconds = this.video.currentTime;
    const usdc = seconds * this.pricePerSecond;
    return {
      usdc,
      seconds,
      formatted: `$${usdc.toFixed(4)}`,
    };
  }
}
