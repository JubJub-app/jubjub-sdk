import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FundingRequiredError,
  FundingUnverifiableError,
  fundingMessage,
  parseFundingError,
} from '../src/fundingErrors';
import { ApiClient } from '../src/api/ApiClient';
import { PlaybackUrlRefresher } from '../src/core/PlaybackUrlRefresher';

const SPENDER = '0x1111111111111111111111111111111111111111';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

function body402(reason: string, extra: Record<string, unknown> = {}): string {
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

test('402 insufficient_allowance parses into a FundingRequiredError', () => {
  const err = parseFundingError(402, body402('insufficient_allowance'));
  assert.ok(err instanceof FundingRequiredError);
  const e = err as FundingRequiredError;
  assert.equal(e.reason, 'insufficient_allowance');
  assert.equal(e.status, 402);
  assert.equal(e.retryable, false);
  assert.equal(e.message, 'Viewer cannot fund streaming');
  assert.equal(e.requiredMicro, 500000);
  assert.equal(e.allowanceMicro, 120000);
  assert.equal(e.balanceMicro, 3000000);
  assert.equal(e.spender, SPENDER);
  assert.equal(e.token, USDC);
  assert.equal(e.chainId, 8453);
  const text = fundingMessage(e);
  assert.equal(text.title, 'Approve at least $0.50 USDC for JubJub streaming');
  assert.equal(text.action, 'Approve USDC');
});

test('402 insufficient_balance parses into a FundingRequiredError', () => {
  const err = parseFundingError(
    402,
    body402('insufficient_balance', { allowance_micro: 10000000, balance_micro: 100000 }),
  );
  assert.ok(err instanceof FundingRequiredError);
  const e = err as FundingRequiredError;
  assert.equal(e.reason, 'insufficient_balance');
  assert.equal(e.balanceMicro, 100000);
  assert.equal(fundingMessage(e).title, 'Add at least $0.50 USDC (Base) to your wallet');
  assert.equal(fundingMessage(e).sub, 'Your wallet holds $0.10 USDC. Top up, then try again.');
});

test('503 funding_unverifiable parses into a retryable error', () => {
  const err = parseFundingError(
    503,
    JSON.stringify({ detail: { reason: 'funding_unverifiable', message: 'RPC down' } }),
  );
  assert.ok(err instanceof FundingUnverifiableError);
  assert.equal((err as FundingUnverifiableError).retryable, true);
  assert.equal((err as FundingUnverifiableError).reason, 'funding_unverifiable');
  assert.equal(err!.message, 'RPC down');
});

test('missing, garbled or foreign bodies parse to null, never throw', () => {
  const cases: Array<[number, any]> = [
    [402, ''],
    [402, null],
    [402, undefined],
    [402, '<html>Payment Required</html>'],
    [402, '{"detail": "plain string detail"}'],
    [402, '{"detail": null}'],
    [402, '[]'],
    [402, 'null'],
    [402, '{"detail": {"reason": "something_new"}}'],
    [503, '{"detail": {"reason": "insufficient_allowance"}}'],
    [503, 'Service Unavailable'],
    [500, body402('insufficient_allowance')],
  ];
  for (const [status, text] of cases) {
    assert.equal(parseFundingError(status, text), null, `${status} ${String(text)}`);
  }
});

test('a 402 with bad field types still parses, with safe values', () => {
  const err = parseFundingError(
    402,
    JSON.stringify({
      detail: {
        reason: 'insufficient_allowance',
        required_micro: 'lots',
        allowance_micro: '250000',
        spender: 'not-an-address',
        chain_id: '8453',
      },
    }),
  ) as FundingRequiredError;
  assert.ok(err instanceof FundingRequiredError);
  assert.equal(err.requiredMicro, 500000);
  assert.equal(err.allowanceMicro, 250000);
  assert.equal(err.balanceMicro, null);
  assert.equal(err.spender, null);
  assert.equal(err.token, null);
  assert.equal(err.chainId, 8453);
});

// ---------------------------------------------------------------------------
// ApiClient: the two endpoints throw the typed errors

function stubFetch(status: number, text: string): () => void {
  const g = globalThis as any;
  const original = g.fetch;
  g.fetch = async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
    json: async () => JSON.parse(text),
  });
  return () => {
    g.fetch = original;
  };
}

