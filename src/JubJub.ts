import { createWalletClient, custom } from 'viem';
import { chainForNetwork, type NetworkFlag } from './chains';
import { EventEmitter } from './EventEmitter';
import { ApiClient } from './api/ApiClient';
import { Wallet } from './core/Wallet';
import { Approval } from './core/Approval';
import { Session } from './core/Session';
import { CostTracker } from './core/CostTracker';
import { CostOverlay } from './ui/CostOverlay';
import type {
  JubJubOptions,
  JubJubInitConfig,
  ContentRegistration,
  ContentInfo,
  SessionSummary,
  CostInfo,
  WalletLike,
} from './types';

const DEFAULT_API_URL = 'https://api.jubjubapp.com';

// ---------------------------------------------------------------------------
// Module-level state (shared across all JubJub instances on the page)
// ---------------------------------------------------------------------------
let _platformKey: string | null = null;
let _initApiUrl: string = DEFAULT_API_URL;
let _initNetwork: 'testnet' | 'mainnet' = 'mainnet';
let _initShowOverlay = true;

/** Content registration cache: mediaUrl → content_id */
const _registrationCache = new Map<string, string>();

/** Wallet shared across all videos on the page (connected once). */
let _sharedWallet: WalletLike | null = null;
let _walletConnecting: Promise<WalletLike | null> | null = null;

/** Videos already processed — prevents double-attach. */
const _processed = new WeakSet<HTMLVideoElement>();

/** Debounce timer for MutationObserver. */
let _observerTimer: ReturnType<typeof setTimeout> | null = null;

/** Guard against init() being called twice. */
let _initialized = false;

/**
 * Optional EIP-1193 provider injected via JubJub.init({ provider }).
 * When set, takes precedence over window.ethereum. Required for
 * Farcaster Mini Apps (sdk.wallet.getEthereumProvider()) and any
 * host whose wallet provider isn't exposed on window.
 */
let _injectedProvider: any | null = null;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const DEFAULTS: Required<
  Omit<JubJubOptions, 'contentId' | 'wallet' | 'onCostUpdate' | 'onSessionStart' | 'onSessionEnd' | 'onError' | 'onWalletConnected'>
> & { contentId: string | undefined; wallet: any } = {
  contentId: undefined,
  wallet: undefined,
  apiUrl: DEFAULT_API_URL,
  network: 'mainnet',
  showCostOverlay: true,
  overlayPosition: 'bottom-right',
};

// ---------------------------------------------------------------------------
// Loading indicator shown while payment setup runs
// ---------------------------------------------------------------------------
function _createLoader(video: HTMLVideoElement): { remove: () => void } {
  const el = document.createElement('div');
  el.setAttribute('data-jubjub-loader', 'true');
  el.style.cssText =
    'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
    'z-index:1001;display:flex;align-items:center;gap:8px;' +
    'background:rgba(0,0,0,0.8);color:#fff;padding:8px 16px;' +
    'border-radius:8px;font-family:system-ui,sans-serif;font-size:13px;';

  const spinner = document.createElement('span');
  spinner.style.cssText =
    'display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);' +
    'border-top-color:#fff;border-radius:50%;animation:jubjub-spin 0.8s linear infinite;';
  el.appendChild(spinner);

  const text = document.createElement('span');
  text.textContent = 'Connecting wallet\u2026';
  el.appendChild(text);

  // Inject keyframes if not already present
  if (!document.getElementById('jubjub-spin-style')) {
    const style = document.createElement('style');
    style.id = 'jubjub-spin-style';
    style.textContent = '@keyframes jubjub-spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }

  // Insert into a positioned wrapper (overlay may have created one already)
  let wrapper = video.parentElement;
  if (!wrapper || wrapper === document.body) {
    wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;display:inline-block;width:100%;';
    video.parentElement?.insertBefore(wrapper, video);
    wrapper.appendChild(video);
  }
  if (getComputedStyle(wrapper).position === 'static') {
    wrapper.style.position = 'relative';
  }
  wrapper.appendChild(el);

  return { remove: () => el.remove() };
}

// ---------------------------------------------------------------------------
// Payment-required gate shown when approval is rejected / not granted.
// Keeps the video covered (it stays paused) and offers a retry affordance.
// ---------------------------------------------------------------------------
function _createPaymentGate(
  video: HTMLVideoElement,
  onRetry: () => void,
): { remove: () => void } {
  const el = document.createElement('div');
  el.setAttribute('data-jubjub-gate', 'true');
  el.style.cssText =
    'position:absolute;inset:0;z-index:1002;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:10px;text-align:center;' +
    'background:rgba(0,0,0,0.82);color:#fff;padding:16px;' +
    'font-family:system-ui,sans-serif;';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:15px;font-weight:600;max-width:340px;line-height:1.4;';
  title.textContent = 'Payment approval required to watch';
  el.appendChild(title);

  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:13px;opacity:0.85;max-width:340px;line-height:1.4;';
  sub.textContent = 'Approve the USDC payment in your wallet to start streaming.';
  el.appendChild(sub);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Retry payment';
  btn.style.cssText =
    'cursor:pointer;border:0;border-radius:8px;padding:10px 18px;margin-top:4px;' +
    'font-size:14px;font-weight:600;background:#fff;color:#000;font-family:inherit;';
  el.appendChild(btn);

  // Insert into a positioned wrapper (mirrors _createLoader).
  let wrapper = video.parentElement;
  if (!wrapper || wrapper === document.body) {
    wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;display:inline-block;width:100%;';
    video.parentElement?.insertBefore(wrapper, video);
    wrapper.appendChild(video);
  }
  if (getComputedStyle(wrapper).position === 'static') {
    wrapper.style.position = 'relative';
  }
  wrapper.appendChild(el);

  const remove = () => el.remove();
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRetry();
  });

  return { remove };
}

