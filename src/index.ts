export { JubJub } from './JubJub';
export { ApiClient, ApiHttpError, isApiHttpError } from './api/ApiClient';
export { Wallet } from './core/Wallet';
export { Approval } from './core/Approval';
export { Session } from './core/Session';
export { CostTracker } from './core/CostTracker';
export { CostOverlay } from './ui/CostOverlay';
export { EventEmitter } from './EventEmitter';
export {
  SignerClient,
  SignerError,
  isSignerError,
  signerInfoFrom,
  buildTokenedUrl,
  parseSignerTokens,
} from './core/SignerClient';
export type { PlaybackSignerInfo, SignerTokens, SignerProof } from './core/SignerClient';
export { TokenRenewer, renewDelaySeconds } from './core/TokenRenewer';
export { SourceApplier, UnplayableHereError, swapNativeSource } from './core/SourceApplier';
export type { SourceEventDetail, HlsLike, HlsCtor } from './core/SourceApplier';
export {
  FundingRequiredError,
  FundingUnverifiableError,
  fundingMessage,
  formatMicroUsdc,
  parseFundingError,
  isFundingRequiredError,
  isFundingUnverifiableError,
} from './fundingErrors';
export type { FundingRequiredReason } from './fundingErrors';
export {
  classifyWalletError,
  walletGateMessage,
  walletErrorCode,
  accountIsAuthorised,
  unauthorisedAccountError,
  isWalletError,
  UNAUTHORISED_ACCOUNT_CODE,
  STALE_CONNECTION_CODE,
} from './walletErrors';
export {
  requestAuthorisedAccount,
  reconfirmAuthorisedAccount,
  requestFreshPermission,
  staleConnectionError,
} from './walletAuthorise';
export type { WalletErrorKind } from './walletErrors';
export {
  ContentNotPlayableError,
  isContentNotPlayableError,
  parseContentNotPlayable,
  contentNotPlayableMessage,
} from './streamingErrors';
export type { ContentNotPlayableReason } from './streamingErrors';
export {
  announcedProviders,
  candidateProviders,
  describeProvider,
  selectProvider,
} from './walletProviders';
export type { Eip6963ProviderInfo, ProviderCandidate } from './walletProviders';
export {
  MEMBER_FALLBACK_NAME,
  publicProfileFrom,
  stripInternalIdentity,
  redactEmails,
} from './privacy';
export type { PublicProfile } from './privacy';
export type {
  JubJubOptions,
  JubJubInitConfig,
  ContentRegistration,
  ContentInfo,
  SessionSummary,
  CostInfo,
  WalletLike,
  SearchParams,
  SearchResultCard,
  SearchResponse,
  SourceEvent,
} from './types';

// Default export = the JubJub class. In UMD builds this becomes
// the value of window.JubJub so static methods like
// JubJub.play() and JubJub.connectBrowserWallet() work directly.
export { JubJub as default } from './JubJub';
