/**
 * Pure decisions about when the SDK closes a paid session and when it must
 * open a new one. DOM-free so they are unit-tested directly
 * (test/sessionLifecycle.test.ts); JubJub.ts applies them to the <video>.
 *
 * The rule they implement (the pot model, Tom, 2026-10-24): a session is open
 * whenever paid playback is happening, playback never continues against a
 * closed session, and a session that the backend closed is replaced quietly,
 * from the viewer's standing allowance, with a prompt only when the pot
 * cannot cover it.
 */
import type { SegmentResponse } from './types';
/** The two media-element facts the hidden-tab decision needs. */
export interface MediaPlayState {
    paused: boolean;
    ended: boolean;
}
/**
 * `visibilitychange` to hidden: should the one-shot beacon close fire?
 *
 * Only when nothing is playing. A tab hidden with the media paused or ended
 * holds a session nobody is using, and the beacon returns the viewer's pull
 * authority now rather than at the idle sweep. A tab hidden with audio still
 * playing (a phone switching apps, a tab moved to the background) is a viewer
 * still watching: closing there left Tier 1 posting segments to a closed
 * session (free play) and Tier 2 gated with "your paid session ended" when
 * the viewer came back. The session stays open; the backend's idle cron
 * closes one that is truly abandoned. `beforeunload` and `pagehide` are not
 * affected by this: they always beacon.
 */
export declare function shouldBeaconOnHidden(media: MediaPlayState): boolean;
/**
 * The media element fired `play`: must a session be opened before it plays?
 * True exactly when the SDK's session was closed (by the beacon, the `ended`
 * event, the cap, or anything else that marked it closed) and no re-open is
 * already running.
 */
export declare function mustReopenOnPlay(state: {
    sessionClosed: boolean;
    reopening: boolean;
}): boolean;
/**
 * What a segment POST's answer means for the session it was sent to.
 *
 *   'continue'  the session is still active (or the answer could not be read,
 *               which the next segment will settle): keep metering it.
 *   'rollover'  the backend closed the session because the next segment
 *               would have taken it over its per-session cap
 *               (end_reason "cap_reached"). Stop metering it, mark it closed
 *               locally (never call /close on it) and open a new session
 *               quietly, keeping the media playing.
 *   'closed'    the backend closed the session for any other reason (an
 *               unpaid tab, the idle sweep, a beacon from another tab). Stop
 *               metering it and mark it closed; nothing continues against it.
 */
export type SegmentOutcome = 'continue' | 'rollover' | 'closed';
export declare const CAP_REACHED = "cap_reached";
export declare function segmentOutcome(resp: SegmentResponse | null | undefined): SegmentOutcome;
/** How a re-open after a given outcome treats the media element. */
export interface ReopenMode {
    /**
     * true: pause now, open the new session, resume from the same position
     * once it is open (a replay after the session was closed). false: the cap
     * rollover, where the media keeps playing while the new session opens and
     * is paused only if the open is refused.
     */
    pauseWhileReopening: boolean;
}
/**
 * The cap rollover keeps playing; every other re-open pauses first. Pure so
 * the orchestration decision "keep playing on cap_reached" is tested without
 * a DOM.
 */
export declare function reopenModeFor(outcome: 'rollover' | 'closed' | 'replay'): ReopenMode;
/**
 * The backend closed a session mid-playback. Must the SDK act now, or can it
 * wait for the next `play`? While the media is playing, waiting would leave
 * frames playing with no session behind them, so the re-open runs now. Paused
 * or ended media has nothing playing: mark the session closed and let the
 * next `play` re-open (mustReopenOnPlay).
 */
export declare function mustReopenNow(media: MediaPlayState): boolean;
