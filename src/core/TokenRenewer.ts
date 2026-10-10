/**
 * Keeps a signed stream playing across short token lifetimes.
 *
 * A generalisation of PlaybackUrlRefresher (Tier 2, which stays untouched):
 * the caller supplies `resolve`, which asks for a fresh URL and its lifetime,
 * and `apply`, which puts that URL on the player. Mux checks the token's
 * expiry on every segment request, so renewal happens at 80% of the lifetime,
 * before the old token can 403 mid-stream.
 *
 * FAIL CLOSED: it never holds or reverts to a durable URL. A resolve that
 * fails pauses the element and calls onFailure so the SDK can gate. A 402
 * (funding) latches: nothing automatic re-resolves until an explicit
 * renewNow('manual'), so a viewer who cannot pay is not re-asked in a loop.
 *
 * SUSPENDED IS NOT STOPPED: after `ended` the loop pauses and a later `play`
 * lifts it with an immediate re-resolve, so a replay works and a finished
 * video never grows a paywall.
 */
import { isFundingRequiredError } from '../fundingErrors';

const RENEW_AT_TTL_FRACTION = 0.8;
const MIN_RENEW_SECONDS = 5;

export interface RenewerCallbacks {
  onRenewed?: (url: string) => void;
  /** The element is already paused when this fires. */
  onFailure: (err: unknown) => void;
}

export type RenewReason = 'ttl' | 'error' | 'manual';

export interface Resolved {
  url: string;
  expiresIn: number;
  renewAfter?: number;
}

export function renewDelaySeconds(expiresIn: number, renewAfter?: number): number {
  const ttl = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 600;
  const wanted =
    renewAfter !== undefined && Number.isFinite(renewAfter) && renewAfter > 0
      ? Math.min(renewAfter, ttl)
      : ttl * RENEW_AT_TTL_FRACTION;
  return Math.max(MIN_RENEW_SECONDS, wanted);
}

export class TokenRenewer {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private errorHandler: (() => void) | null = null;
  private endedHandler: (() => void) | null = null;
  private playHandler: (() => void) | null = null;
  private stopped = false;
  private suspended = false;
  private renewing = false;
  private fundingBlocked = false;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly resolve: (reason: RenewReason) => Promise<Resolved>,
    private readonly apply: (url: string) => Promise<void>,
    private readonly cb: RenewerCallbacks,
    private readonly setTimer: typeof setTimeout = setTimeout,
    private readonly clearTimer: typeof clearTimeout = clearTimeout,
  ) {}

  /** Begin managing expiry for a URL already applied to the element. */
  start(expiresIn: number, renewAfter?: number): void {
    this.errorHandler = () => this.onMediaError();
    this.video.addEventListener('error', this.errorHandler);
    this.endedHandler = () => this.onEnded();
    this.video.addEventListener('ended', this.endedHandler);
    this.playHandler = () => this.onPlay();
    this.video.addEventListener('play', this.playHandler);
    this.schedule(expiresIn, renewAfter);
  }

  async renewNow(reason: RenewReason = 'manual'): Promise<boolean> {
    if (this.stopped || this.renewing) return false;
    if (this.fundingBlocked && reason !== 'manual') return false;
    this.renewing = true;
    this.cancelTimer();
    try {
      const next = await this.resolve(reason);
      if (!next.url) throw new Error('empty playback url');
      if (this.stopped) return false;
      this.fundingBlocked = false;
      await this.apply(next.url);
      this.schedule(next.expiresIn, next.renewAfter);
      this.cb.onRenewed?.(next.url);
      return true;
    } catch (err) {
      try { this.video.pause(); } catch { /* ignore */ }
      if (isFundingRequiredError(err)) this.fundingBlocked = true;
      if (!this.stopped) this.cb.onFailure(err);
      return false;
    } finally {
      this.renewing = false;
    }
  }

  stop(): void {
    this.stopped = true;
    this.cancelTimer();
    if (this.errorHandler) this.video.removeEventListener('error', this.errorHandler);
    if (this.endedHandler) this.video.removeEventListener('ended', this.endedHandler);
    if (this.playHandler) this.video.removeEventListener('play', this.playHandler);
    this.errorHandler = this.endedHandler = this.playHandler = null;
  }

  private cancelTimer(): void {
    if (this.timer) {
      this.clearTimer(this.timer);
      this.timer = null;
    }
  }

  private schedule(expiresIn: number, renewAfter?: number): void {
    this.cancelTimer();
    if (this.stopped || this.suspended || this.fundingBlocked) return;
    this.timer = this.setTimer(() => {
      void this.renewNow('ttl');
    }, renewDelaySeconds(expiresIn, renewAfter) * 1000);
  }

  private onEnded(): void {
    if (this.stopped) return;
    this.suspended = true;
    this.cancelTimer();
  }

  private onPlay(): void {
    if (this.stopped || !this.suspended || this.fundingBlocked) return;
    this.suspended = false;
    void this.renewNow('manual');
  }

  private onMediaError(): void {
    if (this.stopped || this.suspended || this.renewing || this.fundingBlocked) return;
    void this.renewNow('error');
  }
}
