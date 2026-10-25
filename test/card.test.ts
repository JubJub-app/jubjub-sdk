import { test } from 'node:test';
import assert from 'node:assert/strict';

// 2.4.0: the JubJub card. A viewer whose wallet holds a funded card just
// watches (no approval, no popup); the only prompts are "Top up your card"
// and, with no card, "Get a card" with "Pay from your wallet instead".
// Tom's rules, 2026-10-25 (movie_system_jubjub docs/design/card-rail-api.md).
//
// The pure parts are tested directly. The decision table and the metering
// run the real attach(), ApiClient, Session and CostTracker against a minimal
// fake DOM and a fetch mock shaped exactly like the API doc; only the wallet
// connect, the on-chain approval and the URL refresher are stubbed.

// --- minimal DOM -----------------------------------------------------------
class FakeElement extends EventTarget {
  style: Record<string, string> & { cssText?: string } = {};
  children: any[] = [];
  parentElement: FakeElement | null = null;
  textContent = '';
  attrs: Record<string, string> = {};
  href = '';
  target = '';
  setAttribute(k: string, v: string) { this.attrs[k] = v; }
  hasAttribute(k: string) { return k in this.attrs; }
  appendChild(c: any) {
    if (c.parentElement) c.remove();
    this.children.push(c);
    c.parentElement = this;
    return c;
  }
  insertBefore(c: any) { return this.appendChild(c); }
  remove() {
    if (this.parentElement) {
      this.parentElement.children = this.parentElement.children.filter((x) => x !== this);
      this.parentElement = null;
    }
  }
}

