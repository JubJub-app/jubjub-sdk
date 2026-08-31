export interface JubJubInitConfig {
    platformKey: string;
    apiUrl?: string;
    network?: 'testnet' | 'mainnet';
    /**
     * Optional EIP-1193 compatible provider. When supplied, it is used
     * instead of `window.ethereum` for all wallet operations — required
     * inside a Farcaster Mini App (pass `sdk.wallet.getEthereumProvider()`)
     * or any context where the injected wallet lives outside `window`.
     */
    provider?: any;
    /**
     * Standing USDC allowance (in whole dollars) a viewer approves ONCE, then
     * streams many sessions/videos signature-free as the operator draws it down.
     * Defaults to $10. Bounded + finite — never an unlimited approval. Re-approve
     * only happens when the remaining allowance can't cover the next session.
     */
    streamingAllowanceUsd?: number;
    /**
     * Corner for the streaming cost / "Powered by JubJub" overlay. Defaults to
     * 'bottom-right'. Captured by init() and threaded to every auto-discovered
     * video via play() (mirrors showCostOverlay), so page-level init() can
     * position it — the auto-discover path never calls play() with per-video
     * options, so init() is the only place a consumer can set this.
     */
    overlayPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}
export interface ContentRegistration {
    creator: string;
    title: string;
    mediaUrl: string;
    description?: string;
    pricePerMinute?: number;
    platformName?: string;
    platformVideoId?: string;
    platformVideoUrl?: string;
}
export interface JubJubOptions {
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
}
/** Duck-typed wallet interface — any object with address + writeContract. */
export interface WalletLike {
    account?: {
        address: string;
    } | undefined;
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
    signMessage?: (args: {
        message: string;
    }) => Promise<string>;
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
