/**
 * Puts a tokened stream URL on the page's player, in the order a host page
 * most likely wants:
 *
 *   1. The host applies it. A cancelable `jubjub:source` DOM event fires on
 *      the video element (and the SDK emits `source`); a page that owns its
 *      player (hls.js already loaded, Mux Player's `tokens`, a native app
 *      shell) calls preventDefault and does the load itself.
 *   2. hls.js, when the host handed one to init({ hls }): loadSource plus
 *      attachMedia on first apply; on renewal loadSource then startLoad at
 *      the current position, which is a quiet re-buffer because Mux embeds
 *      the master token into the child URLs.
 *   3. Native HLS (Safari, iOS): video.src with the position restored. Not
 *      seamless, which is why renewals there are rarer (see the signer's
 *      native TTL).
 *   4. Nothing can play HLS here: fail closed with a named error.
 */

export interface SourceEventDetail {
  url: string;
  tokens: { v: string; t?: string; s?: string };
  expiresIn: number;
  renewAfter?: number;
  playbackId: string;
  host: string;
  /** False on the first apply, true on every renewal. */
  renew: boolean;
}

export type HlsLike = {
  loadSource: (url: string) => void;
  attachMedia: (video: HTMLVideoElement) => void;
  startLoad?: (position?: number) => void;
  destroy?: () => void;
};

export type HlsCtor = new (config?: Record<string, unknown>) => HlsLike;

export class UnplayableHereError extends Error {
  constructor() {
    super('This browser cannot play the protected stream.');
    this.name = 'UnplayableHereError';
  }
}

function isHlsCtor(h: unknown): h is HlsCtor {
  return typeof h === 'function';
}

export class SourceApplier {
  private hls: HlsLike | null = null;
  private applied = false;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly emit: (detail: SourceEventDetail) => void,
    private readonly hlsOption?: HlsCtor | HlsLike | null,
  ) {}

  async apply(detail: SourceEventDetail): Promise<void> {
    const video = this.video;
    const ev = new CustomEvent<SourceEventDetail>('jubjub:source', {
      detail,
      cancelable: true,
      bubbles: true,
    });
    const notCancelled = video.dispatchEvent(ev);
    this.emit(detail);
    if (!notCancelled) {
      // The host owns the player and applied the URL itself.
      this.applied = true;
      return;
    }

    if (this.hlsOption) {
      const hls = this.ensureHls();
      const resumeAt = video.currentTime || 0;
      hls.loadSource(detail.url);
      if (!this.applied) hls.attachMedia(video);
      else hls.startLoad?.(resumeAt);
      this.applied = true;
      return;
    }

    if (typeof video.canPlayType === 'function' && video.canPlayType('application/vnd.apple.mpegurl')) {
      await swapNativeSource(video, detail.url);
      this.applied = true;
      return;
    }

    throw new UnplayableHereError();
  }

  destroy(): void {
    this.hls?.destroy?.();
    this.hls = null;
  }

  private ensureHls(): HlsLike {
    if (this.hls) return this.hls;
    const h = this.hlsOption;
    if (!h) throw new UnplayableHereError();
    this.hls = isHlsCtor(h) ? new h() : h;
    return this.hls;
  }
}

/** video.src swap that keeps position and play state (native HLS path). */
export function swapNativeSource(video: HTMLVideoElement, url: string): Promise<void> {
  const wasPlaying = !video.paused && !video.ended;
  const resumeAt = video.currentTime || 0;
  return new Promise<void>((resolve) => {
    const onLoaded = () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      try {
        if (resumeAt > 0 && Number.isFinite(resumeAt)) video.currentTime = resumeAt;
      } catch { /* ignore */ }
      if (wasPlaying) video.play().catch(() => {});
      resolve();
    };
    video.addEventListener('loadedmetadata', onLoaded);
    video.src = url;
    try { video.load(); } catch { /* ignore */ }
  });
}
