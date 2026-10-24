import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CostTracker } from '../src/core/CostTracker';

// Audit bug 17: the tracker dropped any timeupdate delta over 2 s as a seek,
// so background-throttled playback accrued nothing and sent no segments.
// Intended: bill time actually played, never a seek.

function fakeVideo() {
  const listeners = new Map<string, Set<() => void>>();
  const video = {
    currentTime: 0,
    paused: false,
    playbackRate: 1,
    addEventListener(ev: string, fn: () => void) {
      if (!listeners.has(ev)) listeners.set(ev, new Set());
      listeners.get(ev)!.add(fn);
    },
    removeEventListener(ev: string, fn: () => void) {
      listeners.get(ev)?.delete(fn);
    },
    fire(ev: string) {
      listeners.get(ev)?.forEach((fn) => fn());
    },
    listenerCount(ev: string) {
      return listeners.get(ev)?.size ?? 0;
    },
  };
  return video;
}

function harness() {
  const video = fakeVideo();
  let wallMs = 1_000_000;
  const clock = {
    advance(seconds: number) {
      wallMs += seconds * 1000;
    },
  };
  const segments: string[] = [];
  const api = { recordSegment: async (id: string) => { segments.push(id); } };
  const tracker = new CostTracker(
    video as any,
    0.006, // $0.006/min = $0.0001/s, easy arithmetic
    { id: 'sess_1' } as any,
    api as any,
    () => wallMs,
  );
  tracker.start();
  /** Advance the wall clock and the media clock, then fire timeupdate. */
  const tick = (mediaSeconds: number, wallSeconds = mediaSeconds) => {
    clock.advance(wallSeconds);
    video.currentTime += mediaSeconds;
    video.fire('timeupdate');
  };
  return { video, clock, tracker, segments, tick };
}

test('ordinary playback is credited in full and crosses segment boundaries', () => {
  const h = harness();
  try {
    for (let i = 0; i < 28; i++) h.tick(0.25);
    assert.ok(Math.abs(h.tracker.getPlaybackSeconds() - 7) < 1e-9);
    assert.equal(h.segments.length, 1);
    assert.equal(h.segments[0], 'sess_1');
    assert.equal(h.tracker.getCost().formatted, '$0.0007');
  } finally {
    h.tracker.stop();
  }
});

test('a throttled update (one timeupdate after 10 s of real playback) is credited, not dropped', () => {
  const h = harness();
  try {
    h.tick(10, 10);
    assert.equal(h.tracker.getPlaybackSeconds(), 10);
    assert.equal(h.segments.length, 1);
    h.tick(8, 8);
    assert.equal(h.tracker.getPlaybackSeconds(), 18);
    assert.equal(h.segments.length, 3);
  } finally {
    h.tracker.stop();
  }
});

test('a forward jump is bounded by the wall clock that passed', () => {
  const h = harness();
  try {
    // 30 s of media in 0.25 s of real time with no seeking/seeked events:
    // at most 0.25 s can have been watched.
    h.tick(30, 0.25);
    assert.ok(Math.abs(h.tracker.getPlaybackSeconds() - 0.25) < 1e-9);
    assert.equal(h.segments.length, 0);
  } finally {
    h.tracker.stop();
  }
});

test('a seek announced by seeking/seeked is never credited, and play after it is', () => {
  const h = harness();
  try {
    h.tick(1);
    h.tick(1);
    assert.equal(h.tracker.getPlaybackSeconds(), 2);
    // Scrub forward 60 s: seeking, a timeupdate at the new position, seeked,
    // then the first timeupdate after landing.
    h.video.fire('seeking');
    h.clock.advance(0.1);
    h.video.currentTime = 62;
    h.video.fire('timeupdate');
    h.video.fire('seeked');
    h.clock.advance(0.1);
    h.video.fire('timeupdate');
    assert.equal(h.tracker.getPlaybackSeconds(), 2);
    // Playback resumes from 62: credited normally.
    h.tick(0.25);
    h.tick(0.25);
    assert.ok(Math.abs(h.tracker.getPlaybackSeconds() - 2.5) < 1e-9);
  } finally {
    h.tracker.stop();
  }
});

test('a backward seek never reduces the cost', () => {
  const h = harness();
  try {
    h.tick(5);
    h.video.fire('seeking');
    h.video.currentTime = 1;
    h.video.fire('seeked');
    h.clock.advance(0.1);
    h.video.fire('timeupdate');
    assert.equal(h.tracker.getPlaybackSeconds(), 5);
    // An unannounced backward jump is ignored too.
    h.clock.advance(0.25);
    h.video.currentTime = 0.5;
    h.video.fire('timeupdate');
    assert.equal(h.tracker.getPlaybackSeconds(), 5);
    h.tick(0.25);
    assert.ok(Math.abs(h.tracker.getPlaybackSeconds() - 5.25) < 1e-9);
  } finally {
    h.tracker.stop();
  }
});

test('a pause costs nothing: the first delta after it is media time, not the wall clock', () => {
  const h = harness();
  try {
    h.tick(1);
    // Paused for ten minutes: no timeupdate fires. On resume the first update
    // carries 0.25 s of media against 600 s of wall clock.
    h.tick(0.25, 600.25);
    assert.ok(Math.abs(h.tracker.getPlaybackSeconds() - 1.25) < 1e-9);
  } finally {
    h.tracker.stop();
  }
});

test('faster playback is credited in media time up to the rate', () => {
  const h = harness();
  try {
    h.video.playbackRate = 2;
    h.tick(0.5, 0.25);
    assert.ok(Math.abs(h.tracker.getPlaybackSeconds() - 0.5) < 1e-9);
    // But a jump still cannot exceed rate x wall clock.
    h.tick(30, 0.25);
    assert.ok(Math.abs(h.tracker.getPlaybackSeconds() - 1.0) < 1e-9);
  } finally {
    h.tracker.stop();
  }
});

test('stop() removes every listener it added', () => {
  const h = harness();
  assert.equal(h.video.listenerCount('timeupdate'), 1);
  assert.equal(h.video.listenerCount('seeking'), 1);
  assert.equal(h.video.listenerCount('seeked'), 1);
  h.tracker.stop();
  assert.equal(h.video.listenerCount('timeupdate'), 0);
  assert.equal(h.video.listenerCount('seeking'), 0);
  assert.equal(h.video.listenerCount('seeked'), 0);
  // No segments after stop, even if the element keeps firing.
  h.video.currentTime += 60;
  h.video.fire('timeupdate');
  assert.equal(h.segments.length, 0);
});
