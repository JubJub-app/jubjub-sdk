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
}

export interface ContentRegistration {
  creator: string;       // email or wallet address
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
  account?: { address: string } | undefined;
  address?: string | undefined;
  writeContract: (args: any) => Promise<`0x${string}`>;
}

export interface ContentInfo {
  content_id: string;
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
