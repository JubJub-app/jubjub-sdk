/**
 * The JubJub card (2.4.0): a viewer whose wallet holds a funded card just
 * watches. No approval, no popup, no message; the session opens with the
 * card's token id and the existing segment metering charges only while the
 * video plays (Tom, 2026-10-25; movie_system_jubjub
 * docs/design/card-rail-api.md).
 *
 * This module is pure apart from fetchCards(): parsing the cards route,
 * choosing a card, deciding what attach() does, and the prompt text. JubJub.ts
 * applies the decision to the <video>. Unit-tested in test/card.test.ts.
 *
 * The card contract address is never hardcoded here: the backend reads the
 * cards live from the chain and serves them through GET /v2/public/cards.
 */
import { PREFLIGHT_FLOOR_MICRO } from '../allowancePolicy';

/** 'auto' (default): use a card when the piece takes one, else the wallet.
 *  'wallet': never look for a card (today's approve flow).
 *  'card': cards only; the wallet fallback is never offered. */
export type PayerMode = 'auto' | 'wallet' | 'card';

/** One card as GET /v2/public/cards?holder= serves it (read live). */
export interface CardInfo {
  token_id: number;
  holder: string;
  /**
   * What the card can really spend, micro-USDC (6 decimals): the backend's
   * available_micro, its on-chain balance less viewing already watched but not
   * yet charged (cards are charged in batches). Every decision and every
   * figure shown uses this. Older backends send no available_micro, and then
   * it is the on-chain balance.
   */
  balance_micro: number;
  /** The on-chain balance (2.5.1). */
  onchain_balance_micro: number;
  /** Watched, not yet charged (2.5.1; 0 from older backends). */
  pending_micro: number;
  frozen: boolean;
  /** Unix seconds; 0 = no burn requested. */
  burn_requested_at: number;
  burnable_at: number | null;
  edition: number | null;
  referrer: string | null;
  /** Held by holder, not frozen, no burn pending, balance > 0 (backend). */
  usable: boolean;
  /** https://studio.jubjubapp.com/card/<token_id>; the SDK appends ?return=. */
  top_up_url: string | null;
}

export interface CardsResponse {
  holder: string | null;
  /** Highest balance first (the backend sorts; the SDK sorts again). */
  cards: CardInfo[];
  /** https://studio.jubjubapp.com/card?site=<key_id>; the SDK appends &return=. */
  mint_url: string | null;
  site: string | null;
}

/**
 * The host's say when several cards each cover a minute. Called with those
 * cards, highest balance first. Return one of them (or its token_id) to use
 * it; anything else keeps the default, the highest balance.
 */
export type SelectCardHook = (
  cards: CardInfo[],
) => CardInfo | number | null | undefined | Promise<CardInfo | number | null | undefined>;

/** What attach() does after Steps 2 and 3 when the piece takes cards. */
export type CardDecision =
  /** A usable card covers a minute: skip approval, open with card_token_id. */
  | { kind: 'card'; card: CardInfo; qualifying: CardInfo[] }
  /** Cards exist but none covers a minute: "Top up your card". */
  | { kind: 'top_up'; card: CardInfo }
  /**
   * 2.4.1: no usable card, and the wallet's card is frozen or has a burn
   * pending. Topping up cannot fix that, so the gate shows the backend's
   * words for it (card-rail-api.md: "stop and show the backend's message").
   */
  | { kind: 'blocked'; card: CardInfo; reason: CardBlockReason }
  /** No card at all: "Get a card", with the wallet fallback unless mode 'card'. */
  | { kind: 'get_card' };

function int(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** One card from the wire. Null when it has no token id. Never throws. */
export function toCardInfo(raw: unknown): CardInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const tokenId = int(r.token_id, NaN);
  if (!Number.isFinite(tokenId) || tokenId < 0) return null;
  const edition = int(r.edition, NaN);
  const burnableAt = int(r.burnable_at, NaN);
  return {
    token_id: tokenId,
    holder: typeof r.holder === 'string' ? r.holder : '',
    balance_micro: Math.max(0, int(r.available_micro ?? r.balance_micro)),
    onchain_balance_micro: Math.max(0, int(r.balance_micro)),
    pending_micro: Math.max(0, int(r.pending_micro)),
    frozen: r.frozen === true,
    burn_requested_at: int(r.burn_requested_at),
    burnable_at: Number.isFinite(burnableAt) ? burnableAt : null,
    edition: Number.isFinite(edition) ? edition : null,
    referrer: str(r.referrer),
    usable: r.usable === true,
    top_up_url: str(r.top_up_url),
  };
}

/** The cards route body as the SDK reads it. Never throws. */
export function parseCardsResponse(raw: unknown): CardsResponse {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const cards = Array.isArray(r.cards)
    ? (r.cards.map(toCardInfo).filter(Boolean) as CardInfo[])
    : [];
  return {
    holder: str(r.holder),
    cards: byBalance(cards),
    mint_url: str(r.mint_url),
    site: str(r.site),
  };
}

