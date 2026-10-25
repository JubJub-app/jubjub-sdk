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
    [402, '{"detail": {}}'],
    [402, '{"detail": {"reason": "", "message": "   "}}'],
    [402, '{"detail": {"reason": 42}}'],
    [503, '{"detail": {"reason": "insufficient_allowance"}}'],
    [503, '{"detail": {"reason": "something_new", "message": "x"}}'],
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

// ---------------------------------------------------------------------------
// tab_unpaid (backend 2026-10-10): the wallet owes for earlier viewing.
// ---------------------------------------------------------------------------

function bodyTab(short: 'allowance' | 'balance'): string {
  return JSON.stringify({
    detail: {
      reason: 'tab_unpaid',
      code: 'tab_unpaid',
      message: 'You have $1.20 unpaid from earlier viewing.',
      owed_micro: 1200000,
      owed_usd: 1.2,
      required_micro: 1700000,
      required_approval_usd: 1.7,
      short,
      allowance_micro: 500000,
      balance_micro: 5000000,
      spender: SPENDER,
      token: USDC,
      chain_id: 8453,
    },
  });
}

test('402 tab_unpaid parses with the tab and the approval figure', () => {
  const err = parseFundingError(402, bodyTab('allowance'));
  assert.ok(err instanceof FundingRequiredError);
  const e = err as FundingRequiredError;
  assert.equal(e.reason, 'tab_unpaid');
  assert.equal(e.owedMicro, 1200000);
  assert.equal(e.requiredMicro, 1700000);
  assert.equal(e.short, 'allowance');
  assert.equal(e.spender, SPENDER);
  assert.equal(e.needsApproval, true);
});

test('tab_unpaid short on allowance asks to approve the exact figure', () => {
  const e = parseFundingError(402, bodyTab('allowance')) as FundingRequiredError;
  const m = fundingMessage(e);
  assert.equal(m.title, 'You have $1.20 unpaid from earlier viewing');
  assert.equal(m.sub, 'Approve $1.70 to settle it and keep watching.');
  assert.equal(m.action, 'Approve $1.70');
});

test('tab_unpaid short on balance asks for USDC, not an approval', () => {
  const e = parseFundingError(402, bodyTab('balance')) as FundingRequiredError;
  assert.equal(e.needsApproval, false);
  const m = fundingMessage(e);
  assert.equal(m.title, 'You have $1.20 unpaid from earlier viewing');
  assert.match(m.sub, /Add USDC \(Base\) so your wallet holds at least \$1\.70/);
  assert.equal(m.action, 'Try again');
});

test('the older reasons carry no tab fields', () => {
  const e = parseFundingError(402, body402('insufficient_allowance')) as FundingRequiredError;
  assert.equal(e.owedMicro, null);
  assert.equal(e.short, null);
  assert.equal(e.needsApproval, true);
  const b = parseFundingError(402, body402('insufficient_balance')) as FundingRequiredError;
  assert.equal(b.needsApproval, false);
});

// ---------------------------------------------------------------------------
// Forward compatibility (audit bug 18): a 402 reason this bundle predates is
// still a funding refusal, shown in the backend's words, never an approval.
// ---------------------------------------------------------------------------

test('a 402 with an unknown reason parses to reason unknown carrying the backend words', () => {
  const err = parseFundingError(
    402,
    JSON.stringify({
      detail: {
        // card_balance_low was the example here until 2.4.0 made it a known
        // reason; any reason this bundle predates behaves the same.
        reason: 'wallet_paused',
        message: 'Your JubJub card is empty. Top it up to keep watching.',
        required_micro: 250000,
        balance_micro: 10000,
        spender: SPENDER,
        token: USDC,
        chain_id: 8453,
      },
    }),
  );
  assert.ok(err instanceof FundingRequiredError);
  const e = err as FundingRequiredError;
  assert.equal(e.reason, 'unknown');
  assert.equal(e.backendReason, 'wallet_paused');
  assert.equal(e.backendMessage, 'Your JubJub card is empty. Top it up to keep watching.');
  assert.equal(e.message, 'Your JubJub card is empty. Top it up to keep watching.');
  assert.equal(e.status, 402);
  assert.equal(e.retryable, false);
  // Never an approval on a guess, whatever the body carries.
  assert.equal(e.needsApproval, false);
  // The amounts it did send are kept for hosts that know the reason.
  assert.equal(e.requiredMicro, 250000);
  assert.equal(e.balanceMicro, 10000);
  assert.equal(e.spender, SPENDER);
  assert.equal(e.chainId, 8453);
  const m = fundingMessage(e);
  assert.equal(m.title, 'Your JubJub card is empty. Top it up to keep watching.');
  assert.equal(m.sub, 'JubJub refused to start streaming (wallet_paused). Try again once this is resolved.');
  assert.equal(m.action, 'Try again');
});

