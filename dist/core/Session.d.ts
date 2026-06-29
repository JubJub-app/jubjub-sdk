import type { ApiClient } from '../api/ApiClient';
export declare class Session {
    readonly id: string;
    readonly onChainId: string;
    readonly contentId: string;
    readonly walletAddress: string;
    private api;
    private constructor();
    static create(contentId: string, walletAddress: string, api: ApiClient): Promise<Session>;
    close(playbackSeconds: number): Promise<void>;
    beaconClose(playbackSeconds: number): void;
}
