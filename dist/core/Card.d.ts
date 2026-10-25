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
/**
 * 2.4.1: no usable card, and the wallet's card is frozen or has a burn
 * pending. Topping up cannot fix that, so the gate shows the backend's
 * words for it (card-rail-api.md: "stop and show the backend's message").
 */
 | {
    kind: 'blocked';
    card: CardInfo;
    reason: CardBlockReason;
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
 *   no usable card, one frozen or with a burn pending
 *                                     -> 'blocked' (2.4.1: the backend's words
 *     for it; topping up a frozen card cannot let it pay);
 *   no card                           -> 'get_card'.
 * A card that is frozen or closing is not "no card": its holder is never
 * asked to buy another.
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
/** Why a held card cannot pay at detection (2.4.1). */
export type CardBlockReason = 'card_frozen' | 'card_closing';
/**
 * A card session the backend ended for the card itself (2.4.1): a segment
 * answered end_reason card_empty, card_frozen, card_closing, card_transferred
 * or card_not_found. Never set on a hub session.
 */
export declare function isCardEndReason(endReason: unknown): boolean;
/**
 * The gate for a card that cannot pay for a reason a top-up does not fix:
 * frozen, closing (burn requested), transferred away, not found, or a
 * card_* reason this bundle does not know. The sub is the backend's own
 * message for that reason (card_funding.py _MESSAGES), so the words match
 * what the open gate says. No approval, no card link: the retry reads the
 * cards again.
 */
export declare function cardStoppedText(reason: string): {
    title: string;
    sub: string;
    action: string;
};
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
 * The one line a card holder reads beside their balance (Tom, 2026-10-26):
 * why the balance moves in steps rather than every second.
 */
export declare const CARD_BATCH_NOTE = "You're only charged for what you watch. Charges are grouped together to keep network fees low, so your balance updates in batches.";
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
/**
 * Whether "Top up your card" also offers "Pay from your wallet instead"
 * (Tom, 2026-10-26): in auto payer mode, when the wallet's standing approval
 * already covers the $0.50 floor, so the fallback asks for no approval.
 * `allowanceMicro` null means the allowance could not be read: no offer.
 */
export declare function offerWalletOnTopUp(mode: string, allowanceMicro: bigint | null): boolean;
