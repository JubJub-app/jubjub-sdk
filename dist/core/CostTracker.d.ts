import { EventEmitter } from '../EventEmitter';
import type { ApiClient } from '../api/ApiClient';
import type { Session } from './Session';
import type { CostInfo, SegmentResponse } from '../types';
import { type SegmentOutcome } from '../sessionLifecycle';
/**
 * Bills the time that was actually played, never a seek, never a pause and
 * nothing after the end.
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
 *
 * Metering derives only from played media time (pot model rule 7): a paused
 * element emits no `timeupdate`, and the one some browsers emit on pause
 * carries no media delta, so a pause of any length accrues nothing and sends
 * no segment. After `ended` nothing accrues and nothing is sent, whatever the
 * element fires; the SDK closes the session at that moment.
 *
 * Every segment's answer is read (rule 2): the tracker emits 'segment' with
 * the backend's SegmentResponse and its outcome (sessionLifecycle.
 * segmentOutcome), and once the backend says the session is no longer active
 * the tracker sends nothing more to it, before the SDK has even torn it down.
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
    private endedHandler;
    private now;
    private totalPlaybackSeconds;
    private lastCurrentTime;
    private lastWallClockMs;
    private lastSegmentBoundary;
    private seeking;
    private skipNextDelta;
    /** Set by the element's `ended`: nothing accrues or is sent afterwards. */
    private ended;
    /** Set once the backend said this session is no longer active. */
    private sessionEnded;
    constructor(video: HTMLVideoElement, pricePerMinute: number, session: Session, api: ApiClient, 
    /** Wall clock in milliseconds; injectable for tests. */
    now?: () => number);
    start(): void;
    /**
     * One segment POST. The answer decides whether this session keeps
     * metering: 'continue' changes nothing; 'rollover' and 'closed' stop every
     * further segment to this session at once and are announced on 'segment'
     * so the SDK can close locally and, for the cap, open a new session.
     */
    private _sendSegment;
    stop(): void;
    getPlaybackSeconds(): number;
    getCost(): CostInfo;
}
/** The payload of the tracker's 'segment' event. */
export interface SegmentEvent {
    outcome: SegmentOutcome;
    response: SegmentResponse | null;
}
