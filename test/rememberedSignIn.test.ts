import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDeviceKey,
  forgetSignIn,
  rememberPayload,
  rememberSignIn,
  rememberedWallet,
  resumeSignIn,
  type RememberedRecord,
  type RememberedStore,
} from '../src/rememberedSignIn';
import { connectAndSignIn, mayConnectAndSignIn } from '../src/walletConnectSignIn';

test('one-prompt sign-in is tried only on wallets that identify as Coinbase / Base', () => {
  const req = async () => null;
  assert.equal(mayConnectAndSignIn({ request: req, isCoinbaseWallet: true }), true);
  assert.equal(mayConnectAndSignIn({ request: req, isBaseAccount: true }), true);
  // MetaMask, Rabby, the Farcaster host wallet: the usual connect, then sign.
  assert.equal(mayConnectAndSignIn({ request: req, isMetaMask: true }), false);
  assert.equal(mayConnectAndSignIn({ request: req }), false);
  assert.equal(mayConnectAndSignIn(null), false);
});

const API = 'https://api.example';
const SITE = 'bankrtv.app';
const WALLET = '0x68709311a1999a8861a5ad5b6bb454dfffdc3ddb';
const OTHER = '0x0000000000000000000000000000000000000002';
const DAY = 86_400_000;

function memoryStore(): RememberedStore & { record: RememberedRecord | null } {
  const s = {
    record: null as RememberedRecord | null,
    async get() { return s.record; },
    async put(r: RememberedRecord) { s.record = r; },
    async clear() { s.record = null; },
  };
  return s;
}

