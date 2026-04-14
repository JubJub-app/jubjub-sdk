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
