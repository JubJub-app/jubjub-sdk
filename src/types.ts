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