function byBalance(cards: CardInfo[]): CardInfo[] {
  return [...cards].sort((a, b) => b.balance_micro - a.balance_micro);
}

/**
 * The card minimum at open: one minute at the content's price. playback-info
 * serves it as one_minute_micro; an older payload is computed from the price
 * (rounded up, so the SDK never asks for less than the backend will).
 */
export function oneMinuteMicro(info: {
  one_minute_micro?: number | null;
  price_per_minute_usdc?: number | null;
}): number {
  const served = int(info.one_minute_micro, NaN);
  if (Number.isFinite(served) && served > 0) return served;
  const price = Number(info.price_per_minute_usdc);
  return Number.isFinite(price) && price > 0 ? Math.ceil(price * 1_000_000) : 0;
}

/** Usable and covers one minute, highest balance first. */
export function qualifyingCards(cards: CardInfo[], minimumMicro: number): CardInfo[] {
  return byBalance(cards).filter((c) => c.usable && c.balance_micro >= minimumMicro);
}

/**
 * The decision table (Tom, 2026-10-25), given the cards the wallet holds:
 *   a usable card covering one minute -> 'card' (several: highest balance,
 *     unless onSelectCard picks another of them);
 *   cards, none covering a minute     -> 'top_up' (the highest-balance usable
 *     card, else the highest-balance card);
 *   no usable card, one frozen or with a burn pending
 *                                     -> 'blocked' (2.4.1: the backend's words
 *     for it; topping up a frozen card cannot let it pay);
 *   no card                           -> 'get_card'.
 * A card that is frozen or closing is not "no card": its holder is never
 * asked to buy another.
 */
export async function decideCard(
  cards: CardInfo[],
  minimumMicro: number,
  onSelectCard?: SelectCardHook | null,
): Promise<CardDecision> {
  const sorted = byBalance(cards);
  if (sorted.length === 0) return { kind: 'get_card' };
  const qualifying = qualifyingCards(sorted, minimumMicro);
  if (qualifying.length === 0) {
    const usable = sorted.find((c) => c.usable);
    if (usable) return { kind: 'top_up', card: usable };
    const held = sorted.find((c) => c.frozen || c.burn_requested_at > 0);
    if (held) return { kind: 'blocked', card: held, reason: held.frozen ? 'card_frozen' : 'card_closing' };
    return { kind: 'top_up', card: sorted[0] };
  }
  let card = qualifying[0];
  if (qualifying.length > 1 && typeof onSelectCard === 'function') {
    try {
      const picked = await onSelectCard(qualifying.slice());
      const id =
        typeof picked === 'number' ? picked : picked && typeof picked === 'object' ? picked.token_id : null;
      const match = id == null ? undefined : qualifying.find((c) => c.token_id === id);
      if (match) card = match;
    } catch (e) {
      console.warn('[JubJub] onSelectCard threw; using the highest-balance card', e);
    }
  }
  return { kind: 'card', card, qualifying };
}

/**
 * Append `return=<encoded page url>` to a hosted card link: `&` when the link
 * already has a query (mint_url carries ?site=), `?` otherwise (top_up_url).
 * No page url: the link as served.
 */
