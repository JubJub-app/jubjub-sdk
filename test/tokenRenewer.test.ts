import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TokenRenewer, renewDelaySeconds } from '../src/core/TokenRenewer';
import { FundingRequiredError } from '../src/fundingErrors';

class FakeVideo {
  paused = false;
  ended = false;
  private listeners = new Map<string, Set<() => void>>();
  addEventListener(name: string, fn: () => void) { (this.listeners.get(name) ?? this.listeners.set(name, new Set()).get(name)!).add(fn); }
  removeEventListener(name: string, fn: () => void) { this.listeners.get(name)?.delete(fn); }
  fire(name: string) { for (const fn of this.listeners.get(name) ?? []) fn(); }
  pause() { this.paused = true; }
  listenerCount(name: string) { return this.listeners.get(name)?.size ?? 0; }
}

function fakeTimers() {
  const pending: Array<{ fn: () => void; ms: number; id: number }> = [];
  let id = 0;
  const setT = ((fn: () => void, ms: number) => { pending.push({ fn, ms, id: ++id }); return id; }) as unknown as typeof setTimeout;
  const clearT = ((h: number) => { const i = pending.findIndex((p) => p.id === h); if (i >= 0) pending.splice(i, 1); }) as unknown as typeof clearTimeout;
  return { pending, setT, clearT, runNext: () => { const p = pending.shift(); p?.fn(); return p; } };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

test('renewDelaySeconds: 80% of the lifetime, the signer hint when inside it, never under 5 s', () => {
  assert.equal(renewDelaySeconds(600), 480);
  assert.equal(renewDelaySeconds(600, 300), 300);
  assert.equal(renewDelaySeconds(600, 900), 600);
  assert.equal(renewDelaySeconds(2), 5);
  assert.equal(renewDelaySeconds(NaN), 480);
});

test('start schedules a renewal at 80% and applies the fresh URL', async () => {
  const video = new FakeVideo();
  const t = fakeTimers();
  const applied: string[] = [];
  const r = new TokenRenewer(
    video as unknown as HTMLVideoElement,
    async () => ({ url: 'https://stream.mux.com/pb.m3u8?token=2', expiresIn: 600 }),
    async (u) => { applied.push(u); },
    { onFailure: () => assert.fail('should not fail') },
    t.setT, t.clearT,
  );
  r.start(600);
  assert.equal(t.pending[0].ms, 480_000);
  t.runNext();
  await tick();
  assert.deepEqual(applied, ['https://stream.mux.com/pb.m3u8?token=2']);
  assert.equal(t.pending.length, 1, 'the next renewal is armed');
});

test('a failed renewal pauses the element, gates once, and arms no timer', async () => {
  const video = new FakeVideo();
  const t = fakeTimers();
  const failures: unknown[] = [];
  const r = new TokenRenewer(
    video as unknown as HTMLVideoElement,
    async () => { throw new Error('signer down'); },
    async () => {},
    { onFailure: (e) => failures.push(e) },
    t.setT, t.clearT,
  );
  r.start(600);
  t.runNext();
  await tick();
  assert.equal(video.paused, true);
  assert.equal(failures.length, 1);
  assert.equal(t.pending.length, 0);
});

test('a 402 latches: media errors and plays do not re-ask, a manual renew does', async () => {
  const video = new FakeVideo();
  const t = fakeTimers();
  let calls = 0;
  const r = new TokenRenewer(
    video as unknown as HTMLVideoElement,
    async () => { calls += 1; throw new FundingRequiredError({ reason: 'insufficient_balance', message: 'no' }); },
    async () => {},
    { onFailure: () => {} },
    t.setT, t.clearT,
  );
  r.start(600);
  t.runNext();
  await tick();
  assert.equal(calls, 1);
  video.fire('error');
  video.fire('play');
  await tick();
  assert.equal(calls, 1, 'nothing automatic re-asks a viewer who cannot pay');
  await r.renewNow('manual');
  assert.equal(calls, 2);
});

test('ended suspends the loop and a replay lifts it with an immediate renewal', async () => {
  const video = new FakeVideo();
  const t = fakeTimers();
  let calls = 0;
  const r = new TokenRenewer(
    video as unknown as HTMLVideoElement,
    async () => { calls += 1; return { url: 'u', expiresIn: 600 }; },
    async () => {},
    { onFailure: () => {} },
    t.setT, t.clearT,
  );
  r.start(600);
  video.fire('ended');
  assert.equal(t.pending.length, 0, 'a finished video needs no fresh token');
  video.fire('play');
  await tick();
  assert.equal(calls, 1);
  assert.equal(t.pending.length, 1);
});

test('stop removes every listener and cancels the timer', () => {
  const video = new FakeVideo();
  const t = fakeTimers();
  const r = new TokenRenewer(video as unknown as HTMLVideoElement, async () => ({ url: 'u', expiresIn: 600 }), async () => {}, { onFailure: () => {} }, t.setT, t.clearT);
  r.start(600);
  r.stop();
  assert.equal(t.pending.length, 0);
  for (const n of ['error', 'ended', 'play']) assert.equal(video.listenerCount(n), 0);
});
