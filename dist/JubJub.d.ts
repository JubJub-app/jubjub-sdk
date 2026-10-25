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
    /**
     * Set once this instance's session has been closed: by the beacon (tab
     * hidden while paused or ended, pagehide, beforeunload), by the media's
     * `ended` event (the SDK closes it at once), or by the backend (a segment
     * answered status "closed", a refresh answered 409 session_capped). Nothing
     * is sent against it again and /close is never called on one the backend
     * closed. The next `play` opens a new session first (_reopenSession) and
     * plays only once it is open. Cleared when attach() completes.
     */
    private sessionClosed;
    /** Bound to the video's `play` alongside the beacon handlers; see attach(). */
    private resumeHandler;
    /** Bound to the video's `ended`: closes the session the moment it ends. */
    private endedHandler;
    /** 'session:end' has gone out for the current session (once per session). */
    private sessionEndEmitted;
    /** A re-open is in flight; a second `play` must not start another. */
    private reopening;
    /** 'jubjub:armed' has gone out for the current attach() (once per arming). */
    private armedDispatched;
    /**
     * The card this instance pays with (2.4.0). Kept across re-opens (cap
     * rollover, replay) so they open with the same card_token_id without
     * reading the cards again; cleared when the card can no longer pay.
     */
    private selectedCard;
    /** The next attach() reads the cards again (after a top-up prompt). */
    private cardReread;
    /** The piece answered 409 card_not_accepted: approve flow from now on. */
    private cardNotAccepted;
    constructor(options?: JubJubOptions);
    /** The package.json version this bundle was built from. */
    static readonly version: string;
    /** The element event names, reachable from the UMD global (2.3.0). */
    static readonly ARMED_EVENT: "jubjub:armed";
    static readonly GATED_EVENT: "jubjub:gated";
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
    /**
     * Step 3: prove the wallet and mint the viewer token (jj_), shared with
     * every later video on the page. Gates and answers false on any failure;
     * true once a token is held. Also called when an open is refused because
     * the held token expired or was revoked (step 5).
     */
    private _mintViewerToken;
    /** Forget the viewer token on this page: the shared copy and this
     * instance's client, so the next open signs a fresh one. */
    private _forgetSessionToken;
    /**
     * 'jubjub:armed' on the element: a streaming session is open and playback
     * may start. Once per attach(); a no-op without an open session, so it can
     * never tell a host to attach a source nothing was paid for.
     */
    /**
     * True only while a streaming session is open: what the play harness
     * requires before it may call video.play() on a paid piece.
     */
    _isArmed(): boolean;
    private _dispatchArmed;
    private _gatePayment;
    /** payerMode for this attempt: the viewer's wallet choice, else the option, else init(). */
    private _payerMode;
    /** A card's hosted top-up page with return= back to this page, or null. */
    private _topUpUrl;
    /** "Top up your card": card:low, then the gate with the top-up link. */
    private _gateTopUp;
    /**
     * Find the card to pay with (2.4.0; after Step 2 and, since 2.4.1, before
     * the Step 3 signature: the cards route is public). Returns the card,
     * or null once it has gated: "Top up your card" (cards, none covering one
     * minute at this price), "Get a card" (none; with "Pay from your wallet
     * instead" in auto mode), or a retry when the cards could not be read.
     */
    private _detectCard;
    /**
     * "Pay from your wallet instead" for a host that renders its own card
     * prompt (err.card.walletFallback): this video runs today's approve flow
     * from now on, starting now.
     */
    payFromWallet(): Promise<void>;
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
    /**
     * Step 4, today's approve flow, unchanged (moved out of attach() in 2.4.0
     * so a card session can skip it and a 409 card_not_accepted can fall back
     * to it): the standing allowance, then any spender a previous 402 named.
     * Gates and answers false on any failure; true once approval is in place.
     */
    private _approveStep;
    /**
     * This instance's session is closed (beacon, ended, cap, backend). Nothing
     * may be sent against it again: no segment (the tracker stops) and no URL
     * refresh (the refresher stops, which also drops its own replay handler so
     * only _reopenSession answers the next `play`). The overlay keeps its final
     * figure. The session object stays so disconnect() can report it.
     */
    private _markSessionClosed;
    /** 'session:end' once per session; disconnect() and the ended close share it. */
    private _emitSessionEnd;
    /**
     * Close the session now, with the seconds played so far: the media's
     * `ended` event (rule 4). Metering stops, POST /close goes out, and
     * 'session:end' is emitted. The session object stays until disconnect()
     * (which will not close it a second time) or the next replay's re-open.
     */
    private _closeSessionNow;
    /**
     * A segment POST answered. 'continue': nothing to do. Otherwise the backend
     * closed the session (rules 2 and 3): stop metering it, mark it closed and
     * never /close it. On the $2.00 cap ('rollover') open a new session quietly
     * while the media keeps playing. Any other closure ('closed': an unpaid tab,
     * the idle sweep) must not leave frames playing against nothing, so while
     * the media is playing the re-open runs now, pausing first; paused or ended
     * media simply waits for the next `play`.
     */
    private _onSegmentOutcome;
    /**
     * A card session's segment came back status "closed", end_reason
     * "card_empty" (2.4.0). The session is already marked closed. card:empty,
     * then, unless the video has ended: pause and show "Top up your card" with
     * the card's top-up link; the retry re-opens, reading the cards again.
     */
    private _cardEmpty;
    /**
     * A card session's segment came back closed for the card (2.4.1):
     * card_frozen, card_closing, card_transferred, card_not_found, or a card_*
     * reason this bundle does not know. The session is already marked closed.
     * The card is dropped and the next open reads the cards again. While the
     * media plays: pause and gate with the backend's words for the reason (no
     * approval, no card link), the retry re-opens. Paused or ended media just
     * waits: the next `play` re-opens, and the cards read then decide.
     */
    private _cardStopped;
    /**
     * The session is closed and the viewer is watching (or wants to): open a
     * new session from the pot. The closed session's tracker, loop and handlers
     * are torn down (disconnect() never /closes a session already closed),
     * attach() runs again (wallet and page token are held, so no prompt; the
     * allowance is read against the floor, the backend re-checks funding and
     * opens a fresh session), and playback carries on only when a session is
     * open. A refusal is shown in the gate with the backend's words, and the
     * retry runs this again.
     *
     * `mode.pauseWhileReopening` (sessionLifecycle.reopenModeFor):
     *   true   a replay after a closed session: pause at once, then resume
     *          from the same position once the new session is open.
     *   false  the $2.00 cap rollover: keep the media playing while the new
     *          session opens; pause and gate only if the open is refused.
     */
    private _reopenSession;
    /**
     * Play from `at` once the element can. On Tier 2 attach() has just set a
     * fresh signed URL, which resets the position, so wait for its metadata
     * and seek back before playing; on Tier 1 the source is untouched.
     */
    private _resumePlayback;
    disconnect(): Promise<SessionSummary>;
    getSession(): {
        id: string;
        onChainId: string;
    } | null;
    getCost(): CostInfo;
    getWallet(): string | null;
    getContentInfo(): ContentInfo | null;
}
