import type { ApiClient } from '../api/ApiClient';
export declare class Session {
    readonly id: string;
    readonly onChainId: string;
    readonly contentId: string;
    readonly walletAddress: string;
    /** 2.4.0: 'card' on a card session; undefined on the approve rail. */
    rail?: string;
    /** 2.4.0: the card this session draws on (null on the approve rail). */
    cardTokenId: number | null;
    /** 2.4.0: what the card could still cover for this session at open. */
    cardBalanceMicro: number | null;
    private api;
    private constructor();
    static create(contentId: string, walletAddress: string, api: ApiClient, playbackGrant?: string | null, 
    /** 2.4.0: open a card session against this card token id. */
    cardTokenId?: number | null): Promise<Session>;
    close(playbackSeconds: number): Promise<void>;
    beaconClose(playbackSeconds: number): void;
}
