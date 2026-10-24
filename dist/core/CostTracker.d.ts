import { EventEmitter } from '../EventEmitter';
import type { ApiClient } from '../api/ApiClient';
import type { Session } from './Session';
import type { CostInfo } from '../types';
/**
 * Bills the time that was actually played, never a seek.
 *
 * Two facts decide what a `timeupdate` delta is worth:
 *   - The element's `seeking` / `seeked` events. A delta while seeking, and
 *     the first delta after `seeked`, is a jump and is ignored (forward or
 *     back). Before this the tracker guessed: any delta over 2 s was treated
 *     as a seek, so a background-throttled tab, whose `timeupdate` arrives
 *     seconds apart, accrued nothing and sent no segments (AUDIT-SDK K3-4).
 *   - Wall-clock time since the previous update, scaled by the playback rate.
 *     A delta is credited up to that bound, so sparse updates are credited in
 *     full while a jump the events did not announce can never be worth more
 *     than the time that actually passed.
 */
export declare class CostTracker extends EventEmitter {
    private video;
    private pricePerMinute;
    private pricePerSecond;
    private session;
    private api;
    private displayInterval;
    private timeUpdateHandler;
    private seekingHandler;
    private seekedHandler;
    private now;
    private totalPlaybackSeconds;
    private lastCurrentTime;
    private lastWallClockMs;
    private lastSegmentBoundary;
    private seeking;
    private skipNextDelta;
    constructor(video: HTMLVideoElement, pricePerMinute: number, session: Session, api: ApiClient, 
    /** Wall clock in milliseconds; injectable for tests. */
    now?: () => number);
    start(): void;
    stop(): void;
    getPlaybackSeconds(): number;
    getCost(): CostInfo;
}