test('a 402 with a message and no reason is also a funding refusal', () => {
  const e = parseFundingError(
    402,
    JSON.stringify({ detail: { message: 'Streaming is paused for this creator.' } }),
  ) as FundingRequiredError;
  assert.ok(e instanceof FundingRequiredError);
  assert.equal(e.reason, 'unknown');
  assert.equal(e.backendReason, null);
  assert.equal(e.backendMessage, 'Streaming is paused for this creator.');
  assert.equal(e.requiredMicro, 500000);
  const m = fundingMessage(e);
  assert.equal(m.title, 'Streaming is paused for this creator.');
  assert.equal(m.sub, 'JubJub refused to start streaming. Try again once this is resolved.');
});

test('a 402 with a reason and no message gets a generic title naming the reason', () => {
  const e = parseFundingError(402, '{"detail": {"reason": "something_new"}}') as FundingRequiredError;
  assert.ok(e instanceof FundingRequiredError);
  assert.equal(e.reason, 'unknown');
  assert.equal(e.backendReason, 'something_new');
  assert.equal(e.backendMessage, null);
  assert.equal(e.message, 'unknown');
  const m = fundingMessage(e);
  assert.equal(m.title, 'Payment refused');
  assert.equal(m.sub, 'JubJub refused to start streaming (something_new). Try again once this is resolved.');
  assert.equal(m.action, 'Try again');
});

test('an over-long backend message is cut before it reaches the gate', () => {
  const long = 'x'.repeat(1000);
  const e = parseFundingError(
    402,
    JSON.stringify({ detail: { reason: 'r'.repeat(500), message: long } }),
  ) as FundingRequiredError;
  assert.equal(e.backendMessage!.length, 200);
  assert.equal(e.backendReason!.length, 200);
  assert.equal(fundingMessage(e).title.length, 200);
});

test('the known reasons carry no backend fields and their copy is unchanged', () => {
  const a = parseFundingError(402, body402('insufficient_allowance')) as FundingRequiredError;
  assert.equal(a.backendReason, null);
  assert.equal(a.backendMessage, null);
  assert.equal(fundingMessage(a).title, 'Approve at least $0.50 USDC for JubJub streaming');
  const t = parseFundingError(402, bodyTab('allowance')) as FundingRequiredError;
  assert.equal(t.backendReason, null);
  assert.equal(fundingMessage(t).action, 'Approve $1.70');
});

test('createStreamingSession throws FundingRequiredError(unknown) on a new 402 reason', async () => {
  const restore = stubFetch(
    402,
    JSON.stringify({ detail: { reason: 'brand_new', message: 'The backend said so.' } }),
  );
  try {
    const api = new ApiClient('https://api.example');
    await assert.rejects(api.createStreamingSession('c1', SPENDER), (err: unknown) => {
      assert.ok(err instanceof FundingRequiredError);
      assert.equal((err as FundingRequiredError).reason, 'unknown');
      assert.equal((err as FundingRequiredError).message, 'The backend said so.');
      return true;
    });
  } finally {
    restore();
  }
});

test('getSessionPlaybackUrl throws FundingRequiredError(unknown) on a new 402 reason', async () => {
  const restore = stubFetch(402, JSON.stringify({ detail: { reason: 'brand_new', message: 'Said so.' } }));
  try {
    const api = new ApiClient('https://api.example');
    await assert.rejects(api.getSessionPlaybackUrl('s1'), (err: unknown) => {
      assert.ok(err instanceof FundingRequiredError);
      assert.equal((err as FundingRequiredError).reason, 'unknown');
      return true;
    });
  } finally {
    restore();
  }
});

test('the refresher treats an unknown 402 reason like any other: paused, reported once, no loop', async () => {
  const video = fakeVideo();
  let calls = 0;
  const api = {
    getSessionPlaybackUrl: async () => {
      calls += 1;
      throw parseFundingError(
        402,
        JSON.stringify({ detail: { reason: 'brand_new', message: 'Said so.' } }),
      );
    },
  };
  const failures: unknown[] = [];
  const refresher = new PlaybackUrlRefresher(video as any, api as any, 's1', {
    onFailure: (err) => failures.push(err),
  });
  refresher.start(video.src, 120);
  try {
    assert.equal(await refresher.refreshNow('ttl'), false);
    assert.equal(video.pauses, 1);
    assert.equal(failures.length, 1);
    assert.equal((failures[0] as FundingRequiredError).reason, 'unknown');
    video.fire('error');
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(await refresher.refreshNow('ttl'), false);
    assert.equal(calls, 1);
    assert.equal(await refresher.refreshNow('manual'), false);
    assert.equal(calls, 2);
  } finally {
    refresher.stop();
  }
});

