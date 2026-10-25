import type { FundingRequiredError } from './fundingErrors';
import type { PublicProfile } from './privacy';
import type { CardInfo, PayerMode, SelectCardHook } from './core/Card';

export type { CardInfo, PayerMode, SelectCardHook } from './core/Card';

/** The card options, on init() (page-wide) and per instance (2.4.0). */
export interface CardPaymentConfig {
  /**
   * How a viewer pays where the piece takes cards (playback-info
   * card_accepted: true). 'auto' (default): a funded card just watches, no
   * card shows "Get a card" with "Pay from your wallet instead". 'wallet':
   * never look for a card. 'card': cards only, never the wallet fallback.
   * Where card_accepted is false or absent, every mode runs today's approve
   * flow unchanged.
   */
  payerMode?: PayerMode;
  /**
   * Called only when several cards each cover one minute, highest balance
   * first. Return one of them (or its token_id); anything else keeps the
   * highest balance.
   */
  onSelectCard?: SelectCardHook;
}

export interface JubJubInitConfig extends CardPaymentConfig {
  platformKey: string;
  apiUrl?: string;
  network?: 'testnet' | 'mainnet';
  /**
   * 2.5.0, default true. A viewer who proves their wallet on this site is
   * not asked to sign again here for 30 days: the SDK keeps a
   * non-extractable device key in this site's IndexedDB and the backend
   * remembers the sign-in for this site and wallet. A wallet switch or
   * disconnect (or JubJub.resetWallet()) forgets it. Where the wallet
   * supports it (Coinbase / Base), connecting and signing in are one prompt.
   * false: sign each page visit, as before 2.5.0.
   */
  rememberSignIn?: boolean;
  /**
   * Optional EIP-1193 compatible provider. When supplied, it is used
   * instead of `window.ethereum` for all wallet operations — required
   * inside a Farcaster Mini App (pass `sdk.wallet.getEthereumProvider()`)
   * or any context where the injected wallet lives outside `window`.
   */
  provider?: any;
  /**
   * With several wallet extensions installed, the EIP-6963 `rdns` of the one
   * to use (for example 'io.metamask', 'com.coinbase.wallet', 'io.rabby').
   * Without it the SDK picks the only announced wallet, else the one already
   * connected to this site, else `window.ethereum` with a console warning.
   * Ignored when `provider` is passed.
   */
  walletRdns?: string;
  /**
   * Standing USDC allowance (in whole dollars) a viewer approves ONCE, then
   * streams many sessions/videos signature-free as the operator draws it down.
   * Defaults to $10. Bounded + finite — never an unlimited approval. Re-approve
   * only happens when the remaining allowance can't cover the next session.
   */
  streamingAllowanceUsd?: number;
  /**
   * Show the streaming cost / "Powered by JubJub" overlay on every
   * auto-discovered video. Defaults to true. Captured by init() and threaded
   * to every video via play(); a per-video JubJubOptions.showCostOverlay
   * wins over it. Honoured since 2.1.x; typed here from 2.1.6.
   */
  showCostOverlay?: boolean;
  /**
   * Corner for the streaming cost / "Powered by JubJub" overlay. Defaults to
   * 'bottom-right'. Captured by init() and threaded to every auto-discovered
   * video via play() (mirrors showCostOverlay), so page-level init() can
   * position it — the auto-discover path never calls play() with per-video
   * options, so init() is the only place a consumer can set this.
   */
  overlayPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /**
   * A JubJub session token (`jj_…`) the host page already holds, e.g. from
   * POST /v2/auth/register-viewer after its own SIWE sign-in. When set, the
   * SDK sends it on every streaming call and SKIPS its own per-video
   * wallet-signature step, so a viewer who has signed in once is never
   * prompted again to prove the same wallet. Also settable later via
   * JubJub.setSessionToken(). Never persisted by the SDK.
   */
  sessionToken?: string;
}

export interface ContentRegistration {
  /**
   * Email or wallet address of the creator, supplied by the integrating
   * developer. Sent to JubJub to register the piece and NEVER re-exposed:
   * it is not logged, emitted, written to the DOM or returned to viewers.
   */
  creator: string;
  title: string;
  mediaUrl: string;
  description?: string;
  pricePerMinute?: number;
  platformName?: string;
  platformVideoId?: string;
  platformVideoUrl?: string;
}

