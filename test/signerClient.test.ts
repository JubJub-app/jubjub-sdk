import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SignerClient,
  SignerError,
  buildTokenedUrl,
  parseSignerTokens,
  signerInfoFrom,
} from '../src/core/SignerClient';
import { FundingRequiredError } from '../src/fundingErrors';
import { ContentNotPlayableError } from '../src/streamingErrors';
import { toContentInfo } from '../src/api/ApiClient';

const INFO = { url: 'https://signer.example.com', host: 'mux' as const, playback_id: 'pb_1' };

function fakeFetch(status: number, body: unknown, seen: Array<{ url: string; body: any }> = []) {
  return (async (url: string, init?: { body?: string }) => {
    seen.push({ url, body: init?.body ? JSON.parse(init.body) : null });
    const text = JSON.stringify(body);
    return {
      ok: status < 400,
      status,
      text: async () => text,
      json: async () => body,
    };
  }) as unknown as typeof fetch;
}

test('signerInfoFrom: anything short of a complete https mux signer is no signer', () => {
  assert.equal(signerInfoFrom(undefined), null);
  assert.equal(signerInfoFrom(null), null);
  assert.equal(signerInfoFrom({ url: 'https://s', host: 'mux' }), null);
  assert.equal(signerInfoFrom({ url: 'http://s', host: 'mux', playback_id: 'p' }), null);
  assert.equal(signerInfoFrom({ url: 'https://s', host: 'cloudflare', playback_id: 'p' }), null);
  assert.deepEqual(signerInfoFrom({ url: ' https://s ', host: 'mux', playback_id: 'p' }), INFO && { url: 'https://s', host: 'mux', playback_id: 'p' });
});

test('toContentInfo carries a well-formed signer and drops a malformed one', () => {
  const base = { content_id: 'c', price_per_minute_usdc: 5000, payment_router: '0x1', usdc_address: '0x2', chain_id: 8453 };
  assert.equal('signer' in toContentInfo(base), false, 'no key when the backend sends none');
  assert.equal('signer' in toContentInfo({ ...base, signer: { url: 'https://s', host: 'mux' } }), false);
  assert.deepEqual(toContentInfo({ ...base, signer: INFO }).signer, INFO);
});

test('toContentInfo output without a signer equals the pre-2.2 shape', () => {
  const raw = { content_id: 'c', title: 'T', price_per_minute_usdc: 5000, content_contract: '0xc', payment_router: '0x1', usdc_address: '0x2', chain_id: 8453, gated: false, playback_grant: 'jjg_x' };
  assert.deepEqual(toContentInfo(raw), {
    content_id: 'c', title: 'T', price_per_minute_usdc: 5000, content_contract: '0xc',
    payment_router: '0x1', usdc_address: '0x2', chain_id: 8453, playback_grant: 'jjg_x', gated: false,
  });
});

test('buildTokenedUrl puts the token on the Mux manifest and refuses other hosts', () => {
  assert.equal(buildTokenedUrl('mux', 'pb_1', 'tok'), 'https://stream.mux.com/pb_1.m3u8?token=tok');
  assert.throws(() => buildTokenedUrl('cloudflare', 'pb', 't'), SignerError);
});

test('parseSignerTokens refuses an answer without a video token', () => {
  assert.throws(() => parseSignerTokens({ host: 'mux', playback_id: 'pb', tokens: {} }), SignerError);
  const t = parseSignerTokens({ host: 'mux', playback_id: 'pb', tokens: { v: 'v' }, expires_in: 600, renew_after: 480, renewal: 'r' });
  assert.equal(t.expiresIn, 600);
  assert.equal(t.renewAfter, 480);
  assert.equal(t.renewal, 'r');
});

test('fetchTokens posts the SIWE proof once, then the renewal credential', async () => {
  const seen: Array<{ url: string; body: any }> = [];
  const client = new SignerClient(INFO, fakeFetch(200, { host: 'mux', playback_id: 'pb_1', tokens: { v: 'v1' }, expires_in: 600, renewal: 'r1' }, seen));
  const first = await client.fetchTokens({ contentId: 'c', wallet: '0xabc', proof: { message: 'm', signature: 's' } });
  assert.equal(first.tokens.v, 'v1');
  assert.equal(seen[0].url, 'https://signer.example.com/token');
  assert.deepEqual(seen[0].body, { content_id: 'c', wallet: '0xabc', message: 'm', signature: 's', aud: ['v'], native: false });
  await client.fetchTokens({ contentId: 'c', wallet: '0xabc', proof: { renewal: first.renewal! } });
  assert.deepEqual(seen[1].body, { content_id: 'c', wallet: '0xabc', renewal: 'r1', aud: ['v'], native: false });
});

test('a 402 from the signer is the SDK funding error, so the existing gate copy applies', async () => {
  const body = { detail: { reason: 'insufficient_allowance', message: 'Viewer cannot fund streaming', required_micro: 500000, allowance_micro: 0, balance_micro: 1000000, spender: '0x1111111111111111111111111111111111111111', token: '0x2', chain_id: 8453 } };
  const client = new SignerClient(INFO, fakeFetch(402, body));
  await assert.rejects(
    client.fetchTokens({ contentId: 'c', wallet: '0xabc', proof: { renewal: 'r' } }),
    (e: unknown) => e instanceof FundingRequiredError && e.reason === 'insufficient_allowance',
  );
});

test('404 is a not-playable error and 401 a signer error with its sentence', async () => {
  await assert.rejects(
    new SignerClient(INFO, fakeFetch(404, {})).fetchTokens({ contentId: 'c', wallet: '0x', proof: { renewal: 'r' } }),
    (e: unknown) => e instanceof ContentNotPlayableError,
  );
  await assert.rejects(
    new SignerClient(INFO, fakeFetch(401, { reason: 'bad_signature' })).fetchTokens({ contentId: 'c', wallet: '0x', proof: { renewal: 'r' } }),
    (e: unknown) => e instanceof SignerError && e.status === 401 && e.reason === 'bad_signature' && /signature/.test(e.message),
  );
});

test('fetchPreview never throws', async () => {
  const failing = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
  assert.equal(await new SignerClient(INFO, failing).fetchPreview('c'), null);
  assert.deepEqual(await new SignerClient(INFO, fakeFetch(200, { tokens: { t: 'tt' } })).fetchPreview('c'), { t: 'tt' });
});
