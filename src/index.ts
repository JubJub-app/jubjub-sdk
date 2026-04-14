export { JubJub } from './JubJub';
export { ApiClient } from './api/ApiClient';
export { Wallet } from './core/Wallet';
export { Approval } from './core/Approval';
export { Session } from './core/Session';
export { CostTracker } from './core/CostTracker';
export { CostOverlay } from './ui/CostOverlay';
export { EventEmitter } from './EventEmitter';
export type {
  JubJubOptions,
  ContentInfo,
  SessionSummary,
  CostInfo,
  WalletLike,
} from './types';

// UMD builds — Vite's library mode handles the global assignment via
// the `name: 'JubJub'` config. For ESM consumers this is a no-op.
