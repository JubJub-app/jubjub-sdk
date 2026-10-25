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
/** 'auto' (default): use a card when the piece takes one, else the wallet.
 *  'wallet': never look for a card (today's approve flow).
 *  'card': cards only; the wallet fallback is never offered. */
export type PayerMode = 'auto' | 'wallet' | 'card';
/** One card as GET /v2/public/cards?holder= serves it (read live). */
export interface CardInfo {
    token_id: number;
    holder: string;
    /** Micro-USDC (6 decimals). */
    balance_micro: number;
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
export type SelectCardHook = (cards: CardInfo[]) => CardInfo | number | null | undefined | Promise<CardInfo | number | null | undefined>;
/** What attach() does after Steps 2 and 3 when the piece takes cards. */
export type CardDecision = 
/** A usable card covers a minute: skip approval, open with card_token_id. */
{
    kind: 'card';
    card: CardInfo;
    qualifying: CardInfo[];
}
/** Cards exist but none covers a minute: "Top up your card". */
 | {
    kind: 'top_up';
    card: CardInfo;
}
/** No card at all: "Get a card", with the wallet fallback unless mode 'card'. */
 | {
    kind: 'get_card';
};
/** One card from the wire. Null when it has no token id. Never throws. */
export declare function toCardInfo(raw: unknown): CardInfo | null;
/** The cards route body as the SDK reads it. Never throws. */
export declare function parseCardsResponse(raw: unknown): CardsResponse;
/**
 * The card minimum at open: one minute at the content's price. playback-info
 * serves it as one_minute_micro; an older payload is computed from the price
 * (rounded up, so the SDK never asks for less than the backend will).
 */
export declare function oneMinuteMicro(info: {
    one_minute_micro?: number | null;
    price_per_minute_usdc?: number | null;
}): number;
/** Usable and covers one minute, highest balance first. */
export declare function qualifyingCards(cards: CardInfo[], minimumMicro: number): CardInfo[];
/**
 * The decision table (Tom, 2026-10-25), given the cards the wallet holds:
 *   a usable card covering one minute -> 'card' (several: highest balance,
 *     unless onSelectCard picks another of them);
 *   cards, none covering a minute     -> 'top_up' (the highest-balance usable
 *     card, else the highest-balance card);
 *   no card                           -> 'get_card'.
 * A card that is frozen or closing is not "no card": its holder is asked to
 * top up (or sees the backend's words on open), never to buy another.
 */
export declare function decideCard(cards: CardInfo[], minimumMicro: number, onSelectCard?: SelectCardHook | null): Promise<CardDecision>;
/**
 * Append `return=<encoded page url>` to a hosted card link: `&` when the link
 * already has a query (mint_url carries ?site=), `?` otherwise (top_up_url).
 * No page url: the link as served.
 */
export declare function withReturn(url: string, pageUrl: string | null | undefined): string;
/**
 * GET {apiUrl}/v2/public/cards?holder=<address>. The platform key, when
 * init() was given one, names the site so the mint link carries its
 * referral. Throws on a non-2xx answer; the caller gates (never guesses).
 */
export declare function fetchCards(apiUrl: string, holder: string, platformKey?: string | null): Promise<CardsResponse>;
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
export declare function cardPromptText(kind: CardPromptKind, amounts?: {
    balanceMicro?: number | null;
    requiredMicro?: number | null;
    message?: string | null;
}): {
    title: string;
    sub: string;
    linkText: string;
    action: string;
};
/**
 * The overlay's card line: what the card can still cover for this session
 * (card_balance_micro at open, minus the cost so far) and the per-second
 * price. Amounts come from the backend and the content's price.
 */
export declare function cardOverlayText(cardBalanceMicro: number, costUsdc: number, pricePerMinuteUsdc: number): {
    remaining: string;
    perSecond: string;
    remainingUsdc: number;
};
