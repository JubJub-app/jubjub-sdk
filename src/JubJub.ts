import { createWalletClient, custom } from 'viem';
import { ApiHttpError } from './api/ApiClient';
import {
  classifyWalletError,
  isWalletError,
  markWalletError,
  walletGateMessage,
} from './walletErrors';
import { reconfirmAuthorisedAccount, requestAuthorisedAccount } from './walletAuthorise';
import {
  candidateProviders,
  describeProvider,
  selectProvider,
  startProviderDiscovery,
} from './walletProviders';
import {
  contentNotPlayableMessage,
  isCardNotAcceptedError,
  isContentNotPlayableError,
  isSessionCappedError,
} from './streamingErrors';
import {
  cardPromptText,
  cardStoppedText,
  decideCard,
  isCardEndReason,
  oneMinuteMicro,
  withReturn,
  type CardInfo,
  type CardPrompt,
  type CardsResponse,
  type PayerMode,
  type SelectCardHook,
} from './core/Card';
import { chainForNetwork, type NetworkFlag } from './chains';
/** A card session's segment end_reason when the card ran out (2.4.0). */
const CARD_EMPTY = 'card_empty';
import {
  mustReopenNow,
  mustReopenOnPlay,
  reopenModeFor,
  isAuthRefusal,
  shouldBeaconOnHidden,
  type ReopenMode,
} from './sessionLifecycle';
import {
  chainIdMatches,
  chainMismatchError,
  isChainMismatchError,
  isUserRejection,
} from './walletChain';
import { EventEmitter } from './EventEmitter';
import {
  FundingRequiredError,
  FundingUnverifiableError,
  fundingMessage,
  isFundingRequiredError,
  isFundingUnverifiableError,
} from './fundingErrors';
import { ApiClient } from './api/ApiClient';
import { Wallet } from './core/Wallet';
import { Approval } from './core/Approval';
import { Session } from './core/Session';
import { CostTracker, type SegmentEvent } from './core/CostTracker';
import { PlaybackUrlRefresher } from './core/PlaybackUrlRefresher';
import { CostOverlay } from './ui/CostOverlay';
import { claimUrlFor } from './claim';
import type {
  JubJubOptions,
  JubJubInitConfig,
  ContentRegistration,
  ContentInfo,
  SessionSummary,
  CostInfo,
  WalletLike,
  SearchParams,
  SearchResponse,
  JubJubArmedDetail,
  JubJubGatedDetail,
} from './types';
import { JUBJUB_ARMED_EVENT, JUBJUB_GATED_EVENT } from './types';

const DEFAULT_API_URL = 'https://api.jubjubapp.com';
/** package.json version, injected by vite `define`; see src/build-info.d.ts. */
const SDK_VERSION: string =
  typeof __JUBJUB_VERSION__ === 'string' ? __JUBJUB_VERSION__ : '0.0.0-dev';

// ---------------------------------------------------------------------------
// Module-level state (shared across all JubJub instances on the page)
// ---------------------------------------------------------------------------
let _platformKey: string | null = null;
let _initApiUrl: string = DEFAULT_API_URL;
let _initNetwork: 'testnet' | 'mainnet' = 'mainnet';
let _initShowOverlay = true;
/** Overlay corner captured from init({ overlayPosition }); threaded into every
 *  auto-discovered video via play(). undefined → CostOverlay uses its default. */
let _initOverlayPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | undefined;
/** Standing USDC allowance (whole dollars) approved once, drawn down across
 *  sessions. undefined → Approval uses its bounded default ($10). */
let _initStreamingAllowanceUsd: number | undefined;
/** init({ payerMode, onSelectCard }) (2.4.0); a per-instance option wins. */
let _initPayerMode: PayerMode | undefined;
let _initOnSelectCard: SelectCardHook | undefined;

/**
 * Videos whose viewer pressed "Pay from your wallet instead" on the
 * "Get a card" gate: every later attempt on that element (retries, replays,
 * cap rollovers) runs today's approve flow, as payerMode 'wallet' would.
 */
const _walletChosen = new WeakSet<HTMLVideoElement>();

/** Content registration cache: mediaUrl → content_id */
const _registrationCache = new Map<string, string>();

/** Wallet shared across all videos on the page (connected once). */
let _sharedWallet: WalletLike | null = null;
let _walletConnecting: Promise<WalletLike | null> | null = null;

/** Videos already processed — prevents double-attach. */
const _processed = new WeakSet<HTMLVideoElement>();

/** Debounce timer for MutationObserver. */
let _observerTimer: ReturnType<typeof setTimeout> | null = null;

/** Guard against init() being called twice. */
let _initialized = false;

/**
 * Optional EIP-1193 provider injected via JubJub.init({ provider }).
 * When set, takes precedence over window.ethereum. Required for
 * Farcaster Mini Apps (sdk.wallet.getEthereumProvider()) and any
 * host whose wallet provider isn't exposed on window.
 */
let _injectedProvider: any | null = null;

/**
 * The EIP-1193 provider the page-shared wallet was connected through. Step 3
 * re-checks eth_accounts on THIS object before signing, so the account that
 * answered eth_requestAccounts is the one asked to sign (see walletErrors.ts
 * for the 4100 this prevents). Cleared with the wallet by resetWallet().
 */
let _sharedProvider: any | null = null;

/** init({ walletRdns }): which EIP-6963 wallet to use when several are injected. */
let _initWalletRdns: string | null = null;

/**
 * Session token shared by every video on the page. Set by init({ sessionToken })
 * or JubJub.setSessionToken() when the host already signed the viewer in, and
 * ALSO by the first attach() that mints a viewer token itself — so a page with
 * several videos asks for the wallet signature at most once, host sign-in or
 * not. Cleared when a streaming call rejects it, so the next play re-proves.
 */
let _sessionToken: string | null = null;

/**
 * Set when the backend answered 402 insufficient_allowance: the NEXT attempt's
 * approval step (the gate's retry, or the host calling play again) approves
 * this spender -- the one the backend named, never a hard-coded address -- in
 * the same wallet flow as the standing approval. Cleared once approved.
 */
let _pendingSpenderApproval:
  | {
      spender: string;
      requiredMicro: number;
      token: string | null;
      chainId: number | null;
      // tab_unpaid: approve exactly requiredMicro (the figure the viewer saw).
      exact: boolean;
    }
  | null = null;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const DEFAULTS: Required<
  Omit<JubJubOptions, 'contentId' | 'wallet' | 'sessionToken' | 'onCostUpdate' | 'onSessionStart' | 'onSessionEnd' | 'onError' | 'onWalletConnected' | 'onFundingRequired' | 'payerMode' | 'onSelectCard'>
> & { contentId: string | undefined; wallet: any } = {
  contentId: undefined,
  wallet: undefined,
  apiUrl: DEFAULT_API_URL,
  network: 'mainnet',
  showCostOverlay: true,
  overlayPosition: 'bottom-right',
};