const PAGE_URL = 'https://site.example/watch?v=1';
const g = globalThis as any;
g.window = new EventTarget();
g.location = { href: PAGE_URL, host: 'site.example' };
g.document = Object.assign(new EventTarget(), {
  readyState: 'complete',
  visibilityState: 'visible',
  head: new FakeElement(),
  body: new FakeElement(),
  createElement: () => new FakeElement(),
  getElementById: () => null,
  querySelectorAll: () => [],
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
// The tracker bounds credited media time by wall-clock time: drive both.
let nowMs = 1_000_000;
Date.now = () => nowMs;

class FakeVideo extends FakeElement {
  src = '';
  paused = true;
  ended = false;
  currentTime = 0;
  playbackRate = 1;
  readyState = 4;
  dataset: Record<string, string> = {};
  plays = 0;
  constructor() {
    super();
    new FakeElement().appendChild(this);
  }
  querySelector() { return null; }
  play() {
    this.plays += 1;
    this.paused = false;
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  }
  pause() { this.paused = true; }
  /** Play `seconds` of media in real time and fire timeupdate. */
  tick(seconds: number, wallSeconds = seconds) {
    nowMs += wallSeconds * 1000;
    if (!this.paused && !this.ended) this.currentTime += seconds;
    this.dispatchEvent(new Event('timeupdate'));
  }
}

/** Every element under `root` whose attribute `attr` is set. */
function findAll(root: FakeElement | null, attr: string): FakeElement[] {
  if (!root) return [];
  const out: FakeElement[] = [];
  const walk = (el: FakeElement) => {
    if (el.attrs && attr in el.attrs) out.push(el);
    for (const c of el.children ?? []) walk(c);
  };
  walk(root);
  return out;
}

// --- stubs -----------------------------------------------------------------
import { JubJub } from '../src/JubJub';
import { Approval } from '../src/core/Approval';
import { PlaybackUrlRefresher } from '../src/core/PlaybackUrlRefresher';
import {
  cardOverlayText,
  cardPromptText,
  decideCard,
  oneMinuteMicro,
  parseCardsResponse,
  withReturn,
  type CardInfo,
} from '../src/core/Card';
import { parseCardNotAccepted } from '../src/streamingErrors';

const WALLET = '0x1111111111111111111111111111111111111111';
let approveCalls = 0;
(JubJub.prototype as any)._ensureWallet = async () => WALLET;
(Approval.prototype as any).ensureApproved = async () => {
  approveCalls += 1;
  return false;
};
(PlaybackUrlRefresher.prototype as any).start = () => {};
JubJub.init({ platformKey: 'pk_test_site' });
JubJub.setSessionToken('jj_test');

// --- fetch mock, shaped like card-rail-api.md -------------------------------
type Answer = { status: number; body: any };
interface Call { url: string; method: string; body: any; headers: Record<string, string> }
let calls: Call[] = [];
let playbackInfo: any;
let cardsAnswer: Answer;
let sessionAnswers: Answer[];
let segmentAnswer: any;
let sessionCount = 0;

function card(id: number, balance: number, extra: Partial<CardInfo> = {}): any {
  return {
    token_id: id,
    holder: WALLET,
    balance_micro: balance,
    frozen: false,
    burn_requested_at: 0,
    burnable_at: null,
    edition: 0,
    referrer: null,
    usable: true,
    top_up_url: `https://studio.jubjubapp.com/card/${id}`,
    ...extra,
  };
}

function info(extra: Record<string, unknown> = {}) {
  return {
    content_id: 'cnt_1',
    title: 'A piece',
    price_per_minute_usdc: 0.06,
    content_contract: null,
    payment_router: '0x2222222222222222222222222222222222222222',
    usdc_address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chain_id: 8453,
    ...extra,
  };
}

/** The piece takes cards; one minute at $0.06 is 60000 micro. */
function cardInfo(extra: Record<string, unknown> = {}) {
  return info({
    card_contract: '0x54A689f1A9e8951Db446CDf4E279d47AAe9D7a0a',
    card_accepted: true,
    card_min_mint_usdc: 5.0,
    card_page_url: 'https://studio.jubjubapp.com/card',
    one_minute_micro: 60_000,
    ...extra,
  });
}

function reset(pi: any, cards: any[] = []) {
  calls = [];
  approveCalls = 0;
  sessionCount = 0;
  playbackInfo = pi;
  cardsAnswer = {
    status: 200,
    body: { holder: WALLET, cards, mint_url: 'https://studio.jubjubapp.com/card?site=key_1', site: 'key_1' },
  };
  sessionAnswers = [];
  segmentAnswer = { session_id: 'x', segment_count: 1, amount_settled: 0, status: 'active', end_reason: null };
}

function respond(a: Answer) {
  return {
    ok: a.status >= 200 && a.status < 300,
    status: a.status,
    json: async () => a.body,
    text: async () => JSON.stringify(a.body),
  };
}

g.fetch = async (url: string, init: any = {}) => {
  const method = init.method ?? 'GET';
  const body = init.body ? JSON.parse(init.body) : null;
  calls.push({ url, method, body, headers: init.headers ?? {} });
  if (url.includes('/playback-info')) return respond({ status: 200, body: playbackInfo });
  if (url.includes('/v2/public/cards?holder=')) return respond(cardsAnswer);
  if (url.endsWith('/v2/streaming/sessions') && method === 'POST') {
    const queued = sessionAnswers.shift();
    if (queued) return respond(queued);
    sessionCount += 1;
    const onCard = body?.card_token_id != null;
    return respond({
      status: 200,
      body: {
        session_id: `sess_${sessionCount}`,
        on_chain_session_id: '0xabc',
        ...(onCard ? { rail: 'card', card_token_id: body.card_token_id, card_balance_micro: 2_000_000 } : {}),
      },
    });
  }
  if (url.endsWith('/segment')) return respond({ status: 200, body: segmentAnswer });
  if (url.endsWith('/close')) return respond({ status: 200, body: {} });
  return respond({ status: 404, body: { detail: 'not mocked' } });
};

const sessionOpens = () => calls.filter((c) => c.url.endsWith('/v2/streaming/sessions'));
const cardLookups = () => calls.filter((c) => c.url.includes('/v2/public/cards?holder='));
const segments = () => calls.filter((c) => c.url.endsWith('/segment'));

declare function setImmediate(fn: (...a: any[]) => void): any;
async function settle() {
  for (let i = 0; i < 60; i++) await new Promise((r) => setImmediate(r));
}

/** attach() with a listener on every event the card flow emits. */
async function attachWith(opts: Record<string, unknown> = {}) {
  const video = new FakeVideo();
  const sdk = new JubJub({ showCostOverlay: false, contentId: 'cnt_1', ...opts });
  const seen: Record<string, any[]> = {};
  for (const ev of ['payment:required', 'card:detected', 'card:selected', 'card:low', 'card:empty', 'ready', 'approved']) {
    seen[ev] = [];
    sdk.on(ev, (e: any) => seen[ev].push(e));
  }
  await sdk.attach('cnt_1', video as any);
  return { video, sdk, seen };
}

// ===========================================================================
// Pure: parsing, selection, links, copy
// ===========================================================================

test('card selection: usable and at least one minute, highest balance first', async () => {
  const cards = [card(1, 50_000), card(2, 900_000), card(3, 3_000_000, { frozen: true, usable: false }), card(4, 400_000)];
  const d = await decideCard(cards, 60_000);
  assert.equal(d.kind, 'card');
  assert.equal((d as any).card.token_id, 2, 'the frozen card is richer but not usable');
  assert.deepEqual((d as any).qualifying.map((c: CardInfo) => c.token_id), [2, 4]);
});

test('card selection: onSelectCard picks among qualifying cards only', async () => {
  const cards = [card(1, 900_000), card(2, 400_000), card(5, 10_000)];
  const byId = await decideCard(cards, 60_000, () => 2);
  assert.equal((byId as any).card.token_id, 2);
  const byObj = await decideCard(cards, 60_000, (qs) => qs[1]);
  assert.equal((byObj as any).card.token_id, 2);
  // a card that does not cover a minute is never chosen, whatever the hook says
  const bad = await decideCard(cards, 60_000, () => 5);
  assert.equal((bad as any).card.token_id, 1);
  // a throwing hook keeps the default
  const threw = await decideCard(cards, 60_000, () => { throw new Error('host bug'); });
  assert.equal((threw as any).card.token_id, 1);
  // one qualifying card: the hook is not asked
  let asked = 0;
  await decideCard([card(1, 900_000)], 60_000, () => { asked += 1; return null; });
  assert.equal(asked, 0);
});

test('card selection: cards below a minute are a top-up, none at all is get-a-card', async () => {
  const low = await decideCard([card(1, 59_999), card(2, 10_000)], 60_000);
  assert.equal(low.kind, 'top_up');
  assert.equal((low as any).card.token_id, 1);
  const frozenOnly = await decideCard([card(3, 5_000_000, { frozen: true, usable: false })], 60_000);
  assert.equal(frozenOnly.kind, 'top_up', 'a holder whose card cannot pay is not told to buy another');
  assert.deepEqual(await decideCard([], 60_000), { kind: 'get_card' });
});

test('parseCardsResponse reads the route defensively and sorts by balance', () => {
  const r = parseCardsResponse({
    holder: WALLET,
    cards: [card(1, 10), { token_id: '2', balance_micro: '500', usable: true }, { nope: true }, null],
    mint_url: 'https://studio.jubjubapp.com/card?site=key_1',
    site: 'key_1',
  });
  assert.deepEqual(r.cards.map((c) => c.token_id), [2, 1]);
  assert.equal(r.cards[0].balance_micro, 500);
  assert.equal(r.cards[0].top_up_url, null);
  assert.deepEqual(parseCardsResponse(null), { holder: null, cards: [], mint_url: null, site: null });
});

test('one minute: served one_minute_micro, else the price rounded up', () => {
  assert.equal(oneMinuteMicro({ one_minute_micro: 60_000, price_per_minute_usdc: 1 }), 60_000);
  assert.equal(oneMinuteMicro({ price_per_minute_usdc: 0.0500001 }), 50_001);
  assert.equal(oneMinuteMicro({}), 0);
});

test('return links: & after the mint query, ? on the top-up page', () => {
  assert.equal(
    withReturn('https://studio.jubjubapp.com/card?site=key_1', PAGE_URL),
    'https://studio.jubjubapp.com/card?site=key_1&return=' + encodeURIComponent(PAGE_URL),
  );
  assert.equal(
    withReturn('https://studio.jubjubapp.com/card/7', PAGE_URL),
    'https://studio.jubjubapp.com/card/7?return=' + encodeURIComponent(PAGE_URL),
  );
  assert.equal(withReturn('https://studio.jubjubapp.com/card/7', null), 'https://studio.jubjubapp.com/card/7');
});

test('prompt copy: sentence case, no em dash, no fixed dollar figure', () => {
  const words = [
    cardPromptText('top_up'),
    cardPromptText('top_up', { balanceMicro: 12_000, requiredMicro: 60_000 }),
    cardPromptText('get_card'),
  ];
  for (const t of words) {
    for (const s of [t.title, t.sub, t.linkText, t.action]) {
      assert.ok(!s.includes('—'), s);
      assert.ok(!/[‘’“”]/.test(s), s);
    }
  }
  assert.equal(words[0].title, 'Top up your card');
  assert.equal(words[2].linkText, 'Get a card');
  assert.ok(!/\$\d/.test(words[0].sub + words[2].sub), 'no dollar figure without a backend amount');
  assert.match(words[1].sub, /\$0\.01.*\$0\.06/);
});

test('overlay text: card balance left after the cost so far, and the per-second price', () => {
  const t = cardOverlayText(2_000_000, 0.25, 0.06);
  assert.equal(t.remaining, 'Card $1.75 left');
  assert.equal(t.perSecond, '$0.0010/s');
  assert.equal(cardOverlayText(100_000, 5, 0.06).remainingUsdc, 0, 'never below zero');
});

test('409 card_not_accepted parses; other 409s do not', () => {
  assert.ok(parseCardNotAccepted(409, JSON.stringify({ detail: { reason: 'card_not_accepted' } })));
  assert.equal(parseCardNotAccepted(409, JSON.stringify({ detail: { reason: 'content_not_sellable' } })), null);
  assert.equal(parseCardNotAccepted(402, JSON.stringify({ detail: { reason: 'card_not_accepted' } })), null);
  assert.equal(parseCardNotAccepted(409, 'not json'), null);
});

// ===========================================================================
// attach(): the decision table
// ===========================================================================

test('card_accepted absent (old backend): no cards call, approval runs, body unchanged', async () => {
  reset(info(), [card(1, 5_000_000)]);
  const { seen, sdk } = await attachWith();
  assert.equal(cardLookups().length, 0, 'no cards call');
  assert.equal(approveCalls, 1, 'Step 4 runs');
  assert.equal(seen.ready.length, 1);
  assert.deepEqual(sessionOpens()[0].body, {
    content_id: 'cnt_1',
    viewer_wallet: WALLET,
    viewer_type: 'human',
  }, 'byte-for-byte the pre-card body');
  assert.equal(seen['card:detected'].length, 0);
  await sdk.disconnect();
});

test('card_accepted false: the approve flow, even with payerMode card', async () => {
  for (const payerMode of ['auto', 'card'] as const) {
    reset(cardInfo({ card_accepted: false }), [card(1, 5_000_000)]);
    const { seen, sdk } = await attachWith({ payerMode });
    assert.equal(cardLookups().length, 0);
    assert.equal(approveCalls, 1);
    assert.ok(!('card_token_id' in sessionOpens()[0].body));
    assert.equal(seen.ready.length, 1);
    await sdk.disconnect();
  }
});

test('usable card: no approval call, session opened with card_token_id', async () => {
  reset(cardInfo(), [card(7, 2_500_000), card(8, 30_000)]);
  const { seen, sdk } = await attachWith();
  assert.equal(approveCalls, 0, 'Step 4 skipped entirely');
  assert.equal(seen.approved.length, 0);
  assert.equal(seen['payment:required'].length, 0, 'no prompt');
  assert.equal(seen.ready.length, 1);
  const lookup = cardLookups()[0];
  assert.ok(lookup.url.endsWith(`/v2/public/cards?holder=${WALLET}`));
  assert.equal(lookup.headers['X-JubJub-Platform-Key'], 'pk_test_site', 'the site is named for the referral');
  assert.equal(sessionOpens().length, 1);
  assert.equal(sessionOpens()[0].body.card_token_id, 7);
  assert.equal(seen['card:detected'].length, 1);
  assert.equal(seen['card:detected'][0].cards.length, 2);
  assert.equal(seen['card:selected'][0].token_id, 7);
  await sdk.disconnect();
});

test('several cards: the onSelectCard option overrides the highest balance', async () => {
  reset(cardInfo(), [card(7, 2_500_000), card(9, 900_000)]);
  const { sdk } = await attachWith({ onSelectCard: (cs: CardInfo[]) => cs.find((c) => c.token_id === 9) });
  assert.equal(sessionOpens()[0].body.card_token_id, 9);
  await sdk.disconnect();
});

test('low card: "Top up your card" with the top-up link, nothing opened, nothing approved', async () => {
  reset(cardInfo(), [card(7, 20_000)]);
  const { seen } = await attachWith();
  assert.equal(approveCalls, 0);
  assert.equal(sessionOpens().length, 0);
  assert.equal(seen['payment:required'].length, 1);
  const err = seen['payment:required'][0];
  assert.equal(err.message, 'Top up your card');
  assert.equal(err.card.kind, 'top_up');
  assert.equal(err.card.walletFallback, false);
  assert.equal(err.card.url, 'https://studio.jubjubapp.com/card/7?return=' + encodeURIComponent(PAGE_URL));
  assert.equal(seen['card:low'].length, 1);
  assert.equal(seen['card:low'][0].tokenId, 7);
  assert.equal(seen['card:low'][0].requiredMicro, 60_000);
});

test('no card: one "Get a card" prompt to mint_url&return=, with the wallet fallback', async () => {
  reset(cardInfo(), []);
  const { seen } = await attachWith();
  assert.equal(approveCalls, 0, 'no approval before the viewer chooses the wallet');
  assert.equal(sessionOpens().length, 0);
  assert.equal(seen['payment:required'].length, 1);
  const err = seen['payment:required'][0];
  assert.equal(err.card.kind, 'get_card');
  assert.equal(err.card.linkText, 'Get a card');
  assert.equal(
    err.card.url,
    'https://studio.jubjubapp.com/card?site=key_1&return=' + encodeURIComponent(PAGE_URL),
  );
  assert.equal(err.card.walletFallback, true);
});

test('no card with payerMode card: get-a-card, never the wallet fallback', async () => {
  reset(cardInfo(), []);
  const { seen } = await attachWith({ payerMode: 'card' });
  assert.equal(seen['payment:required'][0].card.walletFallback, false);
  assert.equal(approveCalls, 0);
});

test('payerMode wallet never looks for a card', async () => {
  reset(cardInfo(), [card(7, 5_000_000)]);
  const { sdk } = await attachWith({ payerMode: 'wallet' });
  assert.equal(cardLookups().length, 0);
  assert.equal(approveCalls, 1);
  assert.ok(!('card_token_id' in sessionOpens()[0].body));
  await sdk.disconnect();
});

test('409 card_not_accepted at open: silently the approve flow', async () => {
  reset(cardInfo(), [card(7, 5_000_000)]);
  sessionAnswers = [{ status: 409, body: { detail: { reason: 'card_not_accepted' } } }];
  const { seen, sdk } = await attachWith();
  assert.equal(seen['payment:required'].length, 0, 'no prompt');
  assert.equal(approveCalls, 1, 'the approve flow ran');
  assert.equal(sessionOpens().length, 2);
  assert.equal(sessionOpens()[0].body.card_token_id, 7);
  assert.ok(!('card_token_id' in sessionOpens()[1].body), 'the retry is an ordinary session');
  assert.equal(seen.ready.length, 1);
  await sdk.disconnect();
});

test('402 card_balance_low at open: the top-up prompt from the backend fields', async () => {
  reset(cardInfo(), [card(7, 5_000_000)]);
  sessionAnswers = [{
    status: 402,
    body: { detail: {
      reason: 'card_balance_low',
      message: 'Your card covers less than a minute of this video.',
      token_id: 7,
      required_micro: 60_000,
      balance_micro: 10_000,
      top_up_url: 'https://studio.jubjubapp.com/card/7',
    } },
  }];
  const { seen } = await attachWith();
  const err = seen['payment:required'][0];
  assert.equal(err.message, 'Top up your card');
  assert.equal(err.sub, 'Your card covers less than a minute of this video.');
  assert.equal(err.card.url, 'https://studio.jubjubapp.com/card/7?return=' + encodeURIComponent(PAGE_URL));
  assert.equal(seen['card:low'][0].balanceMicro, 10_000);
  assert.equal(approveCalls, 0);
});

test('402 card_frozen at open: stop with the backend message, no approval, no card link', async () => {
  reset(cardInfo(), [card(7, 5_000_000)]);
  sessionAnswers = [{
    status: 402,
    body: { detail: { reason: 'card_frozen', message: 'This card is frozen by its holder.', token_id: 7 } },
  }];
  const { seen } = await attachWith();
  const err = seen['payment:required'][0];
  assert.equal(err.message, 'This card is frozen by its holder.');
  assert.equal(err.card, undefined);
  assert.equal(approveCalls, 0);
});

// ===========================================================================
// The play harness: the gate's links and the wallet fallback
// ===========================================================================

test('harness: get-a-card gate links in a new tab; "Pay from your wallet instead" runs the approve flow', async () => {
  reset(cardInfo(), []);
  const video = new FakeVideo();
  video.dataset.jubjubContentId = 'cnt_1';
  (JubJub as any)._prepareVideo(video);
  video.dispatchEvent(new Event('play'));
  await settle();

  assert.equal(video.plays, 0, 'nothing plays under the gate');
  const wrapper = video.parentElement;
  const gates = findAll(wrapper, 'data-jubjub-gate');
  assert.equal(gates.length, 1, 'one prompt');
  const link = findAll(gates[0], 'data-jubjub-card-link')[0];
  assert.equal(link.attrs['data-jubjub-card-link'], 'get_card');
  assert.equal(link.textContent, 'Get a card');
  assert.equal(link.target, '_blank');
  assert.equal(link.href, 'https://studio.jubjubapp.com/card?site=key_1&return=' + encodeURIComponent(PAGE_URL));
  const fallback = findAll(gates[0], 'data-jubjub-wallet-fallback')[0];
  assert.equal(fallback.textContent, 'Pay from your wallet instead');

  const lookupsBefore = cardLookups().length;
  fallback.dispatchEvent(new Event('click'));
  await settle();
  assert.equal(approveCalls, 1, "today's approve flow");
  assert.equal(cardLookups().length, lookupsBefore, 'the wallet choice skips the card lookup');
  assert.equal(sessionOpens().length, 1);
  assert.ok(!('card_token_id' in sessionOpens()[0].body));
  assert.equal(video.plays, 1, 'plays once the session is open');
  assert.equal(findAll(wrapper, 'data-jubjub-gate').length, 0, 'the gate is gone');
});

test('harness: payerMode card shows no wallet fallback', async () => {
  reset(cardInfo(), []);
  JubJub.init({ platformKey: 'pk_test_site', payerMode: 'card' });
  try {
    const video = new FakeVideo();
    video.dataset.jubjubContentId = 'cnt_1';
    (JubJub as any)._prepareVideo(video);
    video.dispatchEvent(new Event('play'));
    await settle();
    const gate = findAll(video.parentElement, 'data-jubjub-gate')[0];
    assert.ok(gate);
    assert.equal(findAll(gate, 'data-jubjub-card-link').length, 1);
    assert.equal(findAll(gate, 'data-jubjub-wallet-fallback').length, 0);
  } finally {
    JubJub.init({ platformKey: 'pk_test_site', payerMode: 'auto' });
  }
});

// ===========================================================================
// A card session: metered only while playing; card_empty; cap rollover
// ===========================================================================

test('card session: segments only while playing, none while paused, nothing after ended', async () => {
  reset(cardInfo(), [card(7, 2_500_000)]);
  const { video, sdk } = await attachWith();
  video.paused = false;
  for (let i = 0; i < 28; i++) video.tick(0.25); // 7 s played
  await settle();
  assert.equal(segments().length, 1, 'one six-second segment');

  video.pause();
  for (let i = 0; i < 10; i++) video.tick(0, 5); // 50 s paused
  await settle();
  assert.equal(segments().length, 1, 'no segment while paused');

  video.paused = false;
  for (let i = 0; i < 20; i++) video.tick(0.25); // 5 more: 12 s
  await settle();
  assert.equal(segments().length, 2);

  video.ended = true;
  video.paused = true;
  video.dispatchEvent(new Event('ended'));
  await settle();
  const closes = calls.filter((c) => c.url.endsWith('/close'));
  assert.equal(closes.length, 1, 'ended closes the card session');
  for (let i = 0; i < 40; i++) video.tick(0.25, 0.25);
  await settle();
  assert.equal(segments().length, 2, 'nothing after ended');
  await sdk.disconnect();
});

test('card_empty mid-play: pause and "Top up your card"; the retry reads the card again', async () => {
  reset(cardInfo(), [card(7, 2_500_000)]);
  const { video, sdk, seen } = await attachWith();
  video.paused = false;
  segmentAnswer = { session_id: 'sess_1', segment_count: 9, amount_settled: 0.05, status: 'closed', end_reason: 'card_empty' };
  for (let i = 0; i < 28; i++) video.tick(0.25);
  await settle();

  assert.equal(video.paused, true, 'paused');
  assert.equal(seen['card:empty'].length, 1);
  assert.equal(seen['card:empty'][0].tokenId, 7);
  const prompt = seen['payment:required'].at(-1);
  assert.equal(prompt.message, 'Top up your card');
  assert.equal(prompt.card.kind, 'top_up');
  const gate = findAll(video.parentElement, 'data-jubjub-gate')[0];
  const link = findAll(gate, 'data-jubjub-card-link')[0];
  assert.equal(link.href, 'https://studio.jubjubapp.com/card/7?return=' + encodeURIComponent(PAGE_URL));
  assert.equal(findAll(gate, 'data-jubjub-wallet-fallback').length, 0);

  // nothing more goes to the closed session, even if a frame plays
  const before = segments().length;
  video.paused = false;
  for (let i = 0; i < 28; i++) video.tick(0.25);
  await settle();
  assert.equal(segments().length, before);
  video.pause();

  // the viewer tops up and presses "Try again": the cards are read again
  segmentAnswer = { session_id: 'x', segment_count: 1, amount_settled: 0, status: 'active', end_reason: null };
  const lookups = cardLookups().length;
  findAll(gate, 'data-jubjub-retry')[0].dispatchEvent(new Event('click'));
  await settle();
  assert.equal(cardLookups().length, lookups + 1, 're-read after a top-up');
  assert.equal(sessionOpens().length, 2);
  assert.equal(sessionOpens()[1].body.card_token_id, 7);
  assert.equal(approveCalls, 0);
  await sdk.disconnect();
});

test('cap_reached on a card session: silent rollover with the same card_token_id', async () => {
  reset(cardInfo(), [card(9, 1_000_000), card(7, 2_500_000)]);
  const { video, sdk, seen } = await attachWith();
  assert.equal(sessionOpens()[0].body.card_token_id, 7);
  video.paused = false;
  segmentAnswer = { session_id: 'sess_1', segment_count: 4000, amount_settled: 2.0, status: 'closed', end_reason: 'cap_reached' };
  for (let i = 0; i < 28; i++) video.tick(0.25);
  await settle();
  segmentAnswer = { session_id: 'x', segment_count: 1, amount_settled: 0, status: 'active', end_reason: null };

  assert.equal(sessionOpens().length, 2, 'a new session opened');
  assert.equal(sessionOpens()[1].body.card_token_id, 7, 'the same card');
  assert.equal(cardLookups().length, 1, 'no second lookup on a rollover');
  assert.equal(approveCalls, 0);
  assert.equal(video.paused, false, 'kept playing');
  assert.equal(seen['payment:required'].length, 0, 'silent');
  await sdk.disconnect();
});

test('overlay on a card session shows the card balance left and the per-second price', async () => {
  reset(cardInfo(), [card(7, 2_500_000)]);
  const { video, sdk } = await attachWith({ showCostOverlay: true });
  const cardLine = findAll(video.parentElement?.parentElement ?? null, 'data-jubjub-card');
  assert.equal(cardLine.length, 1);
  assert.equal(cardLine[0].textContent, 'Card $2.00 left · $0.0010/s');
  await sdk.disconnect();

  // the approve rail's chip has no card line
  reset(info(), []);
  const plain = await attachWith({ showCostOverlay: true });
  assert.equal(findAll(plain.video.parentElement?.parentElement ?? null, 'data-jubjub-card').length, 0);
  await plain.sdk.disconnect();
});
