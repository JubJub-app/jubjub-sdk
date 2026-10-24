import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAP_REACHED,
  mustReopenNow,
  mustReopenOnPlay,
  reopenModeFor,
  segmentOutcome,
  shouldBeaconOnHidden,
} from '../src/sessionLifecycle';

// Audit bug 16: a hidden tab closed the session even while audio kept
// playing, and nothing re-opened it.

test('hidden while playing keeps the session open', () => {
  assert.equal(shouldBeaconOnHidden({ paused: false, ended: false }), false);
});

test('hidden while paused closes the session', () => {
  assert.equal(shouldBeaconOnHidden({ paused: true, ended: false }), true);
});

test('hidden after the video ended closes the session', () => {
  assert.equal(shouldBeaconOnHidden({ paused: true, ended: true }), true);
  assert.equal(shouldBeaconOnHidden({ paused: false, ended: true }), true);
});

test('play after the session was closed must open a new one first', () => {
  assert.equal(mustReopenOnPlay({ sessionClosed: true, reopening: false }), true);
});

test('play with a live session, or while a re-open is already running, does nothing', () => {
  assert.equal(mustReopenOnPlay({ sessionClosed: false, reopening: false }), false);
  assert.equal(mustReopenOnPlay({ sessionClosed: true, reopening: true }), false);
});

// The pot model (Tom, 2026-10-24), rules 2 and 3: every segment answer is
// read; the $2.00 cap rolls over quietly; any other closure stops metering.

const active = { session_id: 's1', segment_count: 3, amount_settled: 0.0015, status: 'active', end_reason: null };

test('an active segment answer continues metering', () => {
  assert.equal(segmentOutcome(active), 'continue');
  // A backend that predates end_reason says nothing more than active.
  assert.equal(segmentOutcome({ session_id: 's1', segment_count: 1, amount_settled: 0, status: 'active' }), 'continue');
});

test('a failed or unreadable answer continues metering; the next segment settles it', () => {
  assert.equal(segmentOutcome(null), 'continue');
  assert.equal(segmentOutcome(undefined), 'continue');
  // No status at all reads as active: before 2.2.0 the body was not read.
  assert.equal(segmentOutcome({ status: '' } as any), 'continue');
});

test('the $2.00 cap is a rollover: closed with end_reason cap_reached', () => {
  assert.equal(CAP_REACHED, 'cap_reached');
  assert.equal(
    segmentOutcome({ ...active, segment_count: 4000, amount_settled: 2.0, status: 'closed', end_reason: 'cap_reached' }),
    'rollover',
  );
  assert.equal(segmentOutcome({ ...active, status: 'CLOSED', end_reason: 'cap_reached' }), 'rollover');
});

test('any other closure is closed, never a rollover', () => {
  assert.equal(segmentOutcome({ ...active, status: 'closed', end_reason: 'tab_unpaid' }), 'closed');
  assert.equal(segmentOutcome({ ...active, status: 'closed', end_reason: null }), 'closed');
  assert.equal(segmentOutcome({ ...active, status: 'closed' }), 'closed');
  assert.equal(segmentOutcome({ ...active, status: 'settled', end_reason: 'cap_reached' }), 'rollover');
  assert.equal(segmentOutcome({ ...active, status: 'expired', end_reason: 'idle' }), 'closed');
});

test('the cap rollover keeps playing; a replay or any other closure pauses first', () => {
  assert.deepEqual(reopenModeFor('rollover'), { pauseWhileReopening: false });
  assert.deepEqual(reopenModeFor('closed'), { pauseWhileReopening: true });
  assert.deepEqual(reopenModeFor('replay'), { pauseWhileReopening: true });
});

test('a session the backend closed mid-play re-opens now only while the media is playing', () => {
  assert.equal(mustReopenNow({ paused: false, ended: false }), true);
  // Paused or ended media has nothing playing: wait for the next play.
  assert.equal(mustReopenNow({ paused: true, ended: false }), false);
  assert.equal(mustReopenNow({ paused: false, ended: true }), false);
  assert.equal(mustReopenNow({ paused: true, ended: true }), false);
});
