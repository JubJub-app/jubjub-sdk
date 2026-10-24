import { test } from 'node:test';
import assert from 'node:assert/strict';

// 2.3.0: the SDK tells the <video> element itself when payment is secured
// ('jubjub:armed') and when it is refused ('jubjub:gated'). JubJub's own
// players keep a paid Tier 1 piece's URL OFF the element and set it only on
// 'jubjub:armed', so a missing or broken SDK can never mean free playback.
// These tests run the real attach() and play harness against a minimal fake
// DOM, with the network, wallet, approval and session stubbed.

// --- minimal DOM -----------------------------------------------------------
class FakeElement extends EventTarget {
  style: Record<string, string> & { cssText?: string } = {};
  children: any[] = [];
  parentElement: FakeElement | null = null;
  textContent = '';
  attrs: Record<string, string> = {};
  setAttribute(k: string, v: string) { this.attrs[k] = v; }
  appendChild(c: any) { this.children.push(c); c.parentElement = this; return c; }
  insertBefore(c: any) { return this.appendChild(c); }
  remove() {
    if (this.parentElement) {
      this.parentElement.children = this.parentElement.children.filter((x) => x !== this);
    }
  }
}

const g = globalThis as any;
g.window = new EventTarget();
g.document = Object.assign(new EventTarget(), {
  readyState: 'complete',
  visibilityState: 'visible',
  head: new FakeElement(),
  body: new FakeElement(),
  createElement: () => new FakeElement(),
  getElementById: () => null,
});
g.getComputedStyle = () => ({ position: 'relative' });
for (const name of ['setTimeout', 'setInterval']) {
  const real = g[name];
  g[name] = (...args: any[]) => {
    const h = real(...args);
    h?.unref?.();
    return h;
  };
}

/**
 * A <video> with NO source: readyState 0, networkState 0, and reading
 * `duration` throws, so any setup step that needed the media loaded fails.
 */
class FakeVideo extends FakeElement {
  src = '';
  paused = true;
  ended = false;
  currentTime = 0;
  readyState = 0;
  networkState = 0;
  dataset: Record<string, string> = {};
  durationReads = 0;
  plays: Array<{ src: string; armedSeen: number }> = [];
  armed: any[] = [];
  gatedEvents: any[] = [];
  constructor() {
    super();
    new FakeElement().appendChild(this);
    this.addEventListener('jubjub:armed', (e: any) => this.armed.push(e.detail));
    this.addEventListener('jubjub:gated', (e: any) => this.gatedEvents.push(e.detail));
  }
  get duration(): number {
    this.durationReads += 1;
    throw new Error('duration read on a video with no source');
  }
  querySelector() { return null; }
  play() {
    this.plays.push({ src: this.src, armedSeen: this.armed.length });
    this.paused = false;
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  }
  pause() { this.paused = true; }
}

// --- stubs (network, wallet, approval, session) ------------------------------
import { JubJub } from '../src/JubJub';
import { ApiClient } from '../src/api/ApiClient';
import { Approval } from '../src/core/Approval';
import { Session } from '../src/core/Session';
import { PlaybackUrlRefresher } from '../src/core/PlaybackUrlRefresher';
import { JUBJUB_ARMED_EVENT, JUBJUB_GATED_EVENT } from '../src/index';

let playbackInfo: any = null;
let playbackInfoError: unknown = null;
const SIGNED_URL = 'https://cdn.example/signed.m3u8?sig=x';

(ApiClient.prototype as any).getPlaybackInfo = async () => {
  if (playbackInfoError) throw playbackInfoError;
  return playbackInfo;
};
(ApiClient.prototype as any).getSessionPlaybackUrl = async () => ({ url: SIGNED_URL, expiresInSeconds: 300 });
(JubJub.prototype as any)._ensureWallet = async () => '0x1111111111111111111111111111111111111111';
(Approval.prototype as any).ensureApproved = async () => false;
(PlaybackUrlRefresher.prototype as any).start = () => {};
(Session as any).create = async () => ({
  id: 'sess_1',
  onChainId: null,
  close: async () => {},
  beaconClose: () => {},
});
JubJub.setSessionToken('jj_test');

function info(gated: boolean) {
  return {
    content_id: 'cnt_1',
    title: 'A piece',
    price_per_minute_usdc: 0.05,
    content_contract: null,
    payment_router: '0x2222222222222222222222222222222222222222',
    usdc_address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chain_id: 8453,
    gated,
  };
}

function reset(gated: boolean) {
  playbackInfo = info(gated);
  playbackInfoError = null;
}

/** Wait for queued promise work (the harness's awaits) to drain. */
async function settle() {
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
}

declare function setImmediate(fn: (...a: any[]) => void): any;

