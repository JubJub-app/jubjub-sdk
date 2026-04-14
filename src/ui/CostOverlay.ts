import type { CostInfo } from '../types';

type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

const POSITION_STYLES: Record<Position, string> = {
  'bottom-right': 'bottom:8px;right:8px;',
  'bottom-left': 'bottom:8px;left:8px;',
  'top-right': 'top:8px;right:8px;',
  'top-left': 'top:8px;left:8px;',
};

export class CostOverlay {
  private container: HTMLDivElement;
  private costEl: HTMLSpanElement;
  private timeEl: HTMLSpanElement;
  private video: HTMLVideoElement;
  private observer: ResizeObserver | null = null;

  constructor(video: HTMLVideoElement, position: Position = 'bottom-right') {
    this.video = video;

    // Ensure the video's parent is positioned for absolute children
    const parent = video.parentElement;
    if (parent) {
      const pos = getComputedStyle(parent).position;
      if (pos === 'static') {
        parent.style.position = 'relative';
      }
    }

    this.container = document.createElement('div');
    this.container.setAttribute('data-jubjub-overlay', 'true');
    this.container.style.cssText =
      `position:absolute;${POSITION_STYLES[position]}` +
      'z-index:1000;display:flex;align-items:center;gap:6px;' +
      'background:rgba(0,0,0,0.75);color:#fff;padding:4px 10px;' +
      'border-radius:6px;font-family:system-ui,-apple-system,sans-serif;' +
      'font-size:12px;pointer-events:auto;user-select:none;' +
      'backdrop-filter:blur(4px);transition:opacity 0.2s;';

    this.costEl = document.createElement('span');
    this.costEl.style.cssText = 'font-family:ui-monospace,monospace;font-weight:600;';
    this.costEl.textContent = '$0.0000';

    this.timeEl = document.createElement('span');
    this.timeEl.style.cssText = 'font-family:ui-monospace,monospace;opacity:0.7;';
    this.timeEl.textContent = '0:00';

    const sep = document.createElement('span');
    sep.style.cssText = 'opacity:0.4;';
    sep.textContent = '\u00B7';

    const brand = document.createElement('a');
    brand.href = 'https://jubjubapp.com';
    brand.target = '_blank';
    brand.rel = 'noopener noreferrer';
    brand.style.cssText =
      'font-size:9px;opacity:0.5;color:#fff;text-decoration:none;margin-left:4px;';
    brand.textContent = 'Powered by JubJub';

    this.container.appendChild(this.costEl);
    this.container.appendChild(sep);
    this.container.appendChild(this.timeEl);
    this.container.appendChild(brand);

    (parent ?? document.body).appendChild(this.container);
  }

  update(cost: CostInfo): void {
    this.costEl.textContent = cost.formatted;
    const totalSec = Math.floor(cost.seconds);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    this.timeEl.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
  }

  remove(): void {
    this.observer?.disconnect();
    this.container.remove();
  }
}
