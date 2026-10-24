import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient, toSegmentResponse } from '../src/api/ApiClient';
import { isSessionCappedError } from '../src/streamingErrors';
import { segmentOutcome } from '../src/sessionLifecycle';

// The pot model (Tom, 2026-10-24), rule 2: ApiClient.recordSegment reads the
// SegmentResponse body (before 2.2.0 it ignored it). Exercised through a
// stubbed global fetch.

const g = globalThis as any;

function withFetch<T>(impl: (url: string, init?: any) => Promise<any>, run: () => Promise<T>): Promise<T> {
  const prev = g.fetch;
  g.fetch = impl;
  return run().finally(() => {
    g.fetch = prev;
  });
}

function jsonResponse(status: number, body: unknown) {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(text),
    text: async () => text,
  };
}

test('an active segment answer is returned as a SegmentResponse', async () => {
  const api = new ApiClient('https://api.example.test/');
  api.setSessionToken('jj_test');
  const calls: Array<{ url: string; init: any }> = [];
  const resp = await withFetch(
    async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(200, { session_id: 'sess_1', segment_count: 12, amount_settled: 0.006, status: 'active', end_reason: null });
    },
    () => api.recordSegment('sess_1'),
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.example.test/v2/streaming/sessions/sess_1/segment');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer jj_test');
  assert.deepEqual(resp, { session_id: 'sess_1', segment_count: 12, amount_settled: 0.006, status: 'active', end_reason: null });
  assert.equal(segmentOutcome(resp), 'continue');
});

test('the cap answer (200, closed, cap_reached) is returned and reads as a rollover', async () => {
  const api = new ApiClient('https://api.example.test');
  const resp = await withFetch(
    async () => jsonResponse(200, { session_id: 'sess_1', segment_count: 4000, amount_settled: 2.0, status: 'closed', end_reason: 'cap_reached' }),
    () => api.recordSegment('sess_1'),
  );
  assert.equal(resp?.status, 'closed');
  assert.equal(resp?.end_reason, 'cap_reached');
  assert.equal(segmentOutcome(resp), 'rollover');
});

test('a backend that predates end_reason reads as active', async () => {
  const api = new ApiClient('https://api.example.test');
  const resp = await withFetch(
    async () => jsonResponse(200, { session_id: 'sess_1', segment_count: 2, amount_settled: 0.001, status: 'active' }),
    () => api.recordSegment('sess_1'),
  );
  assert.equal(resp?.end_reason, null);
  assert.equal(segmentOutcome(resp), 'continue');
});

test('a failed segment call returns null (metering continues)', async () => {
  const api = new ApiClient('https://api.example.test');
  const errors: unknown[] = [];
  const prevError = console.error;
  console.error = (...a: unknown[]) => { errors.push(a); };
  try {
    const resp = await withFetch(
      async () => jsonResponse(400, { detail: 'Session sess_1 is not active' }),
      () => api.recordSegment('sess_1'),
    );
    assert.equal(resp, null);
    assert.equal(segmentOutcome(resp), 'continue');
    assert.equal(errors.length, 1);
  } finally {
    console.error = prevError;
  }
});

test('toSegmentResponse never throws and fills neutral values', () => {
  assert.deepEqual(toSegmentResponse('s', null), { session_id: 's', segment_count: 0, amount_settled: 0, status: 'active', end_reason: null });
  assert.deepEqual(toSegmentResponse('s', 'garbage'), { session_id: 's', segment_count: 0, amount_settled: 0, status: 'active', end_reason: null });
  assert.equal(toSegmentResponse('s', { status: 'closed', end_reason: 'cap_reached' }).end_reason, 'cap_reached');
  assert.equal(toSegmentResponse('s', { end_reason: 42 }).end_reason, null);
});

test('a 409 session_capped from playback-url is thrown typed (Tier 2 rollover)', async () => {
  const api = new ApiClient('https://api.example.test');
  await withFetch(
    async () => jsonResponse(409, { detail: { reason: 'session_capped', code: 'session_capped', message: 'This session reached its per-session limit. Start a new one to keep watching.' } }),
    async () => {
      await assert.rejects(
        () => api.getSessionPlaybackUrl('sess_1'),
        (err: unknown) => isSessionCappedError(err),
      );
    },
  );
});