function b64urlToBytes(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/**
 * The backend's remembered-session rules, in miniature: the row is bound to
 * the site and wallet it was made on and resumes only with a fresh device
 * signature over the exact payload.
 */
async function fakeBackend(publicJwk: JsonWebKey, opts: { site: string; wallet: string; sessionId: string; expired?: boolean }) {
  const calls: { url: string; body: any; origin: string }[] = [];
  const pub = await crypto.subtle.importKey('jwk', publicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  let revoked = false;
  let lastTs = 0;
  const forOrigin = (origin: string) => async (url: string, init?: any) => {
    const body = JSON.parse(init?.body ?? '{}');
    calls.push({ url, body, origin });
    const action = url.endsWith('/forget') ? 'forget' : 'resume';
    const ok =
      !revoked && !opts.expired &&
      origin === opts.site &&
      body.wallet_address === opts.wallet &&
      body.remembered_session_id === opts.sessionId &&
      body.ts_ms > lastTs &&
      (await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' }, pub, b64urlToBytes(body.signature) as BufferSource,
        new TextEncoder().encode(rememberPayload(action, body.remembered_session_id, body.wallet_address, origin, body.ts_ms)),
      ));
    if (!ok) return { ok: false, status: 401, json: async () => ({}) };
    lastTs = body.ts_ms;
    if (action === 'forget') { revoked = true; return { ok: true, status: 200, json: async () => ({ forgotten: true }) }; }
    return { ok: true, status: 200, json: async () => ({ session_token: 'jj_resumed', profile_id: 'prof_1' }) };
  };
  return { calls, forOrigin, isRevoked: () => revoked };
}

async function signedIn(store = memoryStore(), now = Date.now()) {
  const key = (await createDeviceKey())!;
  await rememberSignIn(key, WALLET, {
    remembered_session_id: 'rs_abc', remembered_until: new Date(now + 30 * DAY).toISOString(),
  }, { store });
  const backend = await fakeBackend(key.publicJwk, { site: SITE, wallet: WALLET, sessionId: 'rs_abc' });
  return { key, store, backend };
}

/** A wallet that counts every request; each one the viewer would see is a prompt. */
function wallet(kind: 'base' | 'metamask' | 'declines') {
  const calls: string[] = [];
  return {
    calls,
    async request({ method, params }: { method: string; params?: any[] }) {
      calls.push(method);
      if (method !== 'wallet_connect') throw new Error(`unexpected ${method}`);
      if (kind === 'metamask') throw Object.assign(new Error('The method "wallet_connect" does not exist / is not available.'), { code: -32601 });
      if (kind === 'declines') throw Object.assign(new Error('User rejected the request.'), { code: 4001 });
      const siwe = params![0].capabilities.signInWithEthereum;
      return {
        accounts: [{
          address: '0x68709311A1999A8861A5aD5b6bb454dFffDC3ddB',
          capabilities: { signInWithEthereum: { message: `${SITE} wants you to sign in...\nNonce: ${siwe.nonce}\nChain ID: ${parseInt(siwe.chainId, 16)}`, signature: '0xsig' } },
        }],
      };
    },
  };
}

const nonceFetch = async () => ({ ok: true, status: 200, json: async () => ({ nonce: 'N0nce123', chain_id: 8453, wallet_built: true, message_to_sign: '' }) });

// ---------------------------------------------------------------------------
// First visit: connect plus one approval
// ---------------------------------------------------------------------------

test('first visit: a wallet with wallet_connect connects and signs in with ONE prompt', async () => {
  const w = wallet('base');
  const proof = await connectAndSignIn(w, API, { fetch: nonceFetch });
  assert.deepEqual(w.calls, ['wallet_connect']);
  assert.equal(proof!.nonce, 'N0nce123');
  assert.match(proof!.message, /Nonce: N0nce123/);
  assert.match(proof!.message, /Chain ID: 8453/);
  assert.equal(proof!.signature, '0xsig');
});

test('first visit: a wallet without wallet_connect falls back with no prompt spent', async () => {
  const w = wallet('metamask');
  assert.equal(await connectAndSignIn(w, API, { fetch: nonceFetch }), null);
  assert.deepEqual(w.calls, ['wallet_connect']); // answered "unsupported", no popup
});

test('first visit: a declined prompt is a refusal, never a silent fallback', async () => {
  await assert.rejects(connectAndSignIn(wallet('declines'), API, { fetch: nonceFetch }), (e: any) => e.code === 4001);
});

test('first visit: an older backend (no wallet-built nonce) falls back without prompting', async () => {
  const w = wallet('base');
  const oldNonce = async () => ({ ok: false, status: 422, json: async () => ({}) });
  assert.equal(await connectAndSignIn(w, API, { fetch: oldNonce }), null);
  assert.deepEqual(w.calls, []);
});

// ---------------------------------------------------------------------------
// Returning visit within 30 days: no prompt
// ---------------------------------------------------------------------------

test('returning visit within 30 days resumes with no wallet prompt', async () => {
  const { store, backend } = await signedIn();
  const w = wallet('base');
  const out = await resumeSignIn(WALLET, { apiUrl: API, host: SITE, store, fetch: backend.forOrigin(SITE) });
  assert.equal(out!.sessionToken, 'jj_resumed');
  assert.deepEqual(w.calls, []);
  // Day 29: still remembered.
  const later = await resumeSignIn(WALLET, {
    apiUrl: API, host: SITE, store, fetch: backend.forOrigin(SITE), now: () => Date.now() + 29 * DAY - 1000,
  });
  assert.ok(later);
});

test('after 30 days the viewer is asked again', async () => {
  const { store, backend } = await signedIn();
  const out = await resumeSignIn(WALLET, {
    apiUrl: API, host: SITE, store, fetch: backend.forOrigin(SITE), now: () => Date.now() + 31 * DAY,
  });
  assert.equal(out, null);
  assert.equal(store.record, null);
  assert.equal(backend.calls.length, 0);
});

// ---------------------------------------------------------------------------
// Switching wallet asks again
// ---------------------------------------------------------------------------

test('switching wallet asks again: the old sign-in is forgotten, locally and on the backend', async () => {
  const { store, backend } = await signedIn();
  const out = await resumeSignIn(OTHER, { apiUrl: API, host: SITE, store, fetch: backend.forOrigin(SITE) });
  assert.equal(out, null);
  assert.equal(store.record, null);
  assert.ok(backend.calls.some((c) => c.url.endsWith('/forget')));
  assert.equal(backend.isRevoked(), true);
  assert.equal(await rememberedWallet({ store }), null);
});

test('disconnect forgets the sign-in; the next visit signs again', async () => {
  const { store, backend } = await signedIn();
  await forgetSignIn({ apiUrl: API, host: SITE, store, fetch: backend.forOrigin(SITE) }, 'disconnect');
  assert.equal(store.record, null);
  assert.equal(backend.isRevoked(), true);
  assert.equal(await resumeSignIn(WALLET, { apiUrl: API, host: SITE, store, fetch: backend.forOrigin(SITE) }), null);
});

// ---------------------------------------------------------------------------
// A session from one site does not work on another
// ---------------------------------------------------------------------------

test("a session from one site doesn't work on another", async () => {
  const { store, backend } = await signedIn();
  // The record is copied to another site (it cannot be, IndexedDB is per
  // origin; this is the backend's half of the guarantee).
  const out = await resumeSignIn(WALLET, { apiUrl: API, host: 'evil.example', store, fetch: backend.forOrigin('evil.example') });
  assert.equal(out, null);
  // Refused for good: dropped so the viewer signs there instead.
  assert.equal(store.record, null);
});

test('another device key cannot resume a stolen session id', async () => {
  const { store, backend } = await signedIn();
  const thief = (await createDeviceKey())!;
  store.record = { ...store.record!, privateKey: thief.privateKey };
  assert.equal(await resumeSignIn(WALLET, { apiUrl: API, host: SITE, store, fetch: backend.forOrigin(SITE) }), null);
});

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

test('the device private key cannot be read out', async () => {
  const key = (await createDeviceKey())!;
  assert.equal(key.privateKey.extractable, false);
  await assert.rejects(crypto.subtle.exportKey('jwk', key.privateKey));
  assert.deepEqual(Object.keys(key.publicJwk).sort(), ['crv', 'kty', 'x', 'y']);
});

test('nothing is remembered when the backend did not remember the sign-in', async () => {
  const store = memoryStore();
  const key = (await createDeviceKey())!;
  assert.equal(await rememberSignIn(key, WALLET, {}, { store }), false);
  assert.equal(store.record, null);
});

test('a transient backend failure keeps the sign-in for next time', async () => {
  const { store } = await signedIn();
  const down = async () => ({ ok: false, status: 503, json: async () => ({}) });
  assert.equal(await resumeSignIn(WALLET, { apiUrl: API, host: SITE, store, fetch: down }), null);
  assert.ok(store.record);
});

test('the payload matches the backend byte for byte', () => {
  assert.equal(
    rememberPayload('resume', 'rs_abc', '0xABC', 'BankrTV.app', 1700000000123.9),
    'jubjub-remembered-sign-in\nresume\nrs_abc\n0xabc\nbankrtv.app\n1700000000123',
  );
});

// ---------------------------------------------------------------------------
// A card mint or top-up signs the viewer in (Tom, 2026-10-25)
// ---------------------------------------------------------------------------

import { redeemSignIn, takeSignInCode } from '../src/rememberedSignIn';

const CODE = 'sic_AbCdEfGh12345678';

test('back from the card page: the code is taken from the fragment and removed from the address bar', () => {
  const replaced: string[] = [];
  const hist = { replaceState: (_d: unknown, _u: string, url?: string) => { replaced.push(url ?? ''); } };
  const code = takeSignInCode({ hash: `#jubjub_sign_in=${CODE}&t=12`, pathname: '/watch/x', search: '?a=1' }, hist);
  assert.equal(code, CODE);
  assert.deepEqual(replaced, ['/watch/x?a=1#t=12']);
  assert.equal(takeSignInCode({ hash: '', pathname: '/', search: '' }, hist), null);
  assert.equal(takeSignInCode({ hash: '#jubjub_sign_in=<script>', pathname: '/', search: '' }, hist), null);
});

test('someone who just minted is signed in with no signature, and remembered here', async () => {
  const store = memoryStore();
  const key = (await createDeviceKey())!;
  const calls: any[] = [];
  const fetch = async (url: string, init?: any) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({
      session_token: 'jj_minted', profile_id: 'prof_1',
      remembered_session_id: 'rs_card', remembered_until: new Date(Date.now() + 30 * DAY).toISOString(),
    }) };
  };
  const w = wallet('base');
  const out = await redeemSignIn(CODE, WALLET, key, { apiUrl: API, host: SITE, store, fetch });
  assert.equal(out!.sessionToken, 'jj_minted');
  assert.deepEqual(w.calls, []); // no wallet prompt at all
  assert.equal(calls[0].url, `${API}/v2/public/viewer-session/redeem`);
  assert.equal(calls[0].body.sign_in_code, CODE);
  assert.deepEqual(Object.keys(calls[0].body.device_public_key).sort(), ['crv', 'kty', 'x', 'y']);
  assert.equal(store.record!.sessionId, 'rs_card'); // the next visit resumes
});

test('a refused code (another wallet, used, expired) falls back to signing', async () => {
  const store = memoryStore();
  const refused = async () => ({ ok: false, status: 401, json: async () => ({}) });
  assert.equal(await redeemSignIn(CODE, OTHER, null, { apiUrl: API, host: SITE, store, fetch: refused }), null);
  assert.equal(store.record, null);
});
