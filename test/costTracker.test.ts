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
    ended: false,
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
  /** What the backend answers each segment with; tests set it. */
  const answers: { next: any } = {
    next: { session_id: 'sess_1', segment_count: 1, amount_settled: 0, status: 'active', end_reason: null },
  };
  const api = {
    recordSegment: async (id: string) => {
      segments.push(id);
      return answers.next;
    },
  };
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
  const outcomes: Array<{ outcome: string; response: any }> = [];
  tracker.on('segment', (e: any) => outcomes.push(e));
  return { video, clock, tracker, segments, tick, answers, outcomes };
}

/** Let the segment promises settle. */
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

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
  assert.equal(h.video.listenerCount('ended'), 1);
  h.tracker.stop();
  assert.equal(h.video.listenerCount('timeupdate'), 0);
  assert.equal(h.video.listenerCount('seeking'), 0);
  assert.equal(h.video.listenerCount('seeked'), 0);
  assert.equal(h.video.listenerCount('ended'), 0);
  // No segments after stop, even if the element keeps firing.
  h.video.currentTime += 60;
  h.video.fire('timeupdate');
  assert.equal(h.segments.length, 0);
});

// The pot model (Tom, 2026-10-24), rule 7: charged only for seconds actually
// played. Nothing while paused, nothing after the end.

test('nothing accrues and no segment is sent while paused, however long the pause', () => {
  const h = harness();
  try {
    for (let i = 0; i < 20; i++) h.tick(0.25); // 5 s played, no boundary yet
    assert.equal(h.segments.length, 0);
    // Pause. Browsers fire one timeupdate at the pause with no media delta.
    h.video.paused = true;
    h.video.fire('pause');
    h.tick(0, 0.05);
    // Twenty minutes of wall clock go by while paused: a stray timeupdate
    // carrying no media delta must not accrue the gap.
    h.tick(0, 1200);
    assert.equal(h.tracker.getPlaybackSeconds(), 5);
    assert.equal(h.segments.length, 0);
    assert.equal(h.tracker.getCost().formatted, '$0.0005');
    // Resume: the first update after the pause carries only the media time
    // that played since, and the same session keeps metering.
    h.video.paused = false;
    h.video.fire('play');
    h.tick(0.25, 0.3);
    assert.ok(Math.abs(h.tracker.getPlaybackSeconds() - 5.25) < 1e-9);
    for (let i = 0; i < 3; i++) h.tick(0.25);
    assert.ok(Math.abs(h.tracker.getPlaybackSeconds() - 6) < 1e-9);
    assert.equal(h.segments.length, 1);
  } finally {
    h.tracker.stop();
  }
});

test('after ended nothing accrues and nothing is sent, whatever the element fires', () => {
  const h = harness();
  try {
    for (let i = 0; i < 28; i++) h.tick(0.25); // 7 s, one segment
    assert.equal(h.segments.length, 1);
    h.video.ended = true;
    h.video.fire('ended');
    // A late timeupdate at the end, then an hour of stray updates with the
    // page left open.
    h.tick(0.5, 0.5);
    h.tick(60, 60);
    h.tick(3600, 3600);
    assert.ok(Math.abs(h.tracker.getPlaybackSeconds() - 7) < 1e-9);
    assert.equal(h.segments.length, 1);
  } finally {
    h.tracker.stop();
  }
});

// Rules 2 and 3: every segment answer is read.

test('an active answer is announced and metering continues', async () => {
  const h = harness();
  try {
    h.tick(7, 7);
    await flush();
    assert.equal(h.outcomes.length, 1);
    assert.equal(h.outcomes[0].outcome, 'continue');
    assert.equal(h.outcomes[0].response.status, 'active');
    h.tick(6, 6);
    assert.equal(h.segments.length, 2);
  } finally {
    h.tracker.stop();
  }
});

test('the $2.00 cap answer is a rollover and no further segment goes to that session', async () => {
  const h = harness();
  try {
    h.answers.next = { session_id: 'sess_1', segment_count: 4000, amount_settled: 2.0, status: 'closed', end_reason: 'cap_reached' };
    h.tick(6, 6);
    await flush();
    assert.equal(h.outcomes.length, 1);
    assert.equal(h.outcomes[0].outcome, 'rollover');
    assert.equal(h.outcomes[0].response.end_reason, 'cap_reached');
    // The element keeps playing while the SDK opens a new session; the
    // capped session is sent nothing more even before the SDK tears this
    // tracker down.
    h.tick(6, 6);
    h.tick(6, 6);
    assert.equal(h.segments.length, 1);
    assert.equal(h.tracker.getPlaybackSeconds(), 18);
  } finally {
    h.tracker.stop();
  }
});

test('any other closed answer stops metering that session', async () => {
  const h = harness();
  try {
    h.answers.next = { session_id: 'sess_1', segment_count: 9, amount_settled: 0.1, status: 'closed', end_reason: 'tab_unpaid' };
    h.tick(6, 6);
    await flush();
    assert.equal(h.outcomes[0].outcome, 'closed');
    h.tick(6, 6);
    assert.equal(h.segments.length, 1);
  } finally {
    h.tracker.stop();
  }
});

test('a failed segment call (null answer) keeps metering; the next segment settles it', async () => {
  const h = harness();
  try {
    h.answers.next = null;
    h.tick(6, 6);
    await flush();
    assert.equal(h.outcomes[0].outcome, 'continue');
    h.tick(6, 6);
    assert.equal(h.segments.length, 2);
  } finally {
    h.tracker.stop();
  }
});
