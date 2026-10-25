import type { CostInfo } from '../types';
type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export declare class CostOverlay {
    private container;
    private costEl;
    private timeEl;
    /** 2.4.0: the card line, created by setCard() on a card session only. */
    private cardEl;
    private card;
    constructor(video: HTMLVideoElement, position?: Position, claimUrl?: string);
    /**
     * A card session (2.4.0): show what the card can still cover for this
     * session (card_balance_micro at open, minus the cost so far) and the
     * per-second price. Never called on the approve rail, so that chip is
     * unchanged.
     */
    setCard(balanceMicro: number, pricePerMinute: number): void;
    private _renderCard;
    update(cost: CostInfo): void;
    remove(): void;
}
export {};
