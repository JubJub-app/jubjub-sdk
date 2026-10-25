/**
 * Remembered sign-in (2.5.0): a viewer who proved their wallet on this site
 * is not asked to sign again here for 30 days (Tom, 2026-10-25, option 1 in
 * movie_system_jubjub docs/design/invisible-sign-in.md).
 *
 * WHAT IS KEPT, AND WHERE. A P-256 key pair made with WebCrypto, private key
 * `extractable: false`, stored in THIS site's IndexedDB with the remembered
 * session id and the wallet it belongs to. Script on the page can ask the
 * browser to sign with it; nothing can read it out, so a copied database,
 * log or token cannot sign in somewhere else. IndexedDB is per origin, so
 * another site never sees it; the backend also refuses a resume whose Origin
 * differs from the one the sign-in was made on.
 *
 * Never localStorage, never the token itself: the only thing that resumes is
 * a fresh signature from the device key. No IndexedDB (a private window,
 * blocked storage): nothing is remembered and the viewer signs each visit,
 * exactly as before.
 *
 * Pure apart from the default store and WebCrypto: the store and the fetch
 * are injectable, so the whole flow is unit-tested (test/rememberedSignIn.test.ts).
 */

export const REMEMBER_ACTION_RESUME = 'resume';
export const REMEMBER_ACTION_FORGET = 'forget';

/** One remembered sign-in on this site. */
export interface RememberedRecord {
  /** rs_... from the backend. */
  sessionId: string;
  /** Lowercase 0x address the sign-in proved. */
  wallet: string;
  /** ISO time the backend will stop honouring it (30 days from sign-in). */
  expiresAt: string;
  /** The device key. The private half is non-extractable. */
  privateKey: CryptoKey;
}

/** Where records live. The default is IndexedDB; tests pass a Map. */
export interface RememberedStore {
  get(): Promise<RememberedRecord | null>;
  put(record: RememberedRecord): Promise<void>;
  clear(): Promise<void>;
}

export interface DeviceKey {
  privateKey: CryptoKey;
  publicJwk: { kty: string; crv: string; x: string; y: string };
}

function subtle(): SubtleCrypto | null {
  const c = (globalThis as any).crypto;
  return c && c.subtle ? (c.subtle as SubtleCrypto) : null;
}

/** A new device key, or null when WebCrypto is unavailable (http pages). */
export async function createDeviceKey(): Promise<DeviceKey | null> {
  const s = subtle();
  if (!s) return null;
  try {
    const pair = (await s.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, // the PRIVATE key is non-extractable; a public key always is
      ['sign', 'verify'],
    )) as CryptoKeyPair;
    const jwk = (await s.exportKey('jwk', pair.publicKey)) as JsonWebKey;
    if (!jwk.x || !jwk.y) return null;
    return {
      privateKey: pair.privateKey,
      publicJwk: { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y },
    };
  } catch {
    return null;
  }
}

/** Must match remembered_viewer_session.resume_payload on the backend. */
export function rememberPayload(
  action: string,
  sessionId: string,
  wallet: string,
  host: string,
  tsMs: number,
): string {
  return `jubjub-remembered-sign-in\n${action}\n${sessionId}\n${wallet.toLowerCase()}\n${host.toLowerCase()}\n${Math.trunc(tsMs)}`;
}