// ---------------------------------------------------------------------------
// Loading indicator shown while payment setup runs
// ---------------------------------------------------------------------------
function _createLoader(video: HTMLVideoElement): { remove: () => void } {
  const el = document.createElement('div');
  el.setAttribute('data-jubjub-loader', 'true');
  el.style.cssText =
    'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
    'z-index:1001;display:flex;align-items:center;gap:8px;' +
    'background:rgba(0,0,0,0.8);color:#fff;padding:8px 16px;' +
    'border-radius:8px;font-family:system-ui,sans-serif;font-size:13px;';

  const spinner = document.createElement('span');
  spinner.style.cssText =
    'display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);' +
    'border-top-color:#fff;border-radius:50%;animation:jubjub-spin 0.8s linear infinite;';
  el.appendChild(spinner);

  const text = document.createElement('span');
  text.textContent = 'Connecting wallet\u2026';
  el.appendChild(text);

  // Inject keyframes if not already present
  if (!document.getElementById('jubjub-spin-style')) {
    const style = document.createElement('style');
    style.id = 'jubjub-spin-style';
    style.textContent = '@keyframes jubjub-spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }

  // Insert into a positioned wrapper (overlay may have created one already)
  let wrapper = video.parentElement;
  if (!wrapper || wrapper === document.body) {
    wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;display:inline-block;width:100%;';
    video.parentElement?.insertBefore(wrapper, video);
    wrapper.appendChild(video);
  }
  if (getComputedStyle(wrapper).position === 'static') {
    wrapper.style.position = 'relative';
  }
  wrapper.appendChild(el);

  return { remove: () => el.remove() };
}

// ---------------------------------------------------------------------------
// DOM signals on the <video> element (2.3.0): 'jubjub:armed' when payment is
// secured and playback may start, 'jubjub:gated' when it is refused. A
// declarative host has no handle on the instance auto-discovery creates, so
// these are how it learns when to attach a Tier 1 source. Never throws: a
// host listener's error or a missing CustomEvent must not break the flow.
// ---------------------------------------------------------------------------
const DEFAULT_GATE_TITLE = 'Payment approval required to watch';
const DEFAULT_GATE_SUB = 'Approve the USDC payment in your wallet to start streaming.';

function _dispatchElementEvent(
  video: HTMLVideoElement | null,
  name: string,
  detail: JubJubArmedDetail | JubJubGatedDetail,
): void {
  if (!video || typeof video.dispatchEvent !== 'function') return;
  try {
    if (typeof CustomEvent !== 'function') return;
    video.dispatchEvent(new CustomEvent(name, { detail }));
  } catch (e) {
    console.warn(`[JubJub] ${name} listener failed`, e);
  }
}

function _dispatchGated(
  video: HTMLVideoElement | null,
  contentId: string | null | undefined,
  title: string | undefined,
  sub: string | undefined,
): void {
  _dispatchElementEvent(video, JUBJUB_GATED_EVENT, {
    contentId: contentId || null,
    title: title || DEFAULT_GATE_TITLE,
    sub: sub || DEFAULT_GATE_SUB,
  });
}

/** A card prompt's extra actions on the gate (2.4.0). */
interface GateExtras {
  link?: { href: string; text: string; kind: string };
  secondary?: { text: string; onClick: () => void };
}

const WALLET_FALLBACK_TEXT = 'Pay from your wallet instead';

/**
 * The gate extras for a card prompt carried on a 'payment:required' error
 * (err.card). `onWallet` runs the approve flow; it is offered only when the
 * prompt says so (payerMode 'auto', no card).
 */
function _cardGateExtras(prompt: CardPrompt | null | undefined, onWallet: () => void): GateExtras | undefined {
  if (!prompt) return undefined;
  const extras: GateExtras = {};
  if (prompt.url) extras.link = { href: prompt.url, text: prompt.linkText, kind: prompt.kind };
  if (prompt.walletFallback) extras.secondary = { text: WALLET_FALLBACK_TEXT, onClick: onWallet };
  return extras.link || extras.secondary ? extras : undefined;
}

/** The page the viewer is on, for the card pages' return= link. */
function _pageUrl(): string | null {
  try {
    return typeof location !== 'undefined' && location.href ? String(location.href) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Payment-required gate shown when approval is rejected / not granted.
// Keeps the video covered (it stays paused) and offers a retry affordance.
// ---------------------------------------------------------------------------
function _createPaymentGate(
  video: HTMLVideoElement,
  onRetry: () => void,
  titleText?: string,
  subText?: string,
  buttonText?: string,
  claimUrl?: string,
  extras?: GateExtras,
): { remove: () => void } {
  const el = document.createElement('div');
  el.setAttribute('data-jubjub-gate', 'true');
  el.style.cssText =
    'position:absolute;inset:0;z-index:1002;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:10px;text-align:center;' +
    'background:rgba(0,0,0,0.82);color:#fff;padding:16px;' +
    'font-family:system-ui,sans-serif;';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:15px;font-weight:600;max-width:340px;line-height:1.4;';
  title.textContent = titleText || DEFAULT_GATE_TITLE;
  el.appendChild(title);

  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:13px;opacity:0.85;max-width:340px;line-height:1.4;';
  sub.textContent = subText || DEFAULT_GATE_SUB;
  el.appendChild(sub);

  // A card prompt (2.4.0): the hosted card page, in a new tab, is the
  // primary action and the retry becomes the quieter one.
  if (extras?.link) {
    const link = document.createElement('a');
    link.href = extras.link.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('data-jubjub-card-link', extras.link.kind);
    link.style.cssText =
      'cursor:pointer;border-radius:8px;padding:10px 18px;margin-top:4px;text-decoration:none;' +
      'font-size:14px;font-weight:600;background:#fff;color:#000;font-family:inherit;';
    link.textContent = extras.link.text;
    el.appendChild(link);
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('data-jubjub-retry', 'true');
  btn.textContent = buttonText || 'Retry payment';
  btn.style.cssText = extras?.link
    ? 'cursor:pointer;border:1px solid rgba(255,255,255,0.6);border-radius:8px;padding:8px 16px;' +
      'font-size:13px;font-weight:600;background:transparent;color:#fff;font-family:inherit;'
    : 'cursor:pointer;border:0;border-radius:8px;padding:10px 18px;margin-top:4px;' +
      'font-size:14px;font-weight:600;background:#fff;color:#000;font-family:inherit;';
  el.appendChild(btn);

  // "Pay from your wallet instead": today's approve flow, unchanged.
  if (extras?.secondary) {
    const secondary = document.createElement('button');
    secondary.type = 'button';
    secondary.setAttribute('data-jubjub-wallet-fallback', 'true');
    secondary.textContent = extras.secondary.text;
    secondary.style.cssText =
      'cursor:pointer;border:0;background:transparent;color:#fff;opacity:0.8;' +
      'font-size:12px;text-decoration:underline;font-family:inherit;';
    const onSecondary = extras.secondary.onClick;
    secondary.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSecondary();
    });
    el.appendChild(secondary);
  }

  // The rights holder's exit from the paywall: see CostOverlay for why.
  if (claimUrl) {
    const claim = document.createElement('a');
    claim.href = claimUrl;
    claim.target = '_blank';
    claim.rel = 'noopener noreferrer';
    claim.setAttribute('data-jubjub-claim', 'true');
    claim.style.cssText =
      'font-size:12px;opacity:0.7;color:#fff;text-decoration:underline;margin-top:6px;';
    claim.textContent = 'This is my video';
    el.appendChild(claim);
  }

  // Insert into a positioned wrapper (mirrors _createLoader).
  let wrapper = video.parentElement;
  if (!wrapper || wrapper === document.body) {
    wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;display:inline-block;width:100%;';
    video.parentElement?.insertBefore(wrapper, video);
    wrapper.appendChild(video);
  }
  if (getComputedStyle(wrapper).position === 'static') {
    wrapper.style.position = 'relative';
  }
  wrapper.appendChild(el);

  const remove = () => el.remove();
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRetry();
  });

  return { remove };
}

// ---------------------------------------------------------------------------
// JubJub class
// ---------------------------------------------------------------------------
/**
 * True when an error is the viewer declining a wallet prompt, rather than a
 * capability or network failure. Implemented in src/walletChain.ts (pure,
 * unit-tested); kept under this name so call sites read as before.
 */
function _isUserRejection(err: unknown): boolean {
  return isUserRejection(err);
}

/**
 * True when the wallet is on a different network than the SDK needs and the
 * viewer has to switch it (our own post-switch check, or Phantom's refusal
 * text). See src/walletChain.ts.
 */
function _isChainMismatch(err: unknown): boolean {
  return isChainMismatchError(err);
}

/** The page's host, for wallet messages ("connect bankrtv.app"). */
function _pageHost(): string {
  try {
    return typeof location !== 'undefined' && location.host ? location.host : '';
  } catch {
    return '';
  }
}

export class JubJub extends EventEmitter {
  private options: JubJubOptions;
  private api: ApiClient;
  private wallet: Wallet;
  private approval: Approval | null = null;
  private session: Session | null = null;
  private costTracker: CostTracker | null = null;
  private overlay: CostOverlay | null = null;
  private contentInfo: ContentInfo | null = null;
  private video: HTMLVideoElement | null = null;
  private beforeUnloadHandler: (() => void) | null = null;
  // Bound to visibilitychange alongside beforeUnloadHandler — see start().
  private visibilityHandler: (() => void) | null = null;
  /** Tier-2 only: keeps the short-lived signed URL fresh during playback. */
  private refresher: PlaybackUrlRefresher | null = null;
  // The id attach() last ran for, so a tab_unpaid stop can start a new session.
  private attachedContentId: string | null = null;
  /** Tier-2 only: mid-playback fail-closed gate (single instance, no stacking). */
  private midPlaybackGate: { remove: () => void } | null = null;
  /**
   * Set once this instance's session has been closed: by the beacon (tab
   * hidden while paused or ended, pagehide, beforeunload), by the media's
   * `ended` event (the SDK closes it at once), or by the backend (a segment
   * answered status "closed", a refresh answered 409 session_capped). Nothing
   * is sent against it again and /close is never called on one the backend
   * closed. The next `play` opens a new session first (_reopenSession) and
   * plays only once it is open. Cleared when attach() completes.
   */
  private sessionClosed = false;
  /** Bound to the video's `play` alongside the beacon handlers; see attach(). */
  private resumeHandler: (() => void) | null = null;
  /** Bound to the video's `ended`: closes the session the moment it ends. */
  private endedHandler: (() => void) | null = null;
  /** 'session:end' has gone out for the current session (once per session). */
  private sessionEndEmitted = false;
  /** A re-open is in flight; a second `play` must not start another. */
  private reopening = false;
  /** 'jubjub:armed' has gone out for the current attach() (once per arming). */
  private armedDispatched = false;
  /**
   * The card this instance pays with (2.4.0). Kept across re-opens (cap
   * rollover, replay) so they open with the same card_token_id without
   * reading the cards again; cleared when the card can no longer pay.
   */
  private selectedCard: CardInfo | null = null;
  /** The next attach() reads the cards again (after a top-up prompt). */
  private cardReread = false;
  /** The piece answered 409 card_not_accepted: approve flow from now on. */
  private cardNotAccepted = false;

  constructor(options: JubJubOptions = {}) {
    super();
    this.options = { ...DEFAULTS, ...options };
    this.api = new ApiClient(this.options.apiUrl ?? DEFAULT_API_URL);
    const presetToken = options.sessionToken ?? _sessionToken;
    if (presetToken) this.api.setSessionToken(presetToken);
    this.wallet = new Wallet(this.options.wallet ?? _sharedWallet ?? undefined);

    if (options.onCostUpdate) this.on('cost', (c: CostInfo) => options.onCostUpdate!(c.usdc, c.seconds));
    if (options.onSessionStart) this.on('session:start', options.onSessionStart);
    if (options.onSessionEnd) this.on('session:end', options.onSessionEnd);
    if (options.onError) this.on('error', options.onError);
    if (options.onWalletConnected) this.on('wallet:connected', options.onWalletConnected);
    if (options.onFundingRequired) this.on('funding:required', options.onFundingRequired);
  }

  // =========================================================================
  // Static API
  // =========================================================================

  /** The package.json version this bundle was built from. */
  static readonly version: string = SDK_VERSION;

  /** The element event names, reachable from the UMD global (2.3.0). */
  static readonly ARMED_EVENT = JUBJUB_ARMED_EVENT;
  static readonly GATED_EVENT = JUBJUB_GATED_EVENT;

  /**
   * The typed funding errors, reachable from the UMD global
   * (`err instanceof JubJub.FundingRequiredError`) as well as the ESM export.
   */
  static readonly FundingRequiredError = FundingRequiredError;
  static readonly FundingUnverifiableError = FundingUnverifiableError;
  /** The gate's exact title/sub/button text for a funding error. */
  static readonly fundingMessage = fundingMessage;

