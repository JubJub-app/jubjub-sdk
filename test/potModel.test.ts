import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREFLIGHT_FLOOR_MICRO, needsPreflightApproval } from '../src/allowancePolicy';
import {
  mustReopenNow,
  mustReopenOnPlay,
  reopenModeFor,
  segmentOutcome,
} from '../src/sessionLifecycle';
import { fundingMessage, parseFundingError } from '../src/fundingErrors';
import { PlaybackUrlRefresher } from '../src/core/PlaybackUrlRefresher';
import { SessionCappedError } from '../src/streamingErrors';

// The pot model end to end, as pure decisions (Tom, 2026-10-24). Each scenario
// is the chain of decisions JubJub.ts makes; the DOM parts are exercised by
// the browser, these pin the rules.

const SPENDER = '0x1111111111111111111111111111111111111111';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

function refusal402(reason: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    detail: {
      reason,
      message: 'Viewer cannot fund streaming',
      required_micro: 500000,
      allowance_micro: 120000,
      balance_micro: 3000000,
      spender: SPENDER,
      token: USDC,
      chain_id: 8453,
      ...extra,
    },
  });
}

test('a replay draws from the pot without a prompt', () => {
  // The video ended, so the SDK closed the session. The viewer presses play.
  const closedByEnded = { sessionClosed: true, reopening: false };
  assert.equal(mustReopenOnPlay(closedByEnded), true);
  // The replay pauses first and resumes once the new session is open.
  assert.deepEqual(reopenModeFor('replay'), { pauseWhileReopening: true });
  // The pot still holds $7.30 of the $10 approved: the pre-flight asks for
  // nothing, and the backend (floor $0.50) opens the session.
  assert.equal(needsPreflightApproval(7_300_000n), false);
  // Even the dashboard's $1 approval is enough here.
  assert.equal(needsPreflightApproval(1_000_000n), false);
  // Only a pot below the floor prompts, and then the backend would 402 anyway.
  assert.equal(needsPreflightApproval(PREFLIGHT_FLOOR_MICRO - 1n), true);
});

test('the $2.00 cap rolls over seamlessly when the pot covers it', () => {
  // Segment 4000 would take the session over its cap: the backend closes it
  // at exactly $2.00 and says so.
  const answer = { session_id: 'sess_1', segment_count: 4000, amount_settled: 2.0, status: 'closed', end_reason: 'cap_reached' };
  assert.equal(segmentOutcome(answer), 'rollover');
  // The media is playing, so the SDK acts now, and it keeps playing while
  // the new session opens.
  assert.equal(mustReopenNow({ paused: false, ended: false }), true);
  assert.deepEqual(reopenModeFor('rollover'), { pauseWhileReopening: false });
  // The pot has $8 left: no approval, the open succeeds, metering continues
  // against the new session.
  assert.equal(needsPreflightApproval(8_000_000n), false);
});

test('the cap prompts when the pot cannot cover a new session', () => {
  assert.equal(segmentOutcome({ session_id: 'sess_1', segment_count: 4000, amount_settled: 2.0, status: 'closed', end_reason: 'cap_reached' }), 'rollover');
  // The quiet re-open asks the backend for a session; the pot is down to
  // $0.12, so it answers 402 insufficient_allowance. JubJub.ts then pauses
  // the media and shows this gate with the backend's figures and a retry
  // that approves exactly what the backend named.
  const err = parseFundingError(402, refusal402('insufficient_allowance'));
  assert.ok(err);
  const text = fundingMessage(err!);
  assert.equal(text.title, 'Approve at least $0.50 USDC for JubJub streaming');
  assert.equal(text.sub, 'Your current USDC approval is $0.12. Approve in your wallet to start streaming.');
  assert.equal(text.action, 'Approve USDC');
  assert.equal((err as any).needsApproval, true);
  assert.equal((err as any).spender, SPENDER);
  // A pot that holds the allowance but not the USDC says so too.
  const balance = parseFundingError(402, refusal402('insufficient_balance', { allowance_micro: 10_000_000, balance_micro: 100_000 }));
  assert.equal(fundingMessage(balance!).title, 'Add at least $0.50 USDC (Base) to your wallet');
  assert.equal(fundingMessage(balance!).action, 'Try again');
});

test('the Tier 2 cap (409 session_capped on refresh) does not pause the element', async () => {
  // The refresher pauses on every refusal except the cap: the pot still
  // covers viewing and the SDK is about to roll over, so the frames keep
  // playing on the URL already on the element.
  const events = new Map<string, Set<() => void>>();
  let pauses = 0;
  const video: any = {
    paused: false,
    ended: false,
    currentTime: 42,
    addEventListener(ev: string, fn: () => void) {
      if (!events.has(ev)) events.set(ev, new Set());
      events.get(ev)!.add(fn);
    },
    removeEventListener(ev: string, fn: () => void) { events.get(ev)?.delete(fn); },
    pause() { pauses += 1; },
    play: async () => {},
    load() {},
  };
  const api: any = {
    getSessionPlaybackUrl: async () => { throw new SessionCappedError('This session reached its per-session limit.'); },
  };
  const failures: unknown[] = [];
  const refresher = new PlaybackUrlRefresher(video, api, 'sess_1', { onFailure: (e) => failures.push(e) });
  refresher.start('https://cdn.example.test/v.mp4?sig=1', 120);
  const ok = await refresher.refreshNow('ttl');
  assert.equal(ok, false);
  assert.equal(pauses, 0);
  assert.equal(failures.length, 1);
  assert.ok(failures[0] instanceof SessionCappedError);
  // The loop is finished: its listeners are gone, so nothing re-resolves
  // against the capped session.
  assert.equal(events.get('error')?.size ?? 0, 0);
  assert.equal(events.get('play')?.size ?? 0, 0);
  refresher.stop();
});

test('a 402 on the Tier 2 refresh still pauses (fail closed)', async () => {
  let pauses = 0;
  const video: any = {
    paused: false,
    ended: false,
    currentTime: 1,
    addEventListener() {},
    removeEventListener() {},
    pause() { pauses += 1; },
  };
  const api: any = {
    getSessionPlaybackUrl: async () => { throw parseFundingError(402, refusal402('insufficient_balance')); },
  };
  const failures: unknown[] = [];
  const refresher = new PlaybackUrlRefresher(video, api, 'sess_1', { onFailure: (e) => failures.push(e) });
  refresher.start('https://cdn.example.test/v.mp4', 120);
  assert.equal(await refresher.refreshNow('ttl'), false);
  assert.equal(pauses, 1);
  assert.equal(failures.length, 1);
  refresher.stop();
});

test('a session closed for another reason mid-play pauses and re-opens; paused media waits for play', () => {
  const tabUnpaid = { session_id: 'sess_1', segment_count: 9, amount_settled: 0.1, status: 'closed', end_reason: 'tab_unpaid' };
  assert.equal(segmentOutcome(tabUnpaid), 'closed');
  assert.deepEqual(reopenModeFor('closed'), { pauseWhileReopening: true });
  assert.equal(mustReopenNow({ paused: false, ended: false }), true);
  assert.equal(mustReopenNow({ paused: true, ended: false }), false);
  // Once marked closed, the next play re-opens (and prompts only on 402).
  assert.equal(mustReopenOnPlay({ sessionClosed: true, reopening: false }), true);
});