// ---------------------------------------------------------------------------
// JubJub class
// ---------------------------------------------------------------------------
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
    this.wallet = new Wallet(this.options.wallet ?? _sharedWallet ?? undefined);

    if (options.onCostUpdate) this.on('cost', (c: CostInfo) => options.onCostUpdate!(c.usdc, c.seconds));
    if (options.onSessionStart) this.on('session:start', options.onSessionStart);
    if (options.onSessionEnd) this.on('session:end', options.onSessionEnd);
    if (options.onError) this.on('error', options.onError);
    if (options.onWalletConnected) this.on('wallet:connected', options.onWalletConnected);
  }

  // =========================================================================
  // Static API
  // =========================================================================

  /**
   * Initialise the SDK. Call once per page. Auto-discovers video elements
   * with `data-jubjub-*` attributes and attaches payment flows.
   */
  static init(config: JubJubInitConfig): void {
    console.log('[JubJub] init() called', { key: config.platformKey?.slice(0, 10) + '...' });
    _platformKey = config.platformKey;
    if (config.apiUrl) _initApiUrl = config.apiUrl;
    if (config.network) _initNetwork = config.network;
    if (config.provider) _injectedProvider = config.provider;
    if (typeof (config as any).showCostOverlay === 'boolean') {
      _initShowOverlay = (config as any).showCostOverlay;
    }

    if (_initialized) {
      console.log('[JubJub] Already initialized — skipping');
      return;
    }
    _initialized = true;

    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
      console.log('[JubJub] DOM loading — deferring auto-discover');
      document.addEventListener('DOMContentLoaded', () => JubJub._autoDiscover());
    } else {
      console.log('[JubJub] DOM ready — running auto-discover now');
      JubJub._autoDiscover();
    }
  }

  /**
   * Manually attach streaming payments.
   *
   * Accepts a content ID string OR a ContentRegistration object.
   * Backward compatible with all previous signatures.
   */
  static play(
    contentOrId: string | ContentRegistration,
    video: HTMLVideoElement,
    options: JubJubOptions = {},
  ): JubJub {
    _processed.add(video);

    const merged: JubJubOptions = {
      ...options,
      apiUrl: options.apiUrl ?? _initApiUrl,
      network: options.network ?? _initNetwork,
      showCostOverlay: options.showCostOverlay ?? _initShowOverlay,
    };

    if (typeof contentOrId === 'string') {
      const sdk = new JubJub({ ...merged, contentId: contentOrId });
      if (!contentOrId) {
        console.warn('[JubJub] No content ID — video plays without payments.');
        return sdk;
      }
      sdk._safeAttach(contentOrId, video);
      return sdk;
    }

    // Auto-registration path
    const sdk = new JubJub(merged);
    sdk._autoRegisterAndPlay(contentOrId, video).catch((err) => {
      sdk.emit('error', err);
      console.error('[JubJub]', err);
    });
    return sdk;
  }

  /**
   * Connect a browser-injected wallet (MetaMask, Coinbase Wallet, etc.).
   *
   * The target chain is resolved from the active network flag (defaults
   * to the value passed to JubJub.init(), i.e. 'mainnet' unless the
   * consumer explicitly opted into 'testnet').
   */
  static async connectBrowserWallet(network: NetworkFlag = _initNetwork): Promise<WalletLike> {
    const ethereum = _injectedProvider ?? (window as any).ethereum;
    if (!ethereum) {
      throw new Error(
        'No browser wallet detected. Install MetaMask, or pass an ' +
          'EIP-1193 provider via JubJub.init({ provider }) — required ' +
          'inside Farcaster Mini Apps and similar embedded contexts.',
      );
    }

    const chain = chainForNetwork(network);

    const accounts: string[] = await ethereum.request({
      method: 'eth_requestAccounts',
    });
    if (!accounts.length) throw new Error('No accounts returned from wallet.');

    const address = accounts[0] as `0x${string}`;

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chain.chainIdHex }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chain.chainIdHex,
            chainName: chain.label,
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: [chain.rpcUrl],
            blockExplorerUrls: [chain.explorer],
          }],
        });
      }
    }

    const client = createWalletClient({
      account: address,
      chain: chain.viemChain,
      transport: custom(ethereum),
    });

    _sharedWallet = client as unknown as WalletLike;
    return _sharedWallet;
  }

  // =========================================================================
  // Auto-discovery (private)
  // =========================================================================

  private static _autoDiscover(): void {
    const selector = 'video[data-jubjub-content-id], video[data-jubjub-creator]';
    const videos = document.querySelectorAll<HTMLVideoElement>(selector);
    console.log(`[JubJub] Auto-discover found ${videos.length} video(s)`);
    videos.forEach((v) => JubJub._prepareVideo(v));

    // Watch for dynamically added videos (SPA, lazy loading).
    // Only react to added <video> elements, NOT to overlay/wrapper
    // DOM changes (which would cause an infinite loop).
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        let hasNewVideos = false;
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node instanceof HTMLVideoElement) {
              hasNewVideos = true;
              break;
            }
            if (node instanceof HTMLElement && node.querySelector('video')) {
              hasNewVideos = true;
              break;
            }
          }
          if (hasNewVideos) break;
        }
        if (!hasNewVideos) return;

        if (_observerTimer) clearTimeout(_observerTimer);
        _observerTimer = setTimeout(() => {
          document.querySelectorAll<HTMLVideoElement>(selector)
            .forEach((v) => JubJub._prepareVideo(v));
        }, 100);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  /**
   * Mark a video for JubJub payments but DON'T start the payment flow yet.
   * Wait for the user to press play — that triggers wallet connect + session.
   */
  private static _prepareVideo(video: HTMLVideoElement): void {
    if (_processed.has(video)) {
      console.log('[JubJub] Video already processed — skipping');
      return;
    }
    if (video.dataset.jubjubDisabled != null) {
      console.log('[JubJub] Video has data-jubjub-disabled — skipping');
      return;
    }
    _processed.add(video);

    const contentId = video.dataset.jubjubContentId;
    const creator = video.dataset.jubjubCreator;
    if (!contentId && !creator) return;

    console.log('[JubJub] Prepared video — waiting for play event', {
      contentId: contentId || '(auto-register)',
      creator: creator || '(pre-registered)',
      src: (video.src || '').slice(0, 60),
    });

    // Defer the payment flow to the video's play event. Pause immediately so
    // no free seconds leak, run setup, then resume ONLY if payment is in
    // place. On approval rejection we FAIL CLOSED: keep the video paused and
    // show a retry gate instead of falling through to free playback.
    let currentGate: { remove: () => void } | null = null;
    let armedPlayHandler: (() => void) | null = null;

    const disarmPlay = () => {
      if (armedPlayHandler) {
        video.removeEventListener('play', armedPlayHandler);
        armedPlayHandler = null;
      }
    };
    const armPlay = () => {
      disarmPlay();
      armedPlayHandler = () => { disarmPlay(); run(); };
      video.addEventListener('play', armedPlayHandler);
    };

    const run = () => {
      // Ensure our own video.play() below can't re-enter this handler, and
      // clear any prior gate (retry via the native play button).
      disarmPlay();
      if (currentGate) { currentGate.remove(); currentGate = null; }
      video.pause();
      console.log('[JubJub] Play event fired — paused, starting payment setup');

      const loader = _createLoader(video);

      const setup = async () => {
        let sdk: JubJub | undefined;
        let gated = false;
        try {
          if (contentId) {
            sdk = JubJub.play(contentId, video);
          } else {
            const mediaUrl =
              video.dataset.jubjubMediaUrl ||
              video.src ||
              video.querySelector('source')?.src ||
              '';
            sdk = JubJub.play(
              {
                creator: creator!,
                title: video.dataset.jubjubTitle || document.title,
                mediaUrl,
                pricePerMinute: video.dataset.jubjubPrice
                  ? parseFloat(video.dataset.jubjubPrice)
                  : undefined,
              },
              video,
            );
          }
          // Resolve on success ('ready'), payment gate ('payment:required'),
          // generic failure ('error'), or a safety timeout.
          await new Promise<void>((resolve) => {
            sdk!.on('ready', () => resolve());
            sdk!.on('payment:required', () => { gated = true; resolve(); });
            sdk!.on('error', () => resolve());
            setTimeout(resolve, 15_000);
          });
        } catch {
          // Setup threw before emitting — treated as non-gated (resumes).
        }
        loader.remove();

        if (gated) {
          // FAIL CLOSED: approval was not granted. Keep the video paused,
          // show a retry gate, and re-arm play→retry. Do NOT call play().
          console.warn('[JubJub] Payment not approved — video gated (no free play).');
          currentGate = _createPaymentGate(video, run);
          armPlay();
          return;
        }

        // Legitimate paths (already-approved / newly-approved → 'ready') and
        // the other not-yet-gated setup failures (no content / no wallet /
        // viewer-session / streaming-session) resume playback as before.
        video.play().catch(() => {});
      };

      setup();
    };

    armPlay();
  }

  // =========================================================================
  // Auto wallet (private, shared across all videos)
  // =========================================================================

  /**
   * The active network for this instance — an explicit per-call
   * `options.network` wins, otherwise the value set at init time.
   * Source of truth for every chain decision made by this instance.
   */
  private _activeNetwork(): NetworkFlag {
    return this.options.network ?? _initNetwork;
  }

  private async _ensureWallet(): Promise<string> {
    // Already have a wallet from options or shared cache
    const existing = this.wallet.getAddress();
    if (existing) return existing;

    // Try shared wallet
    if (_sharedWallet) {
      this.wallet = new Wallet(_sharedWallet);
      return this.wallet.getAddress()!;
    }

    // Try auto-connecting browser wallet (only once per page)
    if (!_injectedProvider && !(window as any).ethereum) {
      throw new Error('no-wallet');
    }

    if (!_walletConnecting) {
      _walletConnecting = JubJub.connectBrowserWallet(this._activeNetwork()).catch(() => null);
    }
    const wallet = await _walletConnecting;
    if (!wallet) throw new Error('no-wallet');

    this.wallet = new Wallet(wallet);
    return this.wallet.getAddress()!;
  }

  // =========================================================================
  // Instance methods
  // =========================================================================

  private _safeAttach(contentId: string, video: HTMLVideoElement): void {
    this.attach(contentId, video).catch((err) => {
      this.emit('error', err);
      console.error('[JubJub]', err);
    });
  }

  private async _autoRegisterAndPlay(
    info: ContentRegistration,
    video: HTMLVideoElement,
  ): Promise<void> {
    if (!_platformKey) {
      throw new Error('Call JubJub.init({ platformKey }) before using auto-registration.');
    }

    const cached = _registrationCache.get(info.mediaUrl);
    if (cached) {
      console.log('[JubJub] Using cached content_id:', cached);
      return this.attach(cached, video);
    }

    console.log('[JubJub] Registering content...', { creator: info.creator, title: info.title });
    const result = await this.api.registerContent(_platformKey, info);
    const contentId = result.content_id;
    console.log('[JubJub] Registered:', contentId, result.duplicate ? '(duplicate)' : '(new)');
    _registrationCache.set(info.mediaUrl, contentId);

    return this.attach(contentId, video);
  }

  async attach(contentId: string, video: HTMLVideoElement): Promise<void> {
    this.video = video;

    if (!contentId) {
      console.warn('[JubJub] No content ID — video plays without payments.');
      this.emit('error', new Error('No content ID'));
      return;
    }

    console.log('[JubJub] attach() starting for', contentId);

    try {
      // 1. Fetch content + chain config
      console.log('[JubJub] Step 1: Fetching playback info...');
      try {
        this.contentInfo = await this.api.getPlaybackInfo(contentId);
      } catch (fetchErr: any) {
        const msg = fetchErr?.message?.includes('404')
          ? `Content '${contentId}' not found — video plays free.`
          : `Failed to load content info — video plays free. (${fetchErr?.message})`;
        console.warn('[JubJub]', msg);
        this.emit('error', new Error(msg));
        return;
      }
      console.log('[JubJub] Step 1 done:', this.contentInfo.title, `$${this.contentInfo.price_per_minute_usdc}/min`);
      this.emit('content:loaded', this.contentInfo);

      // 2. Connect wallet (auto or BYO)
      console.log('[JubJub] Step 2: Connecting wallet...');
      let address: string;
      try {
        address = await this._ensureWallet();
      } catch {
        console.log('[JubJub] No wallet detected. Video plays free.');
        return;
      }
      console.log('[JubJub] Step 2 done: wallet', address.slice(0, 10) + '...');
      this.emit('wallet:connected', address);

      // 3. Create viewer session
      console.log('[JubJub] Step 3: Creating viewer session...');
      await this.api.createViewerSession(contentId, address);
      console.log('[JubJub] Step 3 done');

      // 4. Approve USDC
      console.log('[JubJub] Step 4: Checking USDC approval...');
      this.approval = new Approval(
        this.wallet,
        {
          usdc_address: this.contentInfo.usdc_address,
          payment_router: this.contentInfo.payment_router,
          chain_id: this.contentInfo.chain_id,
          price_per_minute_usdc: this.contentInfo.price_per_minute_usdc,
        },
      );
      let didApprove: boolean;
      try {
        didApprove = await this.approval.ensureApproved();
      } catch (approvalErr) {
        // FAIL CLOSED: the USDC approval was rejected by the user or the
        // approve tx failed (or the allowance could not be verified). Do NOT
        // proceed to streaming and do NOT fall through to free play — emit a
        // distinct 'payment:required' signal that the play harness uses to
        // keep the video gated with a retry affordance.
        const error =
          approvalErr instanceof Error ? approvalErr : new Error(String(approvalErr));
        console.warn(
          '[JubJub] USDC approval not granted — gating playback (no free play).',
          error.message,
        );
        this.emit('payment:required', error);
        return;
      }
      console.log('[JubJub] Step 4 done:', didApprove ? 'approved' : 'already approved');
      if (didApprove) this.emit('approved', address);

      // 5. Create streaming session
      console.log('[JubJub] Step 5: Creating streaming session...');
      this.session = await Session.create(contentId, address, this.api);
      console.log('[JubJub] Step 5 done: session', this.session.id);
      this.emit('session:start', this.session.id);

      // 6. Cost tracker
      console.log('[JubJub] Step 6: Starting cost tracker + overlay');
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

      // 8. Beacon close
      this.beforeUnloadHandler = () => {
        if (this.session && this.costTracker) {
          this.session.beaconClose(this.costTracker.getPlaybackSeconds());
        }
      };
      window.addEventListener('beforeunload', this.beforeUnloadHandler);

      console.log('[JubJub] Ready — streaming payments active');
      this.emit('ready');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
      throw error;
    }
  }

  async disconnect(): Promise<SessionSummary> {
    const playback = this.costTracker?.getPlaybackSeconds() ?? 0;
    const cost = this.costTracker?.getCost()?.usdc ?? 0;
    this.costTracker?.stop();
    if (this.session) await this.session.close(playback);
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

  getSession() { return this.session ? { id: this.session.id, onChainId: this.session.onChainId } : null; }
  getCost(): CostInfo { return this.costTracker?.getCost() ?? { usdc: 0, seconds: 0, formatted: '$0.0000' }; }
  getWallet() { return this.wallet.getAddress(); }
  getContentInfo() { return this.contentInfo; }
}
