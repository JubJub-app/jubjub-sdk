import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SourceApplier, UnplayableHereError, type SourceEventDetail } from '../src/core/SourceApplier';

// node 20+ has CustomEvent and EventTarget globally; a minimal video stand-in
// built on EventTarget is enough to drive the dispatch path.
class FakeVideo extends EventTarget {
  src = '';
  currentTime = 0;
  paused = true;
  ended = false;
  canPlayTypeAnswer = '';
  canPlayType(_t: string) { return this.canPlayTypeAnswer; }
  load() { queueMicrotask(() => this.dispatchEvent(new Event('loadedmetadata'))); }
  play() { this.paused = false; return Promise.resolve(); }
}

const detail = (renew = false): SourceEventDetail => ({
  url: `https://stream.mux.com/pb.m3u8?token=${renew ? 2 : 1}`,
  tokens: { v: 't' }, expiresIn: 600, playbackId: 'pb', host: 'mux', renew,
});

test('a host that cancels jubjub:source applies the URL itself; the SDK touches nothing', async () => {
  const video = new FakeVideo();
  let seen: SourceEventDetail | null = null;
  video.addEventListener('jubjub:source', (e) => { seen = (e as CustomEvent<SourceEventDetail>).detail; e.preventDefault(); });
  const emitted: SourceEventDetail[] = [];
  const a = new SourceApplier(video as unknown as HTMLVideoElement, (d) => emitted.push(d), null);
  await a.apply(detail());
  assert.equal(seen!.url, detail().url);
  assert.equal(emitted.length, 1);
  assert.equal(video.src, '', 'the SDK did not set src');
});

test('with hls.js: loadSource + attachMedia first, loadSource + startLoad(position) on renewal', async () => {
  const video = new FakeVideo();
  const calls: string[] = [];
  const hls = {
    loadSource: (u: string) => calls.push(`load:${u}`),
    attachMedia: () => calls.push('attach'),
    startLoad: (p?: number) => calls.push(`start:${p}`),
  };
  const a = new SourceApplier(video as unknown as HTMLVideoElement, () => {}, hls);
  await a.apply(detail());
  video.currentTime = 42;
  await a.apply(detail(true));
  assert.deepEqual(calls, ['load:https://stream.mux.com/pb.m3u8?token=1', 'attach', 'load:https://stream.mux.com/pb.m3u8?token=2', 'start:42']);
});

test('an hls.js constructor is instantiated once', async () => {
  const video = new FakeVideo();
  let built = 0;
  class Hls { constructor() { built += 1; } loadSource() {} attachMedia() {} startLoad() {} }
  const a = new SourceApplier(video as unknown as HTMLVideoElement, () => {}, Hls as any);
  await a.apply(detail());
  await a.apply(detail(true));
  assert.equal(built, 1);
});

test('native HLS: video.src is swapped and the position restored', async () => {
  const video = new FakeVideo();
  video.canPlayTypeAnswer = 'maybe';
  video.currentTime = 30;
  video.paused = false;
  const a = new SourceApplier(video as unknown as HTMLVideoElement, () => {}, null);
  await a.apply(detail(true));
  assert.equal(video.src, detail(true).url);
  assert.equal(video.currentTime, 30);
});

test('nothing can play HLS here: fail closed with a named error', async () => {
  const video = new FakeVideo();
  const a = new SourceApplier(video as unknown as HTMLVideoElement, () => {}, null);
  await assert.rejects(a.apply(detail()), UnplayableHereError);
  assert.equal(video.src, '');
});
