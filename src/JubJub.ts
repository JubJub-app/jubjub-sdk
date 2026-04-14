import { EventEmitter } from './EventEmitter';
import { ApiClient } from './api/ApiClient';
import { Wallet } from './core/Wallet';
import { Approval } from './core/Approval';
import { Session } from './core/Session';
import { CostTracker } from './core/CostTracker';
import { CostOverlay } from './ui/CostOverlay';
import type {
  JubJubOptions,
  ContentInfo,
  SessionSummary,
  CostInfo,
} from './types';

const DEFAULT_API_URL = 'https://api.jubjubapp.com';

const DEFAULTS: Required<
  Omit<JubJubOptions, 'contentId' | 'wallet' | 'onCostUpdate' | 'onSessionStart' | 'onSessionEnd' | 'onError' | 'onWalletConnected'>
> & { contentId: string | undefined; wallet: any } = {
  contentId: undefined,
  wallet: undefined,
  apiUrl: DEFAULT_API_URL,
  network: 'testnet',
  showCostOverlay: true,
  overlayPosition: 'bottom-right',
};

export class JubJub extends EventEmitter {
  private options: JubJubOptions;
  private api: ApiClient;
  private wallet: Wallet;
  private approval: Approval | null = null;
  private session: Session | null = null;
  private costTracker: CostTracker | null = null;
  private overlay: CostOverlay | null = null;
  private contentInfo: ContentInfo | null = null;
  private video: HTMLVideoElement | null = null;
  private beforeUnloadHandler: (() => void) | null = null;

  constructor(options: JubJubOptions = {}) {
    super();
    this.options = { ...DEFAULTS, ...options };
    this.api = new ApiClient(this.options.apiUrl ?? DEFAULT_API_URL);
    this.wallet = new Wallet(this.options.wallet ?? undefined);

    // Wire convenience callbacks to events
    if (options.onCostUpdate) this.on('cost', (c: CostInfo) => options.onCostUpdate!(c.usdc, c.seconds));
    if (options.onSessionStart) this.on('session:start', options.onSessionStart);
    if (options.onSessionEnd) this.on('session:end', options.onSessionEnd);
    if (options.onError) this.on('error', options.onError);
    if (options.onWalletConnected) this.on('wallet:connected', options.onWalletConnected);
  }

  /**
   * Zero-config shorthand — two lines to add streaming payments.
   *
   * ```js
   * JubJub.play('cnt_xxx', document.getElementById('video'));
   * ```
   */
  static play(
    contentId: string,
    video: HTMLVideoElement,
    options: JubJubOptions = {},
  ): JubJub {
    const sdk = new JubJub({ ...options, contentId });
    sdk.attach(contentId, video).catch((err) => {
      sdk.emit('error', err);
      console.error('[JubJub]', err);
    });
    return sdk;
  }

  /**
   * Full async setup flow — resolves when streaming is active.
   */
  async attach(contentId: string, video: HTMLVideoElement): Promise<void> {
    this.video = video;

    try {
      // 1. Fetch content + chain config
      this.contentInfo = await this.api.getPlaybackInfo(contentId);
      this.emit('content:loaded', this.contentInfo);

      // 2. Connect wallet
      const address = await this.wallet.connect();
      this.emit('wallet:connected', address);

      // 3. Create viewer session (get jj_ token)
      await this.api.createViewerSession(contentId, address);

      // 4. Approve USDC if needed
      this.approval = new Approval(this.wallet, {
        usdc_address: this.contentInfo.usdc_address,
        payment_router: this.contentInfo.payment_router,
        chain_id: this.contentInfo.chain_id,
      });
      const didApprove = await this.approval.ensureApproved();
      if (didApprove) {
        this.emit('approved', address);
      }

      // 5. Create streaming session
      this.session = await Session.create(contentId, address, this.api);
      this.emit('session:start', this.session.id);
      this.options.onSessionStart?.(this.session.id);

      // 6. Cost tracker
      this.costTracker = new CostTracker(
        video,
        this.contentInfo.price_per_minute_usdc,
        this.session,
        this.api,
      );

      this.costTracker.on('cost', (cost: CostInfo) => {
        this.emit('cost', cost);
        this.overlay?.update(cost);
      });

      this.costTracker.start();

      // 7. Overlay
      if (this.options.showCostOverlay !== false) {
        this.overlay = new CostOverlay(
          video,
          this.options.overlayPosition ?? 'bottom-right',
        );
      }

      // 8. Beacon close on tab close
      this.beforeUnloadHandler = () => {
        if (this.session && this.costTracker) {
          this.session.beaconClose(this.costTracker.getPlaybackSeconds());
        }
      };
      window.addEventListener('beforeunload', this.beforeUnloadHandler);

      // 9. Ready
      this.emit('ready');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Gracefully end the streaming session.
   */
  async disconnect(): Promise<SessionSummary> {
    const playback = this.costTracker?.getPlaybackSeconds() ?? 0;
    const cost = this.costTracker?.getCost()?.usdc ?? 0;

    this.costTracker?.stop();

    if (this.session) {
      await this.session.close(playback);
    }

    this.overlay?.remove();

    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }

    const summary: SessionSummary = {
      sessionId: this.session?.id ?? '',
      seconds: playback,
      cost,
      walletAddress: this.wallet.getAddress() ?? '',
    };

    this.emit('session:end', summary);
    this.session = null;
    this.costTracker = null;
    this.overlay = null;

    return summary;
  }

  getSession(): { id: string; onChainId: string } | null {
    if (!this.session) return null;
    return { id: this.session.id, onChainId: this.session.onChainId };
  }

  getCost(): CostInfo {
    return (
      this.costTracker?.getCost() ?? { usdc: 0, seconds: 0, formatted: '$0.0000' }
    );
  }

  getWallet(): string | null {
    return this.wallet.getAddress();
  }

  getContentInfo(): ContentInfo | null {
    return this.contentInfo;
  }
}