function b64url(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Raw r||s (WebCrypto's ECDSA output), base64url. */
export async function signWithDevice(privateKey: CryptoKey, payload: string): Promise<string> {
  const s = subtle();
  if (!s) throw new Error('WebCrypto unavailable');
  const sig = await s.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(payload));
  return b64url(sig);
}

// ---------------------------------------------------------------------------
// The default store: one record per site, in IndexedDB
// ---------------------------------------------------------------------------

const DB_NAME = 'jubjub-sdk';
const STORE = 'remembered-sign-in';
const KEY = 'current';

function idb(): IDBFactory | null {
  try {
    return typeof indexedDB !== 'undefined' ? indexedDB : null;
  } catch {
    return null;
  }
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const f = idb();
    if (!f) return reject(new Error('no IndexedDB'));
    const req = f.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      t.oncomplete = () => resolve(req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

/** IndexedDB, failing soft: any storage error reads as "nothing remembered"
 * and a write that fails just means the viewer signs next visit. */
export const indexedDbStore: RememberedStore = {
  async get() {
    try {
      const r = (await tx('readonly', (s) => s.get(KEY))) as RememberedRecord | undefined;
      return r && typeof r.sessionId === 'string' && r.privateKey ? r : null;
    } catch {
      return null;
    }
  },
  async put(record) {
    try {
      await tx('readwrite', (s) => s.put(record, KEY));
    } catch {
      /* not remembered; nothing else changes */
    }
  },
  async clear() {
    try {
      await tx('readwrite', (s) => s.delete(KEY));
    } catch {
      /* nothing to clear */
    }
  },
};

// ---------------------------------------------------------------------------
// Resume and forget
// ---------------------------------------------------------------------------

export type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

export interface RememberDeps {
  apiUrl: string;
  /** location.host of the page (lowercased by the payload). */
  host: string;
  store?: RememberedStore;
  fetch?: FetchLike;
  now?: () => number;
  log?: (m: string, ...d: unknown[]) => void;
}

export interface Resumed {
  sessionToken: string;
  profileId: string;
  wallet: string;
}

/**
 * The remembered wallet on this site, if any and still in date. Lets the
 * connect step choose the plain (silent) connect over the one-prompt
 * sign-in for a returning viewer.
 */
export async function rememberedWallet(deps: Pick<RememberDeps, 'store' | 'now'>): Promise<string | null> {
  const store = deps.store ?? indexedDbStore;
  const rec = await store.get();
  if (!rec) return null;
  if (Date.parse(rec.expiresAt) <= (deps.now ?? Date.now)()) {
    await store.clear();
    return null;
  }
  return rec.wallet;
}

/**
 * Resume the remembered sign-in for `wallet` with no wallet prompt. Null
 * when there is none, it is for another wallet (forgotten: a switch asks
 * again), it has expired, or the backend refuses it (forgotten too). Never
 * throws: a failed resume falls back to signing.
 */
export async function resumeSignIn(wallet: string, deps: RememberDeps): Promise<Resumed | null> {
  const store = deps.store ?? indexedDbStore;
  const doFetch = deps.fetch ?? ((u: string, i?: any) => fetch(u, i));
  const now = deps.now ?? Date.now;
  const log = deps.log ?? (() => {});
  const rec = await store.get();
  if (!rec) return null;
  if (rec.wallet !== wallet.toLowerCase()) {
    log('[JubJub] Remembered sign-in is for another wallet; forgetting it and asking again');
    await forgetSignIn(deps, 'wallet_switch');
    return null;
  }
  if (Date.parse(rec.expiresAt) <= now()) {
    await store.clear();
    return null;
  }
  try {
    const ts = now();
    const signature = await signWithDevice(
      rec.privateKey,
      rememberPayload(REMEMBER_ACTION_RESUME, rec.sessionId, rec.wallet, deps.host, ts),
    );
    const res = await doFetch(`${deps.apiUrl}/v2/public/viewer-session/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        remembered_session_id: rec.sessionId,
        wallet_address: rec.wallet,
        ts_ms: ts,
        signature,
      }),
    });
    if (res.status === 401 || res.status === 403) {
      // Expired, forgotten elsewhere, wrong site: this record will never
      // work again. Drop it so the next attempt signs.
      log(`[JubJub] Remembered sign-in refused (${res.status}); signing in again`);
      await store.clear();
      return null;
    }
    if (!res.ok) return null; // transient: keep it, sign this time
    const data = await res.json();
    if (!data?.session_token) return null;
    return { sessionToken: data.session_token, profileId: data.profile_id, wallet: rec.wallet };
  } catch (e) {
    log('[JubJub] Remembered sign-in could not resume', e);
    return null;
  }
}

/** Keep a fresh sign-in's device key, replacing any earlier one. */
export async function rememberSignIn(
  key: DeviceKey,
  wallet: string,
  remembered: { remembered_session_id?: string | null; remembered_until?: string | null },
  deps: Pick<RememberDeps, 'store'>,
): Promise<boolean> {
  if (!remembered?.remembered_session_id || !remembered.remembered_until) return false;
  await (deps.store ?? indexedDbStore).put({
    sessionId: remembered.remembered_session_id,
    wallet: wallet.toLowerCase(),
    expiresAt: remembered.remembered_until,
    privateKey: key.privateKey,
  });
  return true;
}

/**
 * Forget this site's remembered sign-in: the local key always, and the
 * backend row when it answers (signed by the same key, best effort).
 */
export async function forgetSignIn(deps: RememberDeps, reason = 'viewer'): Promise<void> {
  const store = deps.store ?? indexedDbStore;
  const rec = await store.get();
  await store.clear();
  if (!rec) return;
  try {
    const ts = (deps.now ?? Date.now)();
    const signature = await signWithDevice(
      rec.privateKey,
      rememberPayload(REMEMBER_ACTION_FORGET, rec.sessionId, rec.wallet, deps.host, ts),
    );
    await (deps.fetch ?? ((u: string, i?: any) => fetch(u, i)))(`${deps.apiUrl}/v2/public/viewer-session/forget`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        remembered_session_id: rec.sessionId,
        wallet_address: rec.wallet,
        ts_ms: ts,
        signature,
        reason,
      }),
    });
  } catch {
    /* the local key is gone; the row expires on its own */
  }
}
