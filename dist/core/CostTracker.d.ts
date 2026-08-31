import { EventEmitter } from '../EventEmitter';
import type { ApiClient } from '../api/ApiClient';
import type { Session } from './Session';
import type { CostInfo } from '../types';
export declare class CostTracker extends EventEmitter {
    private video;
    private pricePerMinute;
    private pricePerSecond;
    private session;
    private api;
    private displayInterval;
    private timeUpdateHandler;
    private totalPlaybackSeconds;
    private lastCurrentTime;
    private lastSegmentBoundary;
    constructor(video: HTMLVideoElement, pricePerMinute: number, session: Session, api: ApiClient);
    start(): void;
    stop(): void;
    getPlaybackSeconds(): number;
    getCost(): CostInfo;
}