export interface JubJubOptions extends CardPaymentConfig {
  contentId?: string;
  wallet?: WalletLike;
  apiUrl?: string;
  network?: 'testnet' | 'mainnet';
  showCostOverlay?: boolean;
  overlayPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  onCostUpdate?: (cost: number, seconds: number) => void;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: (summary: SessionSummary) => void;
  onError?: (error: Error) => void;
  onWalletConnected?: (address: string) => void;
  /**
   * The backend refused to open (or keep refreshing) a session because the
   * viewer's USDC allowance or balance is below the minimum, an unpaid tab is
   * owed, or for a reason this bundle predates (HTTP 402, reason 'unknown',
   * the backend's message carried). Same payload as the 'funding:required'
   * event. The built-in gate is shown regardless; a host rendering its own UI
   * can use fundingMessage(err).
   */
  onFundingRequired?: (error: FundingRequiredError) => void;
  /** Per-instance override of the page-level token — see JubJubInitConfig.sessionToken. */
  sessionToken?: string;
}

/** Duck-typed wallet interface — any object with address + writeContract. */
export interface WalletLike {
  account?: { address: string } | undefined;
  address?: string | undefined;
  writeContract: (args: any) => Promise<`0x${string}`>;
  /**
   * Sign a plain message (EIP-191 personal_sign). Shape matches viem's
   * WalletClient.signMessage, which is what a BYO client is in practice.
   *
   * OPTIONAL so this type change breaks no existing integrator at compile
   * time — but it is REQUIRED at runtime from the release that proves wallet
   * ownership on viewer-session (K1-1d). A client without it fails closed
   * with an actionable error rather than silently minting an unproven token.
   */
  signMessage?: (args: { message: string }) => Promise<string>;
}

export interface ContentInfo {
  content_id: string;
  /**
   * Opaque, short-lived authorisation to open a streaming session for this
   * content (K1-2). Minted by the playback-info fetch and echoed back on
   * session create, so the backend — not the caller — chooses the
   * destination contract. Treat as opaque: never parse or construct it.
   * Absent when talking to a backend that predates grants.
   */
  playback_grant?: string | null;
  title: string | null;
  price_per_minute_usdc: number;
  content_contract: string | null;
  payment_router: string;
  usdc_address: string;
  chain_id: number;
  chain_name?: string;
  /**
   * Tier signal. Absent/false → Tier 1: the in-page <video src> is used as
   * is (SDK never touches video.src). True → Tier 2: after payment is
   * secured, the SDK resolves a short-lived, session-scoped signed URL from
   * the backend and sets it as the source. This payload carries no stream URL.
   */
  gated?: boolean;
  /**
   * The creator as a viewer may see them: public display name (else
   * "JubJub member"), avatar, handle, opaque member_ref. Absent when the
   * backend says nothing about the creator. Never a profile id or email:
   * those are internal and are dropped by the SDK even if a backend sends them.
   */
  creator?: PublicProfile;
  /**
   * Card fields (2.4.0). Each is present only when the backend sent it, so a
   * payload from an older backend reads exactly as before.
   * card_accepted: this piece's catalogue takes card payments; anything but
   * true runs today's approve flow. card_contract: the card on this chain
   * (never hardcoded in the SDK). one_minute_micro: the card minimum at open.
   */
  card_contract?: string | null;
  card_accepted?: boolean;
  card_min_mint_usdc?: number | null;
  card_page_url?: string | null;
  one_minute_micro?: number;
}

/** POST /v2/streaming/sessions as the SDK reads it (card fields 2.4.0). */
export interface StreamingSessionResult {
  sessionId: string;
  onChainSessionId: string;
  /** 'card' on a card session; absent otherwise. */
  rail?: string;
  cardTokenId?: number | null;
  /** What the card can still cover for this session at open, micro-USDC. */
  cardBalanceMicro?: number | null;
}

/** Payloads of the card events (2.4.0). */
export interface CardDetectedEvent {
  cards: CardInfo[];
  /** The hosted mint page, return= appended. */
  mintUrl: string | null;
}
export interface CardLowEvent {
  tokenId: number | null;
  balanceMicro: number | null;
  requiredMicro: number | null;
  /** The hosted top-up page, return= appended. */
  topUpUrl: string | null;
}
export interface CardEmptyEvent {
  tokenId: number | null;
  topUpUrl: string | null;
}