  /**
   * Initialise the SDK. Call once per page. Auto-discovers video elements
   * with `data-jubjub-*` attributes and attaches payment flows.
   */
  static init(config: JubJubInitConfig): void {
    console.log('[JubJub] init() called', {
      version: SDK_VERSION,
      key: config.platformKey?.slice(0, 10) + '...',
    });
    _platformKey = config.platformKey;
    if (config.apiUrl) _initApiUrl = config.apiUrl;
    if (config.network) _initNetwork = config.network;
    if (config.provider) _injectedProvider = config.provider;
    if (typeof config.walletRdns === 'string' && config.walletRdns.trim()) {
      _initWalletRdns = config.walletRdns.trim();
    }
    // Ask every installed wallet to announce itself (EIP-6963) now, so the
    // list is ready when a viewer presses play. Idempotent; no prompt.
    startProviderDiscovery(typeof window !== 'undefined' ? (window as any) : undefined);
    if (typeof config.sessionToken === 'string' && config.sessionToken.trim()) {
      _sessionToken = config.sessionToken.trim();
    }
    if (typeof config.streamingAllowanceUsd === 'number') {
      _initStreamingAllowanceUsd = config.streamingAllowanceUsd;
    }
    if (typeof config.showCostOverlay === 'boolean') {
      _initShowOverlay = config.showCostOverlay;
    }
    if (config.overlayPosition) {
      _initOverlayPosition = config.overlayPosition;
    }
    if (config.payerMode === 'auto' || config.payerMode === 'wallet' || config.payerMode === 'card') {
      _initPayerMode = config.payerMode;
    }
    if (typeof config.onSelectCard === 'function') {
      _initOnSelectCard = config.onSelectCard;
    }

    if (_initialized) {
      console.log('[JubJub] Already initialized — skipping');
      return;
    }
    _initialized = true;

    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
      console.log('[JubJub] DOM loading — deferring auto-discover');
      document.addEventListener('DOMContentLoaded', () => JubJub._autoDiscover());
    } else {
      console.log('[JubJub] DOM ready — running auto-discover now');
      JubJub._autoDiscover();
    }
  }

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
  static setSessionToken(token: string | null | undefined): void {
    _sessionToken = typeof token === 'string' && token.trim() ? token.trim() : null;
  }

  /**
   * Forget the page-shared wallet so the next play connects afresh. Needed
   * when the host switches provider (init({ provider }) with a different
   * connector, e.g. injected → WalletConnect) or the user disconnects: the
   * SDK caches the first wallet it connected for the life of the page and
   * would otherwise keep signing with it.
   */
  static resetWallet(): void {
    _sharedWallet = null;
    _sharedProvider = null;
    _walletConnecting = null;
  }

  static async search(params: SearchParams = {}): Promise<SearchResponse> {
    if (!_platformKey) {
      throw new Error('Call JubJub.init({ platformKey }) before using search.');
    }
    const client = new ApiClient(_initApiUrl ?? DEFAULT_API_URL);
    return client.search(_platformKey, params);
  }

  static play(
    contentOrId: string | ContentRegistration,
    video: HTMLVideoElement,
    options: JubJubOptions = {},
  ): JubJub {
    _processed.add(video);

    const merged: JubJubOptions = {
      ...options,
      apiUrl: options.apiUrl ?? _initApiUrl,
      network: options.network ?? _initNetwork,
      showCostOverlay: options.showCostOverlay ?? _initShowOverlay,
      overlayPosition: options.overlayPosition ?? _initOverlayPosition,
    };

    if (typeof contentOrId === 'string') {
      const sdk = new JubJub({ ...merged, contentId: contentOrId });
      if (!contentOrId) {
        console.warn('[JubJub] No content ID — video plays without payments.');
        return sdk;
      }
      sdk._safeAttach(contentOrId, video);
      return sdk;
    }

    // Auto-registration path
    const sdk = new JubJub(merged);
    sdk._autoRegisterAndPlay(contentOrId, video).catch((err) => {
      sdk.emit('error', err);
      console.error('[JubJub]', err);
    });
    return sdk;
  }

  /**
   * Connect a browser-injected wallet (MetaMask, Coinbase Wallet, etc.).
   *
   * The target chain is resolved from the active network flag (defaults
   * to the value passed to JubJub.init(), i.e. 'mainnet' unless the
   * consumer explicitly opted into 'testnet').
   */
  static async connectBrowserWallet(network: NetworkFlag = _initNetwork): Promise<WalletLike> {
    const ethereum = await JubJub._selectWalletProvider();
    if (!ethereum) {
      throw new Error(
        'No browser wallet detected. Install MetaMask, or pass an ' +
          'EIP-1193 provider via JubJub.init({ provider }) — required ' +
          'inside Farcaster Mini Apps and similar embedded contexts.',
      );
    }

    const chain = chainForNetwork(network);

    // 1 + 2. Connect, then CONFIRM this origin is authorised for the account
    //    (eth_accounts is the check, never the source). A wallet with a stale
    //    connection record answers eth_requestAccounts from its cache with no
    //    popup and lists nothing in eth_accounts; the fix is a fresh
    //    permission prompt (wallet_requestPermissions), after which
    //    eth_accounts decides. Still nothing: a stale-connection error that
    //    tells the viewer to disconnect the site in the wallet and reload.
    //    See walletAuthorise.ts for the measured sequence.
    const address = (await requestAuthorisedAccount(
      ethereum,
      _pageHost(),
      (m, ...d) => console.warn(m, ...d),
    )) as `0x${string}`;

    // Switch to the configured chain. A viewer who declines the switch
    // (4001) is a user rejection and propagates as one, so the play harness
    // says "declined" rather than blaming the payment service. 4902 means the
    // chain is unknown to the wallet: add it (which switches on success). Any
    // other refusal is remembered and settled by the eth_chainId check below
    // rather than swallowed, so a wallet left on the wrong network can never
    // continue into approval and fail later with an unrelated error.
    let switchFailure: unknown = null;
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chain.chainIdHex }],
      });
    } catch (switchError: any) {
      if (_isUserRejection(switchError)) throw switchError;
      if (switchError?.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chain.chainIdHex,
            chainName: chain.label,
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: [chain.rpcUrl],
            blockExplorerUrls: [chain.explorer],
          }],
        });
      } else {
        switchFailure = switchError;
      }
    }

    // Verify rather than trust: read the wallet's active chain and compare it
    // with the registry entry for the configured network. A provider that
    // cannot answer eth_chainId is given the benefit of the doubt only when
    // the switch itself raised nothing.
    let observedChainId: unknown = null;
    try {
      observedChainId = await ethereum.request({ method: 'eth_chainId' });
    } catch {
      observedChainId = null;
    }
    const onWrongChain =
      observedChainId !== null && observedChainId !== undefined
        ? !chainIdMatches(observedChainId, chain.chainId)
        : switchFailure !== null;
    if (onWrongChain) {
      console.warn(
        `[JubJub] Wallet is not on ${chain.label} (chain ${chain.chainId}); ` +
          `observed ${String(observedChainId)}.`,
        switchFailure instanceof Error ? switchFailure.message : switchFailure ?? '',
      );
      throw chainMismatchError(chain.label, switchFailure ?? undefined);
    }

    const client = createWalletClient({
      account: address,
      chain: chain.viemChain,
      transport: custom(ethereum),
    });

    _sharedWallet = client as unknown as WalletLike;
    _sharedProvider = ethereum;
    return _sharedWallet;
  }

  /**
   * The EIP-1193 provider for this page (see walletProviders.ts): the host's
   * init({ provider }), else the EIP-6963 wallet named by init({ walletRdns }),
   * else the only wallet, else the one already connected to this site, else
   * window.ethereum with a warning naming every candidate.
   */
  private static async _selectWalletProvider(): Promise<any | null> {
    const win = typeof window !== 'undefined' ? (window as any) : undefined;
    const candidates = candidateProviders(win);
    const { chosen, reason } = await selectProvider(candidates, {
      injected: _injectedProvider,
      preferRdns: _initWalletRdns,
      legacy: win?.ethereum ?? null,
      authorised: async (c) => {
        const accs = await c.provider.request({ method: 'eth_accounts' });
        return Array.isArray(accs) && accs.length > 0;
      },
    });
    if (!chosen) return null;
    const line =
      `[JubJub] Wallet provider: ${describeProvider(chosen)} [${reason}]` +
      (candidates.length > 1
        ? `; ${candidates.length} candidates: ${candidates.map(describeProvider).join('; ')}`
        : '');
    if (reason === 'ambiguous-fallback') {
      console.warn(
        line +
          '. Several wallets are injected and none is connected to this site yet; ' +
          'pass JubJub.init({ walletRdns }) or init({ provider }) to choose one.',
      );
    } else {
      console.log(line);
    }
    return chosen.provider;
  }

  // =========================================================================
  // Auto-discovery (private)
  // =========================================================================

  private static _autoDiscover(): void {
    const selector = 'video[data-jubjub-content-id], video[data-jubjub-creator]';
    const videos = document.querySelectorAll<HTMLVideoElement>(selector);
    console.log(`[JubJub] Auto-discover found ${videos.length} video(s)`);
    videos.forEach((v) => JubJub._prepareVideo(v));

    // Watch for dynamically added videos (SPA, lazy loading).
    // Only react to added <video> elements, NOT to overlay/wrapper
    // DOM changes (which would cause an infinite loop).
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        let hasNewVideos = false;
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node instanceof HTMLVideoElement) {
              hasNewVideos = true;
              break;
            }
            if (node instanceof HTMLElement && node.querySelector('video')) {
              hasNewVideos = true;
              break;
            }
          }
          if (hasNewVideos) break;
        }
        if (!hasNewVideos) return;

        if (_observerTimer) clearTimeout(_observerTimer);
        _observerTimer = setTimeout(() => {
          document.querySelectorAll<HTMLVideoElement>(selector)
            .forEach((v) => JubJub._prepareVideo(v));
        }, 100);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  /**
   * Mark a video for JubJub payments but DON'T start the payment flow yet.
   * Wait for the user to press play — that triggers wallet connect + session.
   */
  private static _prepareVideo(video: HTMLVideoElement): void {
    if (_processed.has(video)) {
      console.log('[JubJub] Video already processed — skipping');
      return;
    }
    if (video.dataset.jubjubDisabled != null) {
      console.log('[JubJub] Video has data-jubjub-disabled — skipping');
      return;
    }
    _processed.add(video);

    const contentId = video.dataset.jubjubContentId;
    const creator = video.dataset.jubjubCreator;
    if (!contentId && !creator) return;

    // `creator` is the developer's own data-jubjub-creator input (often an
    // email). It is sent to JubJub to register the piece and never logged.
    console.log('[JubJub] Prepared video — waiting for play event', {
      contentId: contentId || '(auto-register)',
      creator: creator ? '(set)' : '(pre-registered)',
      src: (video.src || '').slice(0, 60),
    });

    // Defer the payment flow to the video's play event. Pause immediately so
    // no free seconds leak, run setup, then resume ONLY if payment is in
    // place. On approval rejection we FAIL CLOSED: keep the video paused and
    // show a retry gate instead of falling through to free playback.
    let currentGate: { remove: () => void } | null = null;
    let armedPlayHandler: (() => void) | null = null;

    const disarmPlay = () => {
      if (armedPlayHandler) {
        video.removeEventListener('play', armedPlayHandler);
        armedPlayHandler = null;
      }
    };
    const armPlay = () => {
      disarmPlay();
      armedPlayHandler = () => { disarmPlay(); run(); };
      video.addEventListener('play', armedPlayHandler);
    };

    const run = () => {
      // Ensure our own video.play() below can't re-enter this handler, and
      // clear any prior gate (retry via the native play button).
      disarmPlay();
      if (currentGate) { currentGate.remove(); currentGate = null; }
      video.pause();
      console.log('[JubJub] Play event fired — paused, starting payment setup');

      const loader = _createLoader(video);

      const setup = async () => {
        let sdk: JubJub | undefined;
        let gated = false;
        // The SDK's own 'payment:required' (via _gatePayment) has already
        // dispatched 'jubjub:gated'; only the harness's own refusals (the
        // timeout, a throw) dispatch it here.
        let gatedBySdk = false;
        let gateTitle: string | undefined;
        let gateSub: string | undefined;
        let gateAction: string | undefined;
        // A card prompt (2.4.0): the gate links the hosted card page and,
        // for "Get a card" in auto mode, offers the wallet instead.
        let gateCard: CardPrompt | undefined;
        try {
          if (contentId) {
            sdk = JubJub.play(contentId, video);
          } else {
            const mediaUrl =
              video.dataset.jubjubMediaUrl ||
              video.src ||
              video.querySelector('source')?.src ||
              '';
            sdk = JubJub.play(
              {
                creator: creator!,
                title: video.dataset.jubjubTitle || document.title,
                mediaUrl,
                pricePerMinute: video.dataset.jubjubPrice
                  ? parseFloat(video.dataset.jubjubPrice)
                  : undefined,
              },
              video,
            );
          }
          // Decide exactly once. 'ready' → play (payment secured). Any
          // pre-payment failure emits 'payment:required' → GATE. An 'error'
          // resumes ONLY when a session is already open (a benign
          // post-payment hiccup); an 'error' before the SDK is armed is a
          // refusal → GATE, never free playback. The 15s safety timeout
          // means setup never confirmed → GATE (can't confirm payment).
          await new Promise<void>((resolve) => {
            let settled = false;
            const done = (g: boolean) => {
              if (settled) return;
              settled = true;
              gated = g;
              resolve();
            };
            sdk!.on('ready', () => done(false));
            sdk!.on('payment:required', (e: any) => {
              gateTitle = e?.message || gateTitle;
              gateSub = e?.sub || gateSub;
              gateAction = e?.action || gateAction;
              if (!settled) gateCard = e?.card ?? undefined;
              if (!settled) gatedBySdk = true;
              done(true);
            });
            sdk!.on('error', () => done(!sdk!._isArmed()));
            setTimeout(() => {
              gateTitle = 'Payment setup timed out';
              gateSub = 'Setting up payment took too long. Please try again.';
              done(true);
            }, 15_000);
          });
        } catch {
          // Setup threw before emitting — FAIL CLOSED rather than free-play.
          gated = true;
        }
        loader.remove();

        // Whatever settled the wait, play() runs only on an open session.
        if (!gated && !sdk?._isArmed()) {
          gated = true;
          gateTitle = gateTitle || 'Payment not set up';
          gateSub = gateSub || "We couldn't set up payment for this video. Please try again.";
        }

        if (gated) {
          // FAIL CLOSED: payment was not secured. Keep the video paused, show
          // the retry gate, and re-arm play→retry. Do NOT call play().
          console.warn('[JubJub] Payment not secured — video gated (no free play).');
          currentGate = _createPaymentGate(
            video,
            run,
            gateTitle,
            gateSub,
            gateAction,
            claimUrlFor(contentId),
            _cardGateExtras(gateCard, () => {
              // The viewer chose the wallet: today's approve flow for this
              // video from now on.
              _walletChosen.add(video);
              run();
            }),
          );
          if (!gatedBySdk) _dispatchGated(video, contentId, gateTitle, gateSub);
          armPlay();
          return;
        }

        // Payment secured ('ready'), or a benign post-payment hiccup ('error'
        // raised after the on-chain session already exists) — resume.
        // 'jubjub:armed' goes out BEFORE play(): on 'ready' attach() already
        // sent it (this call no-ops); after a post-session 'error' it is sent
        // here, and never when no session is open (nothing was paid for, so
        // a host holding a Tier 1 source back keeps it back).
        sdk?._dispatchArmed();
        video.play().catch(() => {});
      };

      setup();
    };

    armPlay();
  }

  // =========================================================================
  // Auto wallet (private, shared across all videos)
  // =========================================================================

  /**
   * The active network for this instance — an explicit per-call
   * `options.network` wins, otherwise the value set at init time.
   * Source of truth for every chain decision made by this instance.
   */
  private _activeNetwork(): NetworkFlag {
    return this.options.network ?? _initNetwork;
  }

  private async _ensureWallet(): Promise<string> {
    // Already have a wallet from options or shared cache
    const existing = this.wallet.getAddress();
    if (existing) return existing;

    // Try shared wallet
    if (_sharedWallet) {
      this.wallet = new Wallet(_sharedWallet);
      return this.wallet.getAddress()!;
    }

    // Try auto-connecting browser wallet (only once per page)
    if (!_injectedProvider && !(window as any).ethereum) {
      throw new Error('no-wallet');
    }

    // Share one in-flight connect across every video on the page, but never
    // cache a failure: a declined or wrong-network connect used to be stored
    // here as null, so every later play on the page reported no-wallet until
    // resetWallet() was called. A success is still cached via _sharedWallet.
    if (!_walletConnecting) {
      _walletConnecting = JubJub.connectBrowserWallet(this._activeNetwork());
    }
    let wallet: WalletLike | null;
    try {
      wallet = await _walletConnecting;
    } catch (connectErr) {
      _walletConnecting = null;
      throw connectErr;
    }
    if (!wallet) {
      _walletConnecting = null;
      throw new Error('no-wallet');
    }

    this.wallet = new Wallet(wallet);
    return this.wallet.getAddress()!;
  }

  // =========================================================================
  // Instance methods
  // =========================================================================

  private _safeAttach(contentId: string, video: HTMLVideoElement): void {
    this.attach(contentId, video).catch((err) => {
      this.emit('error', err);
      console.error('[JubJub]', err);
    });
  }

  private async _autoRegisterAndPlay(
    info: ContentRegistration,
    video: HTMLVideoElement,
  ): Promise<void> {
    let contentId: string;
    // So a registration failure's gate reaches the element ('jubjub:gated').
    this.video = video;
    try {
      if (!_platformKey) {
        throw new Error('Call JubJub.init({ platformKey }) before using auto-registration.');
      }

      const cached = _registrationCache.get(info.mediaUrl);
      if (cached) {
        console.log('[JubJub] Using cached content_id:', cached);
        contentId = cached;
      } else {
        console.log('[JubJub] Registering content...', { title: info.title });
        const result = await this.api.registerContent(_platformKey, info);
        contentId = result.content_id;
        console.log('[JubJub] Registered:', contentId, result.duplicate ? '(duplicate)' : '(new)');
        _registrationCache.set(info.mediaUrl, contentId);
      }
    } catch (regErr) {
      // Registration failed for a JubJub-tagged (creator) video → FAIL CLOSED:
      // gate rather than free-play. (attach() handles its own gating below.)
      this._gatePayment(
        'Payment service unavailable',
        "Couldn't register this video for payment. Please try again.",
        regErr,
      );
      return;
    }

    return this.attach(contentId, video);
  }

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
  private _gateWalletError(err: unknown, stage: 'connect' | 'sign' | 'approve'): void {
    const kind = classifyWalletError(err);
    if (kind === 'unauthorised' || kind === 'disconnected' || kind === 'stale_connection') JubJub.resetWallet();
    if (stage === 'connect' && kind === 'other') {
      const noWallet = err instanceof Error && err.message === 'no-wallet';
      this._gatePayment(
        'Connect a wallet to watch',
        noWallet
          ? 'A wallet is required to pay for streaming. Install one, or open this page in a wallet browser, and retry.'
          : 'A wallet is required to pay for streaming. Connect one and retry.',
        err,
        'Connect wallet',
      );
      return;
    }
    const text = walletGateMessage(kind, {
      host: _pageHost(),
      chainLabel: chainForNetwork(this._activeNetwork()).label,
      detail: err instanceof Error ? err.message : err != null ? String(err) : '',
    });
    let sub = text.sub;
    if (kind === 'rejected') {
      sub =
        stage === 'connect'
          ? 'Approve the connection request in your wallet to start watching.'
          : stage === 'sign'
            ? 'Approve the signature request to confirm your wallet and start watching. It is free and costs no gas.'
            : 'Approve the USDC spending request in your wallet to start streaming.';
    }
    this._gatePayment(text.title, sub, err, text.action);
  }

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
  private async _confirmAccountAuthorised(
    address: string,
  ): Promise<{ ok: true; address: string } | { ok: false; error: unknown }> {
    const provider =
      _sharedProvider ?? _injectedProvider ?? (typeof window !== 'undefined' ? (window as any).ethereum : null);
    if (!provider || typeof provider.request !== 'function') return { ok: true, address };
    try {
      const confirmed = await reconfirmAuthorisedAccount(
        provider,
        address,
        _pageHost(),
        (m, ...d) => console.warn(m, ...d),
      );
      return { ok: true, address: confirmed };
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  /**
   * Step 3: prove the wallet and mint the viewer token (jj_), shared with
   * every later video on the page. Gates and answers false on any failure;
   * true once a token is held. Also called when an open is refused because
   * the held token expired or was revoked (step 5).
   */
  private async _mintViewerToken(contentId: string, address: string): Promise<boolean> {
  console.log('[JubJub] Step 3: Creating viewer session...');

  // FAIL CLOSED before prompting: a client that cannot sign can never
  // mint a proven token, and the server rejects the unproven path.
  if (!this.wallet.canSign()) {
    this._gatePayment(
      'Wallet cannot verify ownership',
      'This wallet cannot sign messages. JubJub needs a signature to ' +
        'confirm the wallet is yours before streaming.',
      new Error('wallet client has no signMessage'),
    );
    return false;
  }

  // Confirm, on the provider that connected it, that this origin is still
  // authorised for the account about to sign. The shared wallet lives for
  // the page; the viewer can disconnect the site in the wallet between
  // plays, and signing then fails 4100. Not authorised: one reconnect
  // (the viewer just pressed play, a prompt is expected), then gate.
  const authorised = await this._confirmAccountAuthorised(address);
  if (!authorised.ok) {
    this._gateWalletError(authorised.error, 'sign');
    return false;
  }
  if (authorised.address.toLowerCase() !== address.toLowerCase()) {
    // The viewer chose a different account in the wallet's dialog: the
    // page-shared wallet still points at the old one, so reconnect on
    // the next play rather than sign for an account the client is not.
    console.warn('[JubJub] The wallet authorised a different account than the one connected; reconnecting');
    JubJub.resetWallet();
    this._gateWalletError(
      Object.assign(new Error('The wallet authorised a different account. Press play again to continue with it.'), { code: 4100 }),
      'sign',
    );
    return false;
  }

  try {
    const minted = await this.api.createViewerSession(contentId, address, (message) =>
      // Tag signer failures so they are never mistaken for a backend one.
      this.wallet.signMessage(message).catch((e) => {
        throw markWalletError(e);
      }),
    );
    // Share it with every later video on this page.
    _sessionToken = minted.sessionToken;
  } catch (viewerErr) {
    // The wallet refused or failed to sign: the viewer's to fix, said
    // plainly (declined, not authorised for this site, prompt pending).
    if (isWalletError(viewerErr)) {
      this._gateWalletError(viewerErr, 'sign');
      return false;
    }
    // C: the backend (nonce or viewer-session) failed → FAIL CLOSED.
    // This is the one place in step 3 where the payment service is the
    // problem, so it is the one place that says so.
    this._gatePayment(
      'Payment service unavailable',
      viewerErr instanceof ApiHttpError
        ? `Couldn't start a payment session (${viewerErr.call.toLowerCase()} answered ${viewerErr.status}). Please try again.`
        : "Couldn't reach the payment service to start a session. Please try again.",
      viewerErr,
    );
    return false;
  }
    return true;
  }

  /** Forget the viewer token on this page: the shared copy and this
   * instance's client, so the next open signs a fresh one. */
  private _forgetSessionToken(): void {
    _sessionToken = null;
    this.api.clearSessionToken();
  }

  /**
   * 'jubjub:armed' on the element: a streaming session is open and playback
   * may start. Once per attach(); a no-op without an open session, so it can
   * never tell a host to attach a source nothing was paid for.
   */
  /**
   * True only while a streaming session is open: what the play harness
   * requires before it may call video.play() on a paid piece.
   */
  _isArmed(): boolean {
    return !!this.session && !this.sessionClosed;
  }

  private _dispatchArmed(): void {
    if (this.armedDispatched || !this.session || this.sessionClosed) return;
    const contentId = this.attachedContentId;
    if (!this.video || !contentId) return;
    this.armedDispatched = true;
    _dispatchElementEvent(this.video, JUBJUB_ARMED_EVENT, {
      contentId,
      gated: this.contentInfo?.gated === true,
    });
  }

  private _gatePayment(
    title: string,
    sub: string,
    cause?: unknown,
    action?: string,
    card?: CardPrompt,
  ): void {
    const detail =
      cause instanceof Error ? cause.message : cause != null ? String(cause) : '';
    console.warn(`[JubJub] Gating playback (no free play): ${title}`, detail);
    _dispatchGated(this.video, this.attachedContentId ?? this.options.contentId, title, sub);
    const err = new Error(title) as Error & {
      sub?: string;
      action?: string;
      cause?: unknown;
      card?: CardPrompt;
    };
    err.sub = sub;
    if (action) err.action = action;
    if (cause !== undefined) err.cause = cause;
    // 2.4.0: a card prompt ("Top up your card", "Get a card") carries its
    // link and whether the wallet fallback is offered. Absent otherwise.
    if (card) err.card = card;
    this.emit('payment:required', err);
  }

  /** payerMode for this attempt: the viewer's wallet choice, else the option, else init(). */
  private _payerMode(): PayerMode {
    if (this.video && _walletChosen.has(this.video)) return 'wallet';
    const m = this.options.payerMode ?? _initPayerMode;
    return m === 'wallet' || m === 'card' ? m : 'auto';
  }

  /** A card's hosted top-up page with return= back to this page, or null. */
  private _topUpUrl(raw: string | null | undefined): string | null {
    return raw ? withReturn(raw, _pageUrl()) : null;
  }

  /** "Top up your card": card:low, then the gate with the top-up link. */
  private _gateTopUp(
    fields: { tokenId: number | null; balanceMicro: number | null; requiredMicro: number | null; topUpUrl: string | null; message?: string | null },
    cause?: unknown,
  ): void {
    this.cardReread = true;
    const topUpUrl = this._topUpUrl(fields.topUpUrl);
    this.emit('card:low', {
      tokenId: fields.tokenId,
      balanceMicro: fields.balanceMicro,
      requiredMicro: fields.requiredMicro,
      topUpUrl,
    });
    const text = cardPromptText('top_up', fields);
    this._gatePayment(text.title, text.sub, cause, text.action, {
      kind: 'top_up',
      url: topUpUrl,
      linkText: text.linkText,
      walletFallback: false,
      tokenId: fields.tokenId,
    });
  }

  /**
   * Find the card to pay with (2.4.0; after Step 2 and, since 2.4.1, before
   * the Step 3 signature: the cards route is public). Returns the card,
   * or null once it has gated: "Top up your card" (cards, none covering one
   * minute at this price), "Get a card" (none; with "Pay from your wallet
   * instead" in auto mode), or a retry when the cards could not be read.
   */
  private async _detectCard(address: string, mode: PayerMode): Promise<CardInfo | null> {
    const info = this.contentInfo!;
    let found: CardsResponse;
    try {
      found = await this.api.getCards(address, _platformKey);
    } catch (cardsErr) {
      this._gatePayment(
        "Couldn't check your card",
        "We couldn't reach JubJub to read your card. Please try again.",
        cardsErr,
        'Try again',
        mode === 'auto'
          ? { kind: 'unavailable', url: null, linkText: '', walletFallback: true, tokenId: null }
          : undefined,
      );
      return null;
    }
    this.cardReread = false;
    const pageUrl = _pageUrl();
    const mintBase = found.mint_url ?? info.card_page_url ?? null;
    const mintUrl = mintBase ? withReturn(mintBase, pageUrl) : null;
    this.emit('card:detected', { cards: found.cards, mintUrl });
    const minimum = oneMinuteMicro(info);
    const decision = await decideCard(
      found.cards,
      minimum,
      this.options.onSelectCard ?? _initOnSelectCard,
    );
    if (decision.kind === 'card') {
      this.selectedCard = decision.card;
      console.log('[JubJub] Card', decision.card.token_id, 'covers this video; no approval needed');
      this.emit('card:selected', decision.card);
      return decision.card;
    }
    this.selectedCard = null;
    if (decision.kind === 'blocked') {
      // 2.4.1: frozen or closing. A top-up cannot fix it; the backend's words
      // for the reason, no approval, no link; the retry reads the cards again.
      this.cardReread = true;
      const text = cardStoppedText(decision.reason);
      this._gatePayment(text.title, text.sub, new Error(decision.reason), text.action);
      return null;
    }
    if (decision.kind === 'top_up') {
      this._gateTopUp(
        {
          tokenId: decision.card.token_id,
          balanceMicro: decision.card.balance_micro,
          requiredMicro: minimum,
          topUpUrl: decision.card.top_up_url,
        },
        new Error('card balance below one minute'),
      );
      return null;
    }
    const text = cardPromptText('get_card');
    this._gatePayment(text.title, text.sub, new Error('no card'), text.action, {
      kind: 'get_card',
      url: mintUrl,
      linkText: text.linkText,
      walletFallback: mode === 'auto',
      tokenId: null,
    });
    return null;
  }

  /**
   * "Pay from your wallet instead" for a host that renders its own card
   * prompt (err.card.walletFallback): this video runs today's approve flow
   * from now on, starting now.
   */
  async payFromWallet(): Promise<void> {
    const video = this.video;
    const contentId = this.attachedContentId;
    if (!video || !contentId) return;
    _walletChosen.add(video);
    await this.attach(contentId, video);
  }

  /**
   * Tell the host about a typed funding error before gating. 402 ->
   * 'funding:required' (FundingRequiredError), 503 -> 'funding:unverifiable'
   * (FundingUnverifiableError, retryable). On insufficient_allowance the next
   * attempt approves the spender the backend named.
   */
  private _announceFunding(err: FundingRequiredError | FundingUnverifiableError): void {
    if (isFundingRequiredError(err)) {
      // insufficient_allowance, or an unpaid tab the allowance does not cover
      // (tab_unpaid short on BALANCE needs USDC, not an approval).
      if (err.needsApproval && err.spender) {
        _pendingSpenderApproval = {
          spender: err.spender,
          requiredMicro: err.requiredMicro,
          token: err.token,
          chainId: err.chainId,
          exact: err.reason === 'tab_unpaid',
        };
      }
      this.emit('funding:required', err);
    } else {
      this.emit('funding:unverifiable', err);
    }
  }

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
  private _gateMidPlayback(cause?: unknown): void {
    const video = this.video;
    if (!video) return;
    // 409 session_capped on a URL refresh (Tier 2 of the cap rule): this
    // session did its $2.00 and the pot still covers viewing. Not a gate: mark
    // it closed (the backend already closed it, so no /close) and roll over
    // to a new session while the media keeps playing. A refusal of the new
    // session pauses and gates inside _reopenSession. An ended video needs no
    // new session; its `ended` handler has closed this one.
    if (isSessionCappedError(cause)) {
      console.log('[JubJub] Session reached its per-session cap on refresh; opening a new one from the pot');
      this._markSessionClosed();
      if (!video.ended) void this._reopenSession(reopenModeFor('rollover'));
      return;
    }
    // A COMPLETED VIEW IS NOT A PAYMENT FAILURE. Once the content has played to
    // its end there is nothing left to protect and nothing left to sell, so a
    // failed re-resolve must not become a paywall. This gate previously fired
    // ten minutes after a viewer finished a 54s video and told them "your paid
    // session ended, start a new session" — the last thing they saw after a
    // view that had worked and been paid for. The refresher now suspends on
    // `ended` so this should not be reached; it stays as the guard for a
    // re-resolve already in flight at the moment the video finished.
    if (video.ended) return;
    try { video.pause(); } catch { /* belt-and-braces; refresher already paused */ }
    console.warn(
      '[JubJub] Gated stream could not be refreshed — paused (fail closed).',
      cause instanceof Error ? cause.message : cause,
    );
    // A 402 of any reason is a funding refusal, including one this bundle
    // does not know (reason 'unknown'): the gate shows the backend's words,
    // offers no approval, and the retry asks for a URL once.
    const funding =
      isFundingRequiredError(cause) || isFundingUnverifiableError(cause) ? cause : null;
    if (funding) this._announceFunding(funding);
    // Don't stack gates: a failed retry re-enters here, but the existing gate
    // stays up and we simply no-op.
    if (this.midPlaybackGate) return;
    const text = funding ? fundingMessage(funding) : null;
    // A card session (2.4.0): the refresh's live card check refused. Low
    // balance is "Top up your card" with the link; the retry asks for a URL
    // again, which re-checks the card. Any other card refusal shows the
    // backend's words and the next open reads the cards again.
    let cardPrompt: CardPrompt | undefined;
    if (isFundingRequiredError(cause) && cause.isCardRefusal) {
      this.cardReread = true;
      if (cause.reason === 'card_balance_low') {
        const tokenId = cause.tokenId ?? this.session?.cardTokenId ?? null;
        const topUpUrl = this._topUpUrl(cause.topUpUrl ?? this.selectedCard?.top_up_url);
        this.emit('card:low', {
          tokenId,
          balanceMicro: cause.balanceMicro,
          requiredMicro: cause.requiredMicro,
          topUpUrl,
        });
        cardPrompt = {
          kind: 'top_up',
          url: topUpUrl,
          linkText: cardPromptText('top_up').linkText,
          walletFallback: false,
          tokenId,
        };
      } else {
        this.selectedCard = null;
      }
    }
    // 2.4.1: on a CARD session the retry opens a new session (reading the
    // cards again) instead of asking for another URL on this one. A card
    // session the backend ended (card_empty, frozen, closing, transferred)
    // can never be refreshed, so after a top-up the old retry answered 403
    // forever and the viewer was stuck under the gate. Never an approval.
    const onCard = this.session?.cardTokenId != null;
    if (onCard) this.cardReread = true;
    this.midPlaybackGate = _createPaymentGate(
      video,
      () => {
        if (onCard) {
          this.midPlaybackGate?.remove();
          this.midPlaybackGate = null;
          void this._reopenSession(reopenModeFor('replay'));
          return;
        }
        // A 402 allowance stop: approve the backend-named spender first, then
        // ask for a URL once. The refresher itself never retries a 402.
        const approval = this.approval;
        const tabUnpaid = isFundingRequiredError(cause) && cause.reason === 'tab_unpaid';
        const approveFirst =
          isFundingRequiredError(cause) &&
          cause.needsApproval &&
          cause.spender &&
          approval
            ? approval
                .ensureSpenderApproved(cause.spender, cause.requiredMicro, tabUnpaid)
                .then(() => { _pendingSpenderApproval = null; })
            : Promise.resolve();
        if (tabUnpaid) {
          // The backend ENDED this session for an unpaid tab, so no refresh
          // can revive it. Approve the figure shown, then start a new session
          // through _reopenSession: the open gate checks the tab again and the
          // crossing collects it. Before 2.2.0 this re-ran attach() directly,
          // after the play harness's one-shot 'payment:required' listener had
          // settled, so a refusal here left the video paused with no gate on
          // screen. _reopenSession renders its own gate with the backend's
          // words and a retry (rule 8: blocked playback always shows a prompt).
          void approveFirst
            .then(async () => {
              _pendingSpenderApproval = null;
              // The backend closed this session: never /close it again.
              this._markSessionClosed();
              this.midPlaybackGate?.remove();
              this.midPlaybackGate = null;
              await this._reopenSession(reopenModeFor('replay'));
            })
            .catch((approveErr) => {
              console.warn('[JubJub] USDC approval not completed', approveErr);
            });
          return;
        }
        void approveFirst
          .then(() => this.refresher?.refreshNow('manual') ?? false)
          .catch((approveErr) => {
            console.warn('[JubJub] USDC approval not completed', approveErr);
            return false;
          })
          .then((ok) => {
            if (ok) {
              this.midPlaybackGate?.remove();
              this.midPlaybackGate = null;
              video.play().catch(() => {});
            }
            // On failure the refresher re-invokes _gateMidPlayback, which no-ops
            // because midPlaybackGate is still set — the gate stays. Fail closed.
          });
      },
      text?.title ?? 'Stream paused',
      text?.sub ?? 'Your paid session ended. Start a new session to keep watching.',
      text?.action,
      claimUrlFor(this.options.contentId),
      _cardGateExtras(cardPrompt, () => {}),
    );
    _dispatchGated(
      video,
      this.attachedContentId ?? this.options.contentId,
      text?.title ?? 'Stream paused',
      text?.sub ?? 'Your paid session ended. Start a new session to keep watching.',
    );
    if (text) {
      const err = new Error(text.title) as Error & {
        sub?: string;
        action?: string;
        cause?: unknown;
        card?: CardPrompt;
      };
      err.sub = text.sub;
      err.action = text.action;
      err.cause = cause;
      if (cardPrompt) err.card = cardPrompt;
      this.emit('payment:required', err);
      return;
    }
    const err = new Error('gated stream expired') as Error & { sub?: string };
    err.sub = 'Your paid session ended.';
    this.emit('payment:required', err);
  }

  async attach(contentId: string, video: HTMLVideoElement): Promise<void> {
    this.video = video;
    this.attachedContentId = contentId || null;
    this.armedDispatched = false;

    if (!contentId) {
      console.warn('[JubJub] No content ID — video plays without payments.');
      this.emit('error', new Error('No content ID'));
      return;
    }

    console.log('[JubJub] attach() starting for', contentId);

    try {
      // 1. Fetch content + chain config
      console.log('[JubJub] Step 1: Fetching playback info...');
      try {
        this.contentInfo = await this.api.getPlaybackInfo(contentId);
      } catch (fetchErr: any) {
        // A: could not load payment details → FAIL CLOSED (gate, no free play).
        this._gatePayment(
          'Unable to load payment details',
          "We couldn't load this video's payment info. Please try again.",
          fetchErr,
        );
        return;
      }
      // A: missing / invalid price is a misconfig — never free-play around it.
      const price = Number(this.contentInfo.price_per_minute_usdc);
      if (!Number.isFinite(price) || price <= 0) {
        this._gatePayment(
          'Unable to load payment details',
          'This video is missing a valid price. Please try again.',
          new Error(`invalid price_per_minute_usdc: ${this.contentInfo.price_per_minute_usdc}`),
        );
        return;
      }
      console.log('[JubJub] Step 1 done:', this.contentInfo.title, `$${this.contentInfo.price_per_minute_usdc}/min`);
      this.emit('content:loaded', this.contentInfo);

      // 2. Connect wallet (auto or BYO)
      console.log('[JubJub] Step 2: Connecting wallet...');
      let address: string;
      try {
        address = await this._ensureWallet();
      } catch (walletErr) {
        // B: no wallet / connect failed → FAIL CLOSED (gate, no free play),
        // and say what the wallet actually said (walletErrors.ts).
        this._gateWalletError(walletErr, 'connect');
        return;
      }
      console.log('[JubJub] Step 2 done: wallet', address.slice(0, 10) + '...');
      this.emit('wallet:connected', address);

      // 3. Create viewer session — proves wallet ownership first (K1-1d).
      //    The signature prompt lands HERE, i.e. on the viewer's play click
      //    (attach() runs off the `play` event), never at page load.
      //    SKIPPED when a session token is already held: the host signed the
      //    viewer in (init({ sessionToken }) / setSessionToken), or an
      //    earlier video on this page already minted one. One signature per
      //    page, never one per video.
      // 2.5 The card (2.4.0). Only where playback-info says this piece takes
      //     cards (card_accepted: true); false or absent (an older backend)
      //     runs today's flow untouched: no cards call, no card_token_id. A
      //     usable card covering one minute skips Step 4 entirely. A re-open
      //     (cap rollover, replay) keeps the card already chosen; after a
      //     top-up prompt the cards are read again.
      //     2.4.1: BEFORE Step 3. The cards route is public, so "Get a card"
      //     and "Top up your card" need only the connected wallet, never the
      //     viewer-token signature (minting a card needs only a wallet). The
      //     signature is asked for only once a card will pay (or the wallet
      //     fallback runs, which is today's order: Step 3 then Step 4).
      let card: CardInfo | null = null;
      const payerMode = this._payerMode();
      if (this.contentInfo.card_accepted === true && payerMode !== 'wallet' && !this.cardNotAccepted) {
        if (this.selectedCard && !this.cardReread) {
          card = this.selectedCard;
          console.log('[JubJub] Step 2.5: paying with card', card.token_id);
        } else {
          console.log('[JubJub] Step 2.5: looking for a card...');
          card = await this._detectCard(address, payerMode);
          if (!card) return;
        }
      }

      if (this.api.hasSessionToken()) {
        console.log('[JubJub] Step 3: session token already held — no signature needed');
      } else {
        if (!(await this._mintViewerToken(contentId, address))) return;
        console.log('[JubJub] Step 3 done');
      }

      // 4. Approve USDC (never on a card)
      if (!card && !(await this._approveStep(address))) return;

      // 5. Create streaming session
      console.log('[JubJub] Step 5: Creating streaming session...');
      // A held token the backend refuses (401/403: past its 24-hour TTL, or
      // revoked) is forgotten EVERYWHERE and a fresh one is signed, then the
      // open is tried once more. Before 2026-10-24 only the page-shared copy
      // was forgotten: this instance's ApiClient kept the dead token, so the
      // quiet reopen skipped step 3 and failed the same way every time.
      let authRetried = false;
      for (;;) {
        try {
          this.session = await Session.create(
            contentId,
            address,
            this.api,
            // Captured by step 1's getPlaybackInfo. Undefined against a
            // backend that predates grants — send nothing rather than fail.
            this.contentInfo?.playback_grant,
            // 2.4.0: a card session. Undefined on the approve rail, so the
            // body is exactly today's.
            card ? card.token_id : undefined,
          );
          break;
        } catch (streamErr) {
          if (!authRetried && isAuthRefusal(streamErr)) {
            authRetried = true;
            this._forgetSessionToken();
            console.warn('[JubJub] The viewer token was refused (expired or revoked); signing a fresh one');
            if (!(await this._mintViewerToken(contentId, address))) return;
            continue;
          }
          // 409 card_not_accepted: this piece's catalogue does not take
          // cards. Auto mode falls back to the approve flow with no prompt;
          // payerMode 'card' never offers the wallet, so it stops and says so.
          if (card && isCardNotAcceptedError(streamErr)) {
            if (payerMode === 'card') {
              this._gatePayment(
                "This video doesn't take card payments",
                'Card payments are not available for this video yet.',
                streamErr,
                'Try again',
              );
              return;
            }
            console.log('[JubJub] This piece does not take cards; using the wallet approval instead');
            this.cardNotAccepted = true;
            this.selectedCard = null;
            card = null;
            if (!(await this._approveStep(address))) return;
            continue;
          }
          // A card refusal (402 card_*): card_balance_low is "Top up your
          // card"; frozen, closing, transferred or not found stop with the
          // backend's words. Never an approval; the token is fine.
          if (isFundingRequiredError(streamErr) && streamErr.isCardRefusal) {
            this._announceFunding(streamErr);
            if (streamErr.reason === 'card_balance_low') {
              this._gateTopUp(
                {
                  tokenId: streamErr.tokenId ?? card?.token_id ?? null,
                  balanceMicro: streamErr.balanceMicro,
                  requiredMicro: streamErr.requiredMicro,
                  topUpUrl: streamErr.topUpUrl ?? card?.top_up_url ?? null,
                  message: streamErr.backendMessage,
                },
                streamErr,
              );
              return;
            }
            // This card cannot pay: the retry reads the cards again.
            this.selectedCard = null;
            this.cardReread = true;
            const text = fundingMessage(streamErr);
            this._gatePayment(text.title, text.sub, streamErr, text.action);
            return;
          }
          // 402 / 503 funding: say exactly what the viewer must do. The session
          // token is fine here -- the backend authenticated it before checking
          // funds -- so it is NOT forgotten.
          if (isFundingRequiredError(streamErr) || isFundingUnverifiableError(streamErr)) {
            this._announceFunding(streamErr);
            const text = fundingMessage(streamErr);
            this._gatePayment(text.title, text.sub, streamErr, text.action);
            return;
          }
          // 409 content_not_sellable: the piece has no live ownership contract
          // yet (or is hosted elsewhere). The service is fine and so is the
          // session token; say what is actually not ready.
          if (isContentNotPlayableError(streamErr)) {
            const text = contentNotPlayableMessage(streamErr);
            this._gatePayment(text.title, text.sub, streamErr, text.action);
            return;
          }
          // D: streaming-session create failed (incl. on-chain createSession
          // revert) → FAIL CLOSED (gate). Payment is not yet secured here.
          // A page-shared token that the backend refused (expired 24h TTL,
          // revoked) must not be reused by the next play: forget it so the
          // retry proves the wallet afresh instead of failing the same way.
          // EXCEPT a 402: that is a funding refusal, never an auth failure (the
          // backend authenticated the token before it checked funds), so the
          // token stays even when the body could not be read as a funding error.
          if (!(streamErr instanceof ApiHttpError && streamErr.status === 402)) {
            this._forgetSessionToken();
          }
          this._gatePayment(
            'Payment service unavailable',
            "Couldn't start the streaming payment. Please try again.",
            streamErr,
          );
          return;
        }
      }
      console.log('[JubJub] Step 5 done: session', this.session!.id);
      this.emit('session:start', this.session.id);

      // 5.5 Tier 2 (gated host): payment is now secured, so resolve a
      // short-lived, session-scoped playback URL and point the <video> at it.
      // Tier 1 (no `gated` flag) skips this entirely — video.src is left
      // exactly as the host page set it (today's behaviour, byte-for-byte).
      if (this.contentInfo.gated) {
        console.log('[JubJub] Step 5.5: gated content — resolving playback URL...');
        try {
          const { url, expiresInSeconds } =
            await this.api.getSessionPlaybackUrl(this.session.id);
          if (!url) throw new Error('empty playback url');
          video.src = url;

          // Short TTL must not cap video length: re-resolve a fresh signed URL
          // BEFORE this one expires (and on an expiry-driven media error) while
          // the paid session is still active. Fail-closed — if a refresh can't
          // be resolved the refresher pauses the element and we gate; it never
          // falls back to a durable/unsigned URL. Tier 1 never reaches here.
          this.refresher = new PlaybackUrlRefresher(
            video,
            this.api,
            this.session.id,
            { onFailure: (err) => this._gateMidPlayback(err) },
          );
          this.refresher.start(url, expiresInSeconds);
        } catch (urlErr) {
          // FAIL CLOSED: a gated video with no resolved source must NEVER play.
          this._gatePayment(
            'Stream unavailable',
            "Couldn't load the protected stream. Please try again.",
            urlErr,
          );
          return;
        }
        console.log('[JubJub] Step 5.5 done: gated source set + refresher armed');
      }

      // 6. Cost tracker
      console.log('[JubJub] Step 6: Starting cost tracker + overlay');
      this.costTracker = new CostTracker(
        video,
        this.contentInfo.price_per_minute_usdc,
        this.session,
        this.api,
      );
      this.costTracker.on('cost', (cost: CostInfo) => {
        this.emit('cost', cost);
        this.overlay?.update(cost);
      });
      // Every segment's answer is read: a session the backend closed (the
      // $2.00 cap, an unpaid tab, the idle sweep) is never metered again.
      this.costTracker.on('segment', (e: SegmentEvent) => this._onSegmentOutcome(e));
      this.costTracker.start();

      // 7. Overlay
      if (this.options.showCostOverlay !== false) {
        this.overlay = new CostOverlay(
          video,
          this.options.overlayPosition ?? 'bottom-right',
          claimUrlFor(contentId),
        );
        // A card session (2.4.0): what the card can still cover and the
        // per-second price, beside the running cost.
        if (this.session.cardTokenId != null && this.session.cardBalanceMicro != null) {
          this.overlay.setCard(this.session.cardBalanceMicro, this.contentInfo.price_per_minute_usdc);
        }
      }

      // 8. Beacon close.
      //
      // THREE events, not one. `beforeunload` does not fire reliably on mobile
      // Safari or inside a webview — which is exactly where this SDK runs, the
      // Farcaster mini-app — so the previous single binding meant mini-app
      // viewers sent NO close signal at all and every session sat open for the
      // full ten-minute idle timeout holding live pull authority.
      // `pagehide` is the reliable unload event in those environments;
      // `visibilitychange` catches a backgrounded tab that is never formally
      // unloaded, but ONLY while the media is paused or ended
      // (sessionLifecycle.shouldBeaconOnHidden): a hidden tab with audio still
      // playing is a viewer still watching, and closing there left Tier 1
      // posting segments to a closed session (free play) and Tier 2 gated on
      // return. Guarded so the overlapping events send at most one beacon.
      //
      // Whatever closed the session, playback never continues against it. The
      // beacon marks the session closed and stops the tracker and the URL
      // refresher (both would be refused by the backend); the next `play`
      // opens a new session first and resumes only once it is open
      // (_reopenSession), the way the dashboard's PaymentGate replays.
      let beaconSent = false;
      this.beforeUnloadHandler = () => {
        if (beaconSent) return;
        // A session already closed (ended, capped, beaconed) is not beaconed
        // again; the backend would refuse.
        if (this.session && this.costTracker && !this.sessionClosed) {
          beaconSent = true;
          this.session.beaconClose(this.costTracker.getPlaybackSeconds());
          this._markSessionClosed();
        }
      };
      this.visibilityHandler = () => {
        if (document.visibilityState !== 'hidden') return;
        if (shouldBeaconOnHidden(video)) this.beforeUnloadHandler?.();
      };
      this.resumeHandler = () => {
        // Replay after the session was closed (ended, cap, beacon, idle, tab):
        // open a new one from the pot before a frame plays. Wallet and page
        // token are held, so this prompts only when the open answers 402.
        if (mustReopenOnPlay({ sessionClosed: this.sessionClosed, reopening: this.reopening })) {
          void this._reopenSession(reopenModeFor('replay'));
        }
      };
      // ENDED CLOSES THE SESSION (pot model rule 4, decision 9). The moment
      // the content plays to its end the session is closed with the seconds
      // played, charging stops and 'session:end' goes out. Before 2.2.0 the
      // session was left open for the idle sweep. A replay reopens quietly
      // through resumeHandler.
      this.endedHandler = () => this._closeSessionNow('ended');
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
      window.addEventListener('pagehide', this.beforeUnloadHandler);
      document.addEventListener('visibilitychange', this.visibilityHandler);
      video.addEventListener('play', this.resumeHandler);
      video.addEventListener('ended', this.endedHandler);
      this.sessionClosed = false;
      this.sessionEndEmitted = false;

      console.log('[JubJub] Ready — streaming payments active');
      // 'jubjub:armed' on the element, synchronously and before anything
      // calls video.play(): the play harness and _reopenSession resume only
      // after this returns. A Tier 1 host attaches its held-back source here.
      this._dispatchArmed();
      this.emit('ready');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Step 4, today's approve flow, unchanged (moved out of attach() in 2.4.0
   * so a card session can skip it and a 409 card_not_accepted can fall back
   * to it): the standing allowance, then any spender a previous 402 named.
   * Gates and answers false on any failure; true once approval is in place.
   */
  private async _approveStep(address: string): Promise<boolean> {
      const contentInfo = this.contentInfo!;
      console.log('[JubJub] Step 4: Checking USDC approval...');
      let didApprove: boolean;
      try {
        // Construct inside the try so an Approval ctor throw (e.g. unsupported
        // chain_id / chain-RPC mismatch) also gates rather than free-playing.
        this.approval = new Approval(
          this.wallet,
          {
            usdc_address: contentInfo.usdc_address,
            payment_router: contentInfo.payment_router,
            chain_id: contentInfo.chain_id,
            price_per_minute_usdc: contentInfo.price_per_minute_usdc,
            // Standing allowance: approve once, stream many sessions
            // signature-free. Bounded default ($10) inside Approval when unset.
            standing_allowance_usd: _initStreamingAllowanceUsd,
          },
        );
        didApprove = await this.approval.ensureApproved();
        // A previous attempt was refused 402 insufficient_allowance: approve
        // the spender the backend named, on the same chain + token only.
        const pending = _pendingSpenderApproval;
        if (
          pending &&
          (pending.chainId == null || pending.chainId === contentInfo.chain_id) &&
          (pending.token == null ||
            pending.token.toLowerCase() === String(contentInfo.usdc_address).toLowerCase())
        ) {
          if (
            await this.approval.ensureSpenderApproved(
              pending.spender,
              pending.requiredMicro,
              pending.exact,
            )
          ) {
            didApprove = true;
          }
          _pendingSpenderApproval = null;
        }
      } catch (approvalErr) {
        // FAIL CLOSED: approval rejected by the user, approve tx failed, the
        // allowance could not be verified, or the chain/RPC was unusable. Do
        // NOT proceed and do NOT fall through to free play. A wallet refusal
        // (declined, not authorised, prompt pending, wrong network) is named;
        // anything else keeps the approval wording.
        if (classifyWalletError(approvalErr) !== 'other') {
          this._gateWalletError(approvalErr, 'approve');
          return false;
        }
        this._gatePayment(
          'Payment approval required to watch',
          'Approve the USDC payment in your wallet to start streaming.',
          approvalErr,
        );
        return false;
      }
      console.log('[JubJub] Step 4 done:', didApprove ? 'approved' : 'already approved');
      if (didApprove) this.emit('approved', address);
      return true;
  }

  /**
   * This instance's session is closed (beacon, ended, cap, backend). Nothing
   * may be sent against it again: no segment (the tracker stops) and no URL
   * refresh (the refresher stops, which also drops its own replay handler so
   * only _reopenSession answers the next `play`). The overlay keeps its final
   * figure. The session object stays so disconnect() can report it.
   */
  private _markSessionClosed(): void {
    this.sessionClosed = true;
    this.costTracker?.stop();
    this.refresher?.stop();
    this.refresher = null;
  }

  /** 'session:end' once per session; disconnect() and the ended close share it. */
  private _emitSessionEnd(summary: SessionSummary): void {
    if (this.sessionEndEmitted) return;
    this.sessionEndEmitted = true;
    this.emit('session:end', summary);
  }

  /**
   * Close the session now, with the seconds played so far: the media's
   * `ended` event (rule 4). Metering stops, POST /close goes out, and
   * 'session:end' is emitted. The session object stays until disconnect()
   * (which will not close it a second time) or the next replay's re-open.
   */
  private _closeSessionNow(why: string): void {
    const session = this.session;
    if (!session || this.sessionClosed) return;
    const seconds = this.costTracker?.getPlaybackSeconds() ?? 0;
    const cost = this.costTracker?.getCost()?.usdc ?? 0;
    console.log(`[JubJub] Closing session (${why}) after ${seconds.toFixed(1)}s played`);
    this._markSessionClosed();
    session.close(seconds).catch(() => {});
    this._emitSessionEnd({
      sessionId: session.id,
      seconds,
      cost,
      walletAddress: this.wallet.getAddress() ?? '',
    });
  }

  /**
   * A segment POST answered. 'continue': nothing to do. Otherwise the backend
   * closed the session (rules 2 and 3): stop metering it, mark it closed and
   * never /close it. On the $2.00 cap ('rollover') open a new session quietly
   * while the media keeps playing. Any other closure ('closed': an unpaid tab,
   * the idle sweep) must not leave frames playing against nothing, so while
   * the media is playing the re-open runs now, pausing first; paused or ended
   * media simply waits for the next `play`.
   */
  private _onSegmentOutcome(e: SegmentEvent): void {
    if (e.outcome === 'continue') return;
    // A second segment in flight at the same moment: already handled.
    if (this.sessionClosed) return;
    const video = this.video;
    const why = e.response?.end_reason ?? e.response?.status ?? 'closed';
    console.log(`[JubJub] Backend closed the session (${why}); no more segments to it`);
    this._markSessionClosed();
    // 2.4.0: the card ran out mid-play. Pause and show "Top up your card";
    // nothing re-opens until the viewer retries (which reads the cards again).
    if (e.response?.end_reason === CARD_EMPTY) {
      this._cardEmpty();
      return;
    }
    // 2.4.1: the backend ended this card session for the card itself
    // (frozen, closing, transferred, not found). Not a silent re-open: that
    // would open again with the same card and be refused. Pause and say why;
    // the retry reads the cards again.
    if (isCardEndReason(e.response?.end_reason)) {
      this._cardStopped(String(e.response?.end_reason));
      return;
    }
    if (!video || !mustReopenNow(video)) return;
    void this._reopenSession(reopenModeFor(e.outcome));
  }

  /**
   * A card session's segment came back status "closed", end_reason
   * "card_empty" (2.4.0). The session is already marked closed. card:empty,
   * then, unless the video has ended: pause and show "Top up your card" with
   * the card's top-up link; the retry re-opens, reading the cards again.
   */
  private _cardEmpty(): void {
    const video = this.video;
    this.cardReread = true;
    const tokenId = this.session?.cardTokenId ?? this.selectedCard?.token_id ?? null;
    const topUpUrl = this._topUpUrl(this.selectedCard?.top_up_url);
    this.emit('card:empty', { tokenId, topUpUrl });
    if (!video || video.ended) return;
    try { video.pause(); } catch { /* ignore */ }
    if (this.midPlaybackGate) return;
    const text = cardPromptText('top_up', { message: 'Your card has run out. Top up, then try again.' });
    const prompt: CardPrompt = {
      kind: 'top_up',
      url: topUpUrl,
      linkText: text.linkText,
      walletFallback: false,
      tokenId,
    };
    const contentId = this.attachedContentId ?? this.options.contentId ?? null;
    this.midPlaybackGate = _createPaymentGate(
      video,
      () => {
        this.midPlaybackGate?.remove();
        this.midPlaybackGate = null;
        void this._reopenSession(reopenModeFor('replay'));
      },
      text.title,
      text.sub,
      text.action,
      claimUrlFor(contentId ?? undefined),
      _cardGateExtras(prompt, () => {}),
    );
    _dispatchGated(video, contentId, text.title, text.sub);
    const err = new Error(text.title) as Error & { sub?: string; action?: string; card?: CardPrompt };
    err.sub = text.sub;
    err.action = text.action;
    err.card = prompt;
    this.emit('payment:required', err);
  }

  /**
   * A card session's segment came back closed for the card (2.4.1):
   * card_frozen, card_closing, card_transferred, card_not_found, or a card_*
   * reason this bundle does not know. The session is already marked closed.
   * The card is dropped and the next open reads the cards again. While the
   * media plays: pause and gate with the backend's words for the reason (no
   * approval, no card link), the retry re-opens. Paused or ended media just
   * waits: the next `play` re-opens, and the cards read then decide.
   */
  private _cardStopped(reason: string): void {
    const video = this.video;
    this.selectedCard = null;
    this.cardReread = true;
    if (!video || !mustReopenNow(video)) return;
    try { video.pause(); } catch { /* ignore */ }
    if (this.midPlaybackGate) return;
    const text = cardStoppedText(reason);
    const contentId = this.attachedContentId ?? this.options.contentId ?? null;
    this.midPlaybackGate = _createPaymentGate(
      video,
      () => {
        this.midPlaybackGate?.remove();
        this.midPlaybackGate = null;
        void this._reopenSession(reopenModeFor('replay'));
      },
      text.title,
      text.sub,
      text.action,
      claimUrlFor(contentId ?? undefined),
    );
    _dispatchGated(video, contentId, text.title, text.sub);
    const err = new Error(text.title) as Error & { sub?: string; action?: string; cause?: unknown };
    err.sub = text.sub;
    err.action = text.action;
    err.cause = new Error(reason);
    this.emit('payment:required', err);
  }

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
  private async _reopenSession(mode: ReopenMode = reopenModeFor('replay')): Promise<void> {
    const video = this.video;
    const contentId = this.attachedContentId;
    if (!video || !contentId || this.reopening) return;
    this.reopening = true;
    const wasPlaying = !video.paused && !video.ended;
    if (mode.pauseWhileReopening) {
      try { video.pause(); } catch { /* ignore */ }
    }
    const resumeAt = video.currentTime || 0;
    const refused: {
      text: { title: string; sub?: string; action?: string; card?: CardPrompt } | null;
      // The refusal came through 'payment:required', which already
      // dispatched 'jubjub:gated' on the element.
      announced: boolean;
    } = { text: null, announced: false };
    const onRequired = (e: any) => {
      refused.text = {
        title: e?.message || 'Payment required',
        sub: e?.sub,
        action: e?.action,
        card: e?.card ?? undefined,
      };
      refused.announced = true;
    };
    this.on('payment:required', onRequired);
    console.log(
      mode.pauseWhileReopening
        ? '[JubJub] Session is closed; opening a new one before playback resumes'
        : '[JubJub] Session is closed; opening a new one while playback continues',
    );
    try {
      // The old session is already closed, so disconnect() skips its close
      // call and only tears down.
      await this.disconnect().catch(() => undefined);
      await this.attach(contentId, video);
    } catch {
      if (!refused.text) {
        refused.text = {
          title: 'Payment service unavailable',
          sub: "Couldn't start a new streaming session. Please try again.",
        };
      }
    } finally {
      this.off('payment:required', onRequired);
      this.reopening = false;
    }
    if (this.session) {
      if (video.ended) {
        // The content finished while the new session was opening: close it
        // at once rather than leave it for the idle sweep.
        this._closeSessionNow('ended during reopen');
        return;
      }
      if (mode.pauseWhileReopening) {
        this._resumePlayback(video, resumeAt);
      } else if (this.contentInfo?.gated && wasPlaying) {
        // Tier 2: attach() put a fresh signed URL on the element, which reset
        // it. Put it back where it was and keep playing. Tier 1's source was
        // never touched: it is still playing.
        this._resumePlayback(video, resumeAt);
      }
      return;
    }
    // No session: the element is paused under a gate (the quiet path has not
    // paused yet). The flag stays set, so the native play button runs the
    // same re-open as the gate's button. Rule 8: blocked playback always
    // shows a prompt with the backend's words and a retry.
    try { video.pause(); } catch { /* ignore */ }
    this.sessionClosed = true;
    if (!refused.announced) {
      _dispatchGated(
        video,
        contentId,
        refused.text?.title ?? 'Stream paused',
        refused.text?.sub ?? 'Your paid session ended. Press play to start a new one.',
      );
    }
    if (this.midPlaybackGate) return;
    this.midPlaybackGate = _createPaymentGate(
      video,
      () => {
        this.midPlaybackGate?.remove();
        this.midPlaybackGate = null;
        void this._reopenSession(reopenModeFor('replay'));
      },
      refused.text?.title ?? 'Stream paused',
      refused.text?.sub ?? 'Your paid session ended. Press play to start a new one.',
      refused.text?.action,
      claimUrlFor(contentId),
      _cardGateExtras(refused.text?.card, () => {
        this.midPlaybackGate?.remove();
        this.midPlaybackGate = null;
        _walletChosen.add(video);
        void this._reopenSession(reopenModeFor('replay'));
      }),
    );
  }

  /**
   * Play from `at` once the element can. On Tier 2 attach() has just set a
   * fresh signed URL, which resets the position, so wait for its metadata
   * and seek back before playing; on Tier 1 the source is untouched.
   */
  private _resumePlayback(video: HTMLVideoElement, at: number): void {
    const go = () => {
      try {
        if (at > 0 && Number.isFinite(at) && Math.abs((video.currentTime || 0) - at) > 0.5) {
          video.currentTime = at;
        }
      } catch { /* seeking may be momentarily unavailable; ignore */ }
      video.play().catch(() => {});
    };
    if (this.contentInfo?.gated && video.readyState === 0) {
      const once = () => {
        video.removeEventListener('loadedmetadata', once);
        go();
      };
      video.addEventListener('loadedmetadata', once);
      return;
    }
    go();
  }

  async disconnect(): Promise<SessionSummary> {
    const playback = this.costTracker?.getPlaybackSeconds() ?? 0;
    const cost = this.costTracker?.getCost()?.usdc ?? 0;
    this.costTracker?.stop();
    // Tier-2: stop the re-resolve loop before the session is closed so a
    // pending refresh can't race a closed session (and won't gate on teardown).
    this.refresher?.stop();
    this.refresher = null;
    this.midPlaybackGate?.remove();
    this.midPlaybackGate = null;
    // A session already closed (by the beacon, by `ended`, or by the backend
    // at the cap or for an unpaid tab) is not closed twice: the backend would
    // refuse, and the summary below is still reported to the host.
    if (this.session && !this.sessionClosed) await this.session.close(playback);
    this.overlay?.remove();
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      window.removeEventListener('pagehide', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.resumeHandler) {
      this.video?.removeEventListener('play', this.resumeHandler);
      this.resumeHandler = null;
    }
    if (this.endedHandler) {
      this.video?.removeEventListener('ended', this.endedHandler);
      this.endedHandler = null;
    }
    const summary: SessionSummary = {
      sessionId: this.session?.id ?? '',
      seconds: playback,
      cost,
      walletAddress: this.wallet.getAddress() ?? '',
    };
    // Once per session: the ended close may already have reported it.
    this._emitSessionEnd(summary);
    this.sessionEndEmitted = false;
    this.session = null;
    this.costTracker = null;
    this.overlay = null;
    return summary;
  }

  getSession() { return this.session ? { id: this.session.id, onChainId: this.session.onChainId } : null; }
  getCost(): CostInfo { return this.costTracker?.getCost() ?? { usdc: 0, seconds: 0, formatted: '$0.0000' }; }
  getWallet() { return this.wallet.getAddress(); }
  getContentInfo() { return this.contentInfo; }
}