export function withReturn(url: string, pageUrl: string | null | undefined): string {
  if (!pageUrl) return url;
  const hashAt = url.indexOf('#');
  const base = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const hash = hashAt >= 0 ? url.slice(hashAt) : '';
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}return=${encodeURIComponent(pageUrl)}${hash}`;
}

/**
 * GET {apiUrl}/v2/public/cards?holder=<address>. The platform key, when
 * init() was given one, names the site so the mint link carries its
 * referral. Throws on a non-2xx answer; the caller gates (never guesses).
 */
export async function fetchCards(
  apiUrl: string,
  holder: string,
  platformKey?: string | null,
): Promise<CardsResponse> {
  const base = apiUrl.replace(/\/+$/, '');
  const headers: Record<string, string> = {};
  if (platformKey) headers['X-JubJub-Platform-Key'] = platformKey;
  const res = await fetch(`${base}/v2/public/cards?holder=${encodeURIComponent(holder)}`, { headers });
  if (!res.ok) throw new Error(`Cards lookup failed: ${res.status}`);
  return parseCardsResponse(await res.json());
}

/** "$1.25" from micro USDC. */
function usd(micro: number): string {
  const n = Number(micro);
  return `$${(Number.isFinite(n) ? n / 1_000_000 : 0).toFixed(2)}`;
}

/** Why a held card cannot pay at detection (2.4.1). */
export type CardBlockReason = 'card_frozen' | 'card_closing';

/**
 * A card session the backend ended for the card itself (2.4.1): a segment
 * answered end_reason card_empty, card_frozen, card_closing, card_transferred
 * or card_not_found. Never set on a hub session.
 */
export function isCardEndReason(endReason: unknown): boolean {
  return typeof endReason === 'string' && /^card_[a-z_]+$/.test(endReason);
}

/**
 * The gate for a card that cannot pay for a reason a top-up does not fix:
 * frozen, closing (burn requested), transferred away, not found, or a
 * card_* reason this bundle does not know. The sub is the backend's own
 * message for that reason (card_funding.py _MESSAGES), so the words match
 * what the open gate says. No approval, no card link: the retry reads the
 * cards again.
 */
export function cardStoppedText(reason: string): { title: string; sub: string; action: string } {
  switch (reason) {
    case 'card_frozen':
      return {
        title: 'Your card is frozen',
        sub: 'This card is frozen. Unfreeze it on your card page to watch with it.',
        action: 'Try again',
      };
    case 'card_closing':
      return {
        title: 'Your card is closing',
        sub: "This card is being redeemed, so it can't pay for viewing. Cancel the redemption to watch with it.",
        action: 'Try again',
      };
    case 'card_transferred':
      return {
        title: 'This card is no longer in your wallet',
        sub: 'Your wallet no longer holds this card. Try again to look for another card.',
        action: 'Try again',
      };
    case 'card_not_found':
      return {
        title: "We couldn't find your card",
        sub: "That card doesn't exist. Try again to look for another card.",
        action: 'Try again',
      };
    default:
      return {
        title: 'Your card stopped paying',
        sub: 'This card cannot pay for streaming right now. Try again once this is resolved.',
        action: 'Try again',
      };
  }
}

/** The two prompts a card holder (or would-be holder) can see. */
export type CardPromptKind = 'top_up' | 'get_card';

/** What the SDK attaches to a 'payment:required' error that is a card prompt. */
export interface CardPrompt {
  /** 'unavailable': the cards could not be read; url is null, retry. */
  kind: CardPromptKind | 'unavailable';
  /** The hosted page, with return= already appended. Opens in a new tab. */
  url: string | null;
  /** The link's words: "Top up your card" or "Get a card". */
  linkText: string;
  /** True when "Pay from your wallet instead" is offered (auto mode, no card). */
  walletFallback: boolean;
  tokenId: number | null;
}

export function cardPromptText(
  kind: CardPromptKind,
  amounts: { balanceMicro?: number | null; requiredMicro?: number | null; message?: string | null } = {},
): { title: string; sub: string; linkText: string; action: string } {
  if (kind === 'top_up') {
    const said = typeof amounts.message === 'string' && amounts.message.trim() ? amounts.message.trim() : null;
    const has = amounts.balanceMicro != null ? `Your card holds ${usd(amounts.balanceMicro)}. ` : '';
    const needs =
      amounts.requiredMicro != null && amounts.requiredMicro > 0
        ? `Watching needs at least ${usd(amounts.requiredMicro)}. `
        : '';
    return {
      title: 'Top up your card',
      sub: said ?? `${has}${needs}Top up, then try again.`.trim(),
      linkText: 'Top up your card',
      action: 'Try again',
    };
  }
  return {
    title: 'Get a card to watch',
    sub: 'A JubJub card pays for videos as you watch them, with nothing to approve.',
    linkText: 'Get a card',
    action: 'Try again',
  };
}

/**
 * The one line a card holder reads beside their balance (Tom, 2026-10-26):
 * why the balance moves in steps rather than every second.
 */
export const CARD_BATCH_NOTE =
  "You're only charged for what you watch. Charges are grouped together to keep network fees low, so your balance updates in batches.";

/**
 * The overlay's card line: what the card can still cover for this session
 * (card_balance_micro at open, minus the cost so far) and the per-second
 * price. Amounts come from the backend and the content's price.
 */
export function cardOverlayText(
  cardBalanceMicro: number,
  costUsdc: number,
  pricePerMinuteUsdc: number,
): { remaining: string; perSecond: string; remainingUsdc: number } {
  const start = Number(cardBalanceMicro) / 1_000_000;
  const spent = Number(costUsdc);
  const remainingUsdc = Math.max(0, (Number.isFinite(start) ? start : 0) - (Number.isFinite(spent) ? spent : 0));
  const perSecond = Number(pricePerMinuteUsdc) / 60;
  return {
    remaining: `Card $${remainingUsdc.toFixed(2)} left`,
    perSecond: `$${(Number.isFinite(perSecond) ? perSecond : 0).toFixed(4)}/s`,
    remainingUsdc,
  };
}

/**
 * Whether "Top up your card" also offers "Pay from your wallet instead"
 * (Tom, 2026-10-26): in auto payer mode, when the wallet's standing approval
 * already covers the $0.50 floor, so the fallback asks for no approval.
 * `allowanceMicro` null means the allowance could not be read: no offer.
 */
export function offerWalletOnTopUp(mode: string, allowanceMicro: bigint | null): boolean {
  return mode === 'auto' && allowanceMicro !== null && allowanceMicro >= PREFLIGHT_FLOOR_MICRO;
}
