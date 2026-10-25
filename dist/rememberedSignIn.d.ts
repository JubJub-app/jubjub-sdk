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
export declare const REMEMBER_ACTION_RESUME = "resume";
export declare const REMEMBER_ACTION_FORGET = "forget";
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
    publicJwk: {
        kty: string;
        crv: string;
        x: string;
        y: string;
    };
}
/** A new device key, or null when WebCrypto is unavailable (http pages). */
export declare function createDeviceKey(): Promise<DeviceKey | null>;
/** Must match remembered_viewer_session.resume_payload on the backend. */
export declare function rememberPayload(action: string, sessionId: string, wallet: string, host: string, tsMs: number): string;
/** Raw r||s (WebCrypto's ECDSA output), base64url. */
export declare function signWithDevice(privateKey: CryptoKey, payload: string): Promise<string>;
/** IndexedDB, failing soft: any storage error reads as "nothing remembered"
 * and a write that fails just means the viewer signs next visit. */
export declare const indexedDbStore: RememberedStore;
export type FetchLike = (url: string, init?: any) => Promise<{
    ok: boolean;
    status: number;
    json(): Promise<any>;
}>;
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
export declare function rememberedWallet(deps: Pick<RememberDeps, 'store' | 'now'>): Promise<string | null>;
/**
 * Resume the remembered sign-in for `wallet` with no wallet prompt. Null
 * when there is none, it is for another wallet (forgotten: a switch asks
 * again), it has expired, or the backend refuses it (forgotten too). Never
 * throws: a failed resume falls back to signing.
 */
export declare function resumeSignIn(wallet: string, deps: RememberDeps): Promise<Resumed | null>;
/** Keep a fresh sign-in's device key, replacing any earlier one. */
export declare function rememberSignIn(key: DeviceKey, wallet: string, remembered: {
    remembered_session_id?: string | null;
    remembered_until?: string | null;
}, deps: Pick<RememberDeps, 'store'>): Promise<boolean>;
/**
 * Forget this site's remembered sign-in: the local key always, and the
 * backend row when it answers (signed by the same key, best effort).
 */
export declare function forgetSignIn(deps: RememberDeps, reason?: string): Promise<void>;