test('the event names are exported and on the UMD class', () => {
  assert.equal(JUBJUB_ARMED_EVENT, 'jubjub:armed');
  assert.equal(JUBJUB_GATED_EVENT, 'jubjub:gated');
  assert.equal(JubJub.ARMED_EVENT, 'jubjub:armed');
  assert.equal(JubJub.GATED_EVENT, 'jubjub:gated');
});

test('Tier 1 with no source: attach() arms once, before ready, without touching the media', async () => {
  reset(false);
  const video = new FakeVideo();
  const sdk = new JubJub({ showCostOverlay: false, contentId: 'cnt_1' });
  let armedAtReady = -1;
  sdk.on('ready', () => { armedAtReady = video.armed.length; });
  await sdk.attach('cnt_1', video as any);

  assert.deepEqual(video.armed, [{ contentId: 'cnt_1', gated: false }]);
  assert.equal(armedAtReady, 1, "'jubjub:armed' goes out before 'ready'");
  assert.equal(video.src, '', 'Tier 1: the SDK never sets a source');
  assert.equal(video.durationReads, 0, 'nothing before ready needs the media loaded');
  assert.equal(video.gatedEvents.length, 0);
  await sdk.disconnect();
});

test('Tier 2: armed after the signed URL is on the element, gated flag true', async () => {
  reset(true);
  const video = new FakeVideo();
  let srcAtArmed = '';
  video.addEventListener('jubjub:armed', () => { srcAtArmed = video.src; });
  const sdk = new JubJub({ showCostOverlay: false, contentId: 'cnt_1' });
  await sdk.attach('cnt_1', video as any);
  assert.deepEqual(video.armed, [{ contentId: 'cnt_1', gated: true }]);
  assert.equal(srcAtArmed, SIGNED_URL);
  await sdk.disconnect();
});

test('a refusal dispatches jubjub:gated with the gate words and never arms', async () => {
  reset(false);
  playbackInfoError = new Error('404');
  const video = new FakeVideo();
  const sdk = new JubJub({ showCostOverlay: false, contentId: 'cnt_1' });
  let required = 0;
  sdk.on('payment:required', () => { required += 1; });
  await sdk.attach('cnt_1', video as any);
  assert.equal(required, 1);
  assert.deepEqual(video.gatedEvents, [{
    contentId: 'cnt_1',
    title: 'Unable to load payment details',
    sub: "We couldn't load this video's payment info. Please try again.",
  }]);
  assert.equal(video.armed.length, 0);
});

test('a re-arm after the session closed dispatches armed again, once', async () => {
  reset(false);
  const video = new FakeVideo();
  const sdk = new JubJub({ showCostOverlay: false, contentId: 'cnt_1' });
  await sdk.attach('cnt_1', video as any);
  assert.equal(video.armed.length, 1);
  (sdk as any)._markSessionClosed();
  await (sdk as any)._reopenSession();
  assert.equal(video.armed.length, 2);
  // the dispatch is once per arming
  (sdk as any)._dispatchArmed();
  assert.equal(video.armed.length, 2);
  await sdk.disconnect();
});

// The harness's 15 s safety timeout and the cost tracker's display interval
// must not keep the test process alive: every timer is unref'd.
async function withoutLongTimers<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}
test('declarative: a host that sets the Tier 1 source on armed plays it, armed before play()', async () => {
  reset(false);
  await withoutLongTimers(async () => {
    const video = new FakeVideo();
    video.dataset.jubjubContentId = 'cnt_1';
    const HELD_BACK = 'https://creator.example/cast.m3u8';
    // The host: no source until the SDK says payment is secured.
    video.addEventListener('jubjub:armed', () => { if (!video.src) video.src = HELD_BACK; });
    (JubJub as any)._prepareVideo(video);
    video.dispatchEvent(new Event('play')); // the viewer presses play
    await settle();

    assert.equal(video.armed.length, 1, 'armed exactly once');
    assert.deepEqual(video.armed[0], { contentId: 'cnt_1', gated: false });
    assert.equal(video.plays.length, 1, 'the SDK resumes once');
    assert.equal(video.plays[0].armedSeen, 1, 'armed went out before video.play()');
    assert.equal(video.plays[0].src, HELD_BACK, 'the source was on the element when play() ran');
    assert.equal(video.gatedEvents.length, 0);
  });
});

test('declarative: a refusal gates once and never arms', async () => {
  reset(false);
  playbackInfoError = new Error('unreachable');
  await withoutLongTimers(async () => {
    const video = new FakeVideo();
    video.dataset.jubjubContentId = 'cnt_1';
    (JubJub as any)._prepareVideo(video);
    video.dispatchEvent(new Event('play'));
    await settle();

    assert.equal(video.armed.length, 0);
    assert.equal(video.plays.length, 0, 'no play() under a gate');
    assert.equal(video.gatedEvents.length, 1, 'one jubjub:gated, not one from the SDK and one from the harness');
    assert.equal(video.gatedEvents[0].title, 'Unable to load payment details');
    assert.equal(video.src, '');
  });
});