test('createStreamingSession throws FundingRequiredError on 402', async () => {
  const restore = stubFetch(402, body402('insufficient_allowance'));
  try {
    const api = new ApiClient('https://api.example');
    await assert.rejects(api.createStreamingSession('c1', SPENDER), (err: unknown) => {
      assert.ok(err instanceof FundingRequiredError);
      assert.equal((err as FundingRequiredError).spender, SPENDER);
      return true;
    });
  } finally {
    restore();
  }
});

test('createStreamingSession throws a retryable error on 503 funding_unverifiable', async () => {
  const restore = stubFetch(503, '{"detail":{"reason":"funding_unverifiable","message":"x"}}');
  try {
    const api = new ApiClient('https://api.example');
    await assert.rejects(api.createStreamingSession('c1', SPENDER), (err: unknown) => {
      assert.ok(err instanceof FundingUnverifiableError);
      return true;
    });
  } finally {
    restore();
  }
});

test('a garbled 402 is a plain Error naming the status, not a TypeError', async () => {
  const restore = stubFetch(402, 'Payment Required');
  try {
    const api = new ApiClient('https://api.example');
    await assert.rejects(api.createStreamingSession('c1', SPENDER), (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(!(err instanceof TypeError));
      assert.ok(!(err instanceof FundingRequiredError));
      assert.match((err as Error).message, /Create session failed: 402/);
      return true;
    });
  } finally {
    restore();
  }
});

test('getSessionPlaybackUrl throws FundingRequiredError on 402', async () => {
  const restore = stubFetch(402, body402('insufficient_balance'));
  try {
    const api = new ApiClient('https://api.example');
    await assert.rejects(api.getSessionPlaybackUrl('s1'), (err: unknown) => {
      assert.ok(err instanceof FundingRequiredError);
      assert.equal((err as FundingRequiredError).reason, 'insufficient_balance');
      return true;
    });
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// PlaybackUrlRefresher: a 402 stops playback and does not loop

function fakeVideo() {
  const listeners = new Map<string, Set<() => void>>();
  let pauses = 0;
  const video = {
    paused: false,
    ended: false,
    currentTime: 0,
    src: 'https://cdn.example/v.mp4?sig=1',
    addEventListener(ev: string, fn: () => void) {
      if (!listeners.has(ev)) listeners.set(ev, new Set());
      listeners.get(ev)!.add(fn);
    },
    removeEventListener(ev: string, fn: () => void) {
      listeners.get(ev)?.delete(fn);
    },
    pause() {
      pauses += 1;
      video.paused = true;
    },
    play() {
      return Promise.resolve();
    },
    load() {},
    fire(ev: string) {
      listeners.get(ev)?.forEach((fn) => fn());
    },
    get pauses() {
      return pauses;
    },
  };
  return video;
}

test('the refresher stops on a 402: paused, reported once, no automatic retry', async () => {
  const video = fakeVideo();
  let calls = 0;
  const api = {
    getSessionPlaybackUrl: async () => {
      calls += 1;
      throw parseFundingError(402, body402('insufficient_balance'));
    },
  };
  const failures: unknown[] = [];
  const refresher = new PlaybackUrlRefresher(video as any, api as any, 's1', {
    onFailure: (err) => failures.push(err),
  });
  refresher.start(video.src, 120);
  try {
    const ok = await refresher.refreshNow('ttl');
    assert.equal(ok, false);
    assert.equal(calls, 1);
    assert.equal(video.pauses, 1);
    assert.equal(failures.length, 1);
    assert.ok(failures[0] instanceof FundingRequiredError);

    // A media error (the old URL expiring) and another timer tick must NOT
    // re-ask the backend while the viewer has not acted.
    video.fire('error');
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(await refresher.refreshNow('ttl'), false);
    assert.equal(await refresher.refreshNow('error'), false);
    assert.equal(calls, 1);
    assert.equal(failures.length, 1);

    // The gate's explicit retry (after approving / topping up) does ask once.
    assert.equal(await refresher.refreshNow('manual'), false);
    assert.equal(calls, 2);
  } finally {
    refresher.stop();
  }
});