// --- 2.4.0: card refusals ---------------------------------------------------

function cardBody(reason: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    detail: {
      reason,
      message: 'The backend said why.',
      token_id: 7,
      required_micro: 60000,
      balance_micro: 12000,
      top_up_url: 'https://studio.jubjubapp.com/card/7',
      ...extra,
    },
  });
}

test('402 card reasons parse as known reasons, never unknown, never an approval', () => {
  for (const reason of ['card_balance_low', 'card_frozen', 'card_closing', 'card_transferred', 'card_not_found']) {
    const err = parseFundingError(402, cardBody(reason));
    assert.ok(err instanceof FundingRequiredError, reason);
    const e = err as FundingRequiredError;
    assert.equal(e.reason, reason);
    assert.equal(e.isCardRefusal, true);
    assert.equal(e.needsApproval, false);
    assert.equal(e.backendReason, null);
    assert.equal(e.backendMessage, 'The backend said why.');
    assert.equal(e.tokenId, 7);
    assert.equal(e.topUpUrl, 'https://studio.jubjubapp.com/card/7');
    assert.equal(e.requiredMicro, 60000);
    assert.equal(e.balanceMicro, 12000);
  }
});

test('card_balance_low is the top-up prompt; the others show the backend message', () => {
  const low = fundingMessage(parseFundingError(402, cardBody('card_balance_low')) as FundingRequiredError);
  assert.equal(low.title, 'Top up your card');
  assert.equal(low.sub, 'The backend said why.');
  assert.equal(low.action, 'Try again');
  const lowQuiet = fundingMessage(
    parseFundingError(402, cardBody('card_balance_low', { message: undefined })) as FundingRequiredError,
  );
  assert.equal(lowQuiet.sub, 'Your card holds $0.01. Watching needs at least $0.06. Top up, then try again.');
  const frozen = fundingMessage(parseFundingError(402, cardBody('card_frozen')) as FundingRequiredError);
  assert.equal(frozen.title, 'The backend said why.');
  assert.equal(frozen.action, 'Try again');
  const silent = fundingMessage(
    parseFundingError(402, cardBody('card_transferred', { message: '' })) as FundingRequiredError,
  );
  assert.equal(silent.title, 'This card is no longer in your wallet');
});

test('a card refusal keeps only an https top-up url', () => {
  const e = parseFundingError(402, cardBody('card_balance_low', { top_up_url: 'javascript:alert(1)' })) as FundingRequiredError;
  assert.equal(e.topUpUrl, null);
});

test('unknown reasons still parse as unknown next to the card reasons', () => {
  const e = parseFundingError(402, cardBody('card_something_new')) as FundingRequiredError;
  assert.equal(e.reason, 'unknown');
  assert.equal(e.backendReason, 'card_something_new');
  assert.equal(e.isCardRefusal, false);
  assert.equal(e.tokenId, null);
});

test('a non-card funding error carries no card fields', () => {
  const e = parseFundingError(402, body402('insufficient_allowance')) as FundingRequiredError;
  assert.equal(e.isCardRefusal, false);
  assert.equal(e.tokenId, null);
  assert.equal(e.topUpUrl, null);
});

test('createStreamingSession sends card_token_id only when given, and types 409 card_not_accepted', async () => {
  const realFetch = (globalThis as any).fetch;
  const bodies: any[] = [];
  let answer = { status: 200, body: { session_id: 's1', on_chain_session_id: '0x1', rail: 'card', card_token_id: 7, card_balance_micro: 1500000 } as any };
  (globalThis as any).fetch = async (_url: string, init: any) => {
    bodies.push(JSON.parse(init.body));
    return {
      ok: answer.status === 200,
      status: answer.status,
      json: async () => answer.body,
      text: async () => JSON.stringify(answer.body),
    };
  };
  try {
    const api = new ApiClient('https://api.example');
    const r = await api.createStreamingSession('c1', SPENDER, null, 7);
    assert.equal(bodies[0].card_token_id, 7);
    assert.equal(r.rail, 'card');
    assert.equal(r.cardTokenId, 7);
    assert.equal(r.cardBalanceMicro, 1500000);
    answer = { status: 200, body: { session_id: 's2', on_chain_session_id: '0x2' } };
    const plain = await api.createStreamingSession('c1', SPENDER);
    assert.ok(!('card_token_id' in bodies[1]));
    assert.deepEqual(plain, { sessionId: 's2', onChainSessionId: '0x2' });
    answer = { status: 409, body: { detail: { reason: 'card_not_accepted' } } };
    await assert.rejects(api.createStreamingSession('c1', SPENDER, null, 7), (err: any) => {
      assert.equal(err.name, 'CardNotAcceptedError');
      return true;
    });
  } finally {
    (globalThis as any).fetch = realFetch;
  }
});
