/**
 * Pure decisions about when the SDK closes a paid session and when it must
 * open a new one. DOM-free so they are unit-tested directly
 * (test/sessionLifecycle.test.ts); JubJub.ts applies them to the <video>.
 *
 * The rule they implement: a session is open whenever paid playback is
 * happening, and playback never continues against a closed session.
 */
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
 * True exactly when the SDK's session was closed (by the beacon, or anything
 * else that marked it closed) and no re-open is already running.
 */
export declare function mustReopenOnPlay(state: {
    sessionClosed: boolean;
    reopening: boolean;
}): boolean;
