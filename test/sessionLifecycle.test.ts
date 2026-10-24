import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mustReopenOnPlay, shouldBeaconOnHidden } from '../src/sessionLifecycle';

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
