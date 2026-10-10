import { type NetworkFlag } from './chains';
import { EventEmitter } from './EventEmitter';
import { FundingRequiredError, FundingUnverifiableError, fundingMessage } from './fundingErrors';
import type { JubJubOptions, JubJubInitConfig, ContentRegistration, ContentInfo, SessionSummary, CostInfo, WalletLike, SearchParams, SearchResponse } from './types';
export declare class JubJub extends EventEmitter {
    private options;
    private api;
    private wallet;
    private approval;
    private session;
    private costTracker;
    private overlay;
    private contentInfo;
    private video;
    private beforeUnloadHandler;
    private visibilityHandler;
    /** Tier-2 only: keeps the short-lived signed URL fresh during playback. */
    private refresher;
    private attachedContentId;
    /** Tier-2 only: mid-playback fail-closed gate (single instance, no stacking). */
    private midPlaybackGate;
    constructor(options?: JubJubOptions);
    /** The package.json version this bundle was built from. */
    static readonly version: string;
    /**
     * The typed funding errors, reachable from the UMD global
     * (`err instanceof JubJub.FundingRequiredError`) as well as the ESM export.
     */
    static readonly FundingRequiredError: typeof FundingRequiredError;
    static readonly FundingUnverifiableError: typeof FundingUnverifiableError;
    /** The gate's exact title/sub/button text for a funding error. */
    static readonly fundingMessage: typeof fundingMessage;
    /**
     * Initialise the SDK. Call once per page. Auto-discovers video elements
     * with `data-jubjub-*` attributes and attaches payment flows.
     */
    static init(config: JubJubInitConfig): void;
    /**
     * Manually attach streaming payments.
     *
     * Accepts a content ID string OR a ContentRegistration object.
     * Backward compatible with all previous signatures.
     */
    /**
     * Search JubJub's whole discoverable catalogue with the key from init().
     * Free. Returns projected public cards (thumbnail_url resolved
     * server-side) plus a next_cursor to page with — null when exhausted.
     *
     * A found card's content_id goes straight into the existing playback
     * flow: set it as data-jubjub-content-id on a <video>, or call
     * JubJub.play(contentId, video).
     */
    /**
     * Hand the SDK a session token the page already holds (see
     * JubJubInitConfig.sessionToken). Pass null to forget it. Applies to every
     * video attached AFTER the call; an instance already mid-flow keeps its own.
     */
    static setSessionToken(token: string | null | undefined): void;
    /**
     * Forget the page-shared wallet so the next play connects afresh. Needed
     * when the host switches provider (init({ provider }) with a different
     * connector, e.g. injected → WalletConnect) or the user disconnects: the
     * SDK caches the first wallet it connected for the life of the page and
     * would otherwise keep signing with it.
     */
    static resetWallet(): void;
    static search(params?: SearchParams): Promise<SearchResponse>;
    static play(contentOrId: string | ContentRegistration, video: HTMLVideoElement, options?: JubJubOptions): JubJub;
    /**
     * Connect a browser-injected wallet (MetaMask, Coinbase Wallet, etc.).
     *
     * The target chain is resolved from the active network flag (defaults
     * to the value passed to JubJub.init(), i.e. 'mainnet' unless the
     * consumer explicitly opted into 'testnet').
     */
    static connectBrowserWallet(network?: NetworkFlag): Promise<WalletLike>;
    /**
     * The EIP-1193 provider for this page (see walletProviders.ts): the host's
     * init({ provider }), else the EIP-6963 wallet named by init({ walletRdns }),
     * else the only wallet, else the one already connected to this site, else
     * window.ethereum with a warning naming every candidate.
     */
    private static _selectWalletProvider;
    private static _autoDiscover;
    /**
     * Mark a video for JubJub payments but DON'T start the payment flow yet.
     * Wait for the user to press play — that triggers wallet connect + session.
     */
    private static _prepareVideo;
    /**
     * The active network for this instance — an explicit per-call
     * `options.network` wins, otherwise the value set at init time.
     * Source of truth for every chain decision made by this instance.
     */
    private _activeNetwork;
    private _ensureWallet;
    private _safeAttach;
    private _autoRegisterAndPlay;
    /**
     * Fail-closed gate. Emits a 'payment:required' signal carrying a user-facing
     * title + sub-message. The play harness keeps the video paused, shows the
     * retry gate, and never falls through to free playback. Used for every
     * pre-payment failure (load/price, wallet, viewer-session, approval,
     * streaming-session) so no JubJub-tagged video plays without secured payment.
     */
    /**
     * Gate on a wallet error with the text for what the wallet said
     * (walletErrors.ts), never "Payment service unavailable". An account the
     * site is not authorised for, or a disconnected wallet, also forgets the
     * page-shared wallet so the retry reconnects instead of signing with the
     * same unauthorised account again.
     */
    private _gateWalletError;
    /**
     * Before signing: is this origin still authorised for `address` on the
     * provider that connected it? No provider (a BYO wallet client) or a
     * provider that cannot answer eth_accounts: proceed, the signature decides.
     * Not listed: ask once more (eth_requestAccounts), then re-check.
     */
    /**
     * Before signing: is this origin still authorised for `address` on the
     * provider that connected it? No provider (a BYO wallet client) or a
     * provider that cannot answer eth_accounts: proceed, the signature decides.
     * Not listed: one fresh permission prompt (wallet_requestPermissions), then
     * re-check; the account the wallet now lists is the one to sign with.
     */
    private _confirmAccountAuthorised;
    private _gatePayment;
    /**
     * Tell the host about a typed funding error before gating. 402 ->
     * 'funding:required' (FundingRequiredError), 503 -> 'funding:unverifiable'
     * (FundingUnverifiableError, retryable). On insufficient_allowance the next
     * attempt approves the spender the backend named.
     */
    private _announceFunding;
    /**
     * Tier-2 mid-playback fail-closed gate. Fired when a gated signed URL can no
     * longer be refreshed (session settled/closed, 403/404). The refresher has
     * already paused the element; here we cover it with the retry gate so it
     * cannot resume on a dead URL. Cost accrual stops automatically — the cost
     * tracker only advances on `timeupdate`, which a paused element never emits,
     * so there's nothing to tear down. Retry attempts ONE more re-resolve: it
     * succeeds only if the session is genuinely still active (otherwise the
     * backend 403s and the gate stays). We NEVER fall back to a durable URL.
     */
    private _gateMidPlayback;
    attach(contentId: string, video: HTMLVideoElement): Promise<void>;
    disconnect(): Promise<SessionSummary>;
    getSession(): {
        id: string;
        onChainId: string;
    } | null;
    getCost(): CostInfo;
    getWallet(): string | null;
    getContentInfo(): ContentInfo | null;
}