/**
 * The body of POST /v2/streaming/sessions/{id}/segment (backend
 * SegmentResponse). `status` is "active" while the session meters; any other
 * value means the backend closed it and no segment may be sent to it again.
 * `end_reason` names why (today "cap_reached" when the next segment would have
 * taken the session over its $2.00 cap, "tab_unpaid", or null). Added in
 * 2.2.0; an older backend omits `end_reason`, and before 2.2.0 the SDK read
 * none of this body.
 */
export interface SegmentResponse {
  session_id: string;
  segment_count: number;
  amount_settled: number;
  status: string;
  end_reason?: string | null;
}

export interface SessionSummary {
  sessionId: string;
  seconds: number;
  cost: number;
  walletAddress: string;
}

export interface CostInfo {
  usdc: number;
  seconds: number;
  formatted: string;
}

/** Filters for catalogue search. All optional; omit everything to browse
 *  the newest discoverable content. Facet names mirror the backend's
 *  whitelist — unknown facets are ignored server-side, never errors. */
export interface SearchParams {
  /** Free-text tokens matched against topics, domain, sub-domain and title. */
  topic?: string;
  domain?: string;
  subDomain?: string;
  contentType?: string;
  pacing?: string;
  movementIntensity?: string;
  facePresent?: boolean;
  musicPresent?: boolean;
  speechPresent?: boolean;
  onScreenText?: boolean;
  /** Max results (server caps at 100). */
  limit?: number;
  /** Opaque bookmark from a previous response's next_cursor — pass it back
   *  verbatim to continue. */
  cursor?: string | null;
  /** Also return minted pieces indexed with no extracted metadata: imports
   *  registered for revenue, which live on their platform (see the card's
   *  `platform_video_url`). Off by default; a viewer surface turns it on. */
  includeUnanalysed?: boolean;
}

/** One discoverable catalogue card. Owner identifiers are stripped
 *  server-side AND again by the SDK (any profile id / email key is removed);
 *  thumbnail_url is resolved server-side when available. */
export interface SearchResultCard {
  content_id: string;
  title?: string;
  thumbnail_id?: string;
  thumbnail_url?: string;
  domain?: string;
  sub_domain?: string;
  content_type?: string;
  topics?: string[];
  [key: string]: unknown;
}

export interface SearchResponse {
  results: SearchResultCard[];
  count: number;
  scope: string;
  /** null exactly when the discoverable corpus is exhausted. */
  next_cursor: string | null;
}

/**
 * DOM events the SDK dispatches on the <video> element itself (2.3.0), so a
 * declarative host (data-jubjub-content-id, no handle on the instance the
 * auto-discovery creates) can tell when payment is secured.
 *
 * A host playing a paid Tier 1 piece keeps the media URL OFF the element and
 * sets it only on 'jubjub:armed'; then a missing or failed SDK can never mean
 * free playback. Tier 2 (gated) pieces need nothing: the SDK sets the signed
 * URL itself before this event.
 */
export const JUBJUB_ARMED_EVENT = 'jubjub:armed' as const;
export const JUBJUB_GATED_EVENT = 'jubjub:gated' as const;

/**
 * detail of 'jubjub:armed'. Dispatched synchronously when a streaming session
 * is open and the SDK is about to (re)start playback: before the SDK's own
 * video.play(), at the same moment the instance emits 'ready'. Once per
 * arming; again after a later re-arm (a replay, a cap rollover, a retry after
 * a gate).
 */
export interface JubJubArmedDetail {
  contentId: string;
  /** The piece's Tier 2 flag (ContentInfo.gated). */
  gated: boolean;
}

/**
 * detail of 'jubjub:gated'. Dispatched when the SDK refuses playback because
 * payment is not secured: the same moment it emits 'payment:required' or
 * shows its retry gate. title and sub are the gate's words.
 */
export interface JubJubGatedDetail {
  /** null only for an auto-registered piece whose registration failed. */
  contentId: string | null;
  title: string;
  sub: string;
}
