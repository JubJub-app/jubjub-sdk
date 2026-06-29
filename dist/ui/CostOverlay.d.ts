import type { CostInfo } from '../types';
type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export declare class CostOverlay {
    private container;
    private costEl;
    private timeEl;
    constructor(video: HTMLVideoElement, position?: Position);
    update(cost: CostInfo): void;
    remove(): void;
}
export {};
