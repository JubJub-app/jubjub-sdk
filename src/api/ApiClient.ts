import type { ContentInfo } from '../types';

export class ApiClient {
  private apiUrl: string;
  private sessionToken: string | null = null;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl.replace(/\/+$/, '');
  }

  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  // -- Platform registration (platform key auth) --

  async registerContent(
    platformKey: string,
    info: {
      creator: string;
      title: string;
      mediaUrl: string;
      description?: string;
      pricePerMinute?: number;
      platformName?: string;
      platformVideoId?: string;
      platformVideoUrl?: string;
    },
  ): Promise<{ content_id: string; [key: string]: unknown }> {
    const isWallet = /^0x[0-9a-fA-F]{40}$/.test(info.creator);
    const body: Record<string, unknown> = {
      title: info.title,
      media_url: info.mediaUrl,
    };
    if (isWallet) {
      body.creator_wallet = info.creator;
    } else {
      body.creator_email = info.creator;
    }
    if (info.description) body.description = info.description;
    if (info.pricePerMinute != null) body.price_per_minute = info.pricePerMinute;
    if (info.platformName) body.platform_name = info.platformName;
    if (info.platformVideoId) body.platform_video_id = info.platformVideoId;
    if (info.platformVideoUrl) body.platform_video_url = info.platformVideoUrl;

    const res = await fetch(`${this.apiUrl}/v2/platform/register-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-JubJub-Platform-Key': platformKey,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 409) {
      // Duplicate — extract the existing ID from the error detail.
      // Backend says: "Content with this media hash already registered (media_id=cnt_xxx)"
      // or may use "content_id=cnt_xxx". Match either.
      const err = await res.json().catch(() => ({}));
      const detail: string = err.detail || '';
      const match = detail.match(/(?:content_id|media_id)[=:]?\s*(cnt_[a-zA-Z0-9_]+)/);
      if (match) {
        return { content_id: match[1], duplicate: true };
      }
      // If we can't parse the ID, still don't throw — the content exists,
      // we just can't extract its ID. Fall through to the error below.
      throw new Error(`Content already registered but ID could not be parsed: ${detail}`);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Register content failed: ${res.status} ${text}`);
    }

    return res.json();
  }

  // -- Public endpoints (no auth) --

  async getPlaybackInfo(contentId: string): Promise<ContentInfo> {
    const res = await fetch(
      `${this.apiUrl}/v2/public/contents/${contentId}/playback-info`,
    );
    if (!res.ok) {
      throw new Error(`Playback info failed: ${res.status}`);
    }
    return res.json();
  }

  /**
   * Mint a viewer session token, proving control of `walletAddress` first.
   *
   * K1-1(d): without proof, anyone can mint a token for someone else's wallet
   * and stream against their standing USDC allowance. The proof reuses the
   * backend's deployed SIWE flow — GET /v2/auth/wallet-nonce issues a
   * single-use nonce + canonical message, the viewer signs it, and
   * viewer-session verifies before minting.
   *
   * @param signMessage Signer from the connected wallet. REQUIRED: there is
   *   deliberately no unproven fallback — the server rejects that path once
   *   VIEWER_SESSION_REQUIRE_PROOF is on, and a silent fallback would keep
   *   the hole open indefinitely.
   */
  async createViewerSession(
    contentId: string,
    walletAddress: string,
    signMessage: (message: string) => Promise<string>,
  ): Promise<{ sessionToken: string; profileId: string }> {
    const nonceRes = await fetch(
      `${this.apiUrl}/v2/auth/wallet-nonce?address=${encodeURIComponent(
        walletAddress.toLowerCase(),
      )}`,
    );
    if (!nonceRes.ok) {
      throw new Error(`Wallet nonce failed: ${nonceRes.status}`);
    }
    const { nonce, message_to_sign: message } = await nonceRes.json();
    if (!nonce || !message) {
      throw new Error('Wallet nonce response was incomplete');
    }

    // Sign the message EXACTLY as issued — the backend recovers the signer
    // from this string, so any reformatting breaks verification.
    const signature = await signMessage(message);

    const res = await fetch(`${this.apiUrl}/v2/public/viewer-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content_id: contentId,
        wallet_address: walletAddress,
        signature,
        nonce,
      }),
    });
    if (!res.ok) {
      throw new Error(`Viewer session failed: ${res.status}`);
    }
    const data = await res.json();
    this.sessionToken = data.session_token;
    return {
      sessionToken: data.session_token,
      profileId: data.profile_id,
    };
  }

  // -- Authenticated endpoints (jj_ Bearer token) --

  private authHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.sessionToken) {
      h['Authorization'] = `Bearer ${this.sessionToken}`;
    }
    return h;
  }

  /**
   * @param playbackGrant Opaque `jjg_` grant from getPlaybackInfo. Omitted
   *   when absent (older backend) — the server is in accept-not-require
   *   mode, so a missing grant must not fail the call.
   */
  async createStreamingSession(
    contentId: string,
    walletAddress: string,
    playbackGrant?: string | null,
  ): Promise<{ sessionId: string; onChainSessionId: string }> {
    const res = await fetch(`${this.apiUrl}/v2/streaming/sessions`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({
        // content_id stays: the backend ignores it when a grant is present,
        // and keeping it makes this change additive for older backends.
        content_id: contentId,
        viewer_wallet: walletAddress,
        viewer_type: 'human',
        ...(playbackGrant ? { playback_grant: playbackGrant } : {}),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Create session failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    return {
      sessionId: data.session_id,
      onChainSessionId: data.on_chain_session_id,
    };
  }

  /**
   * Tier 2 only: after payment is secured, resolve a short-lived,
   * session-scoped signed playback URL. Authenticated with the streaming
   * session token (jj_ Bearer) — the backend gates issuance on the live paid
   * session. Returns the signed URL to set as the <video> source plus the TTL
   * the backend stamped on it, so the SDK can re-resolve a fresh URL BEFORE
   * this one expires (the short-TTL re-resolve loop in PlaybackUrlRefresher).
   *
   * Throws (incl. 403/404) whenever the session is no longer active — callers
   * MUST treat that as fail-closed and never fall back to a durable URL.
   */
  async getSessionPlaybackUrl(
    sessionId: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const res = await fetch(
      `${this.apiUrl}/v2/streaming/sessions/${sessionId}/playback-url`,
      { method: 'POST', headers: this.authHeaders() },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Playback URL failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    return {
      url: data.url,
      // Backend default is 120s; fall back to it if the field is ever absent.
      expiresInSeconds: Number(data.expires_in_seconds) || 120,
    };
  }

  async recordSegment(sessionId: string): Promise<void> {
    const res = await fetch(
      `${this.apiUrl}/v2/streaming/sessions/${sessionId}/segment`,
      { method: 'POST', headers: this.authHeaders() },
    );
    if (!res.ok) {
      console.error('[JubJub] segment failed:', res.status);
    }
  }

  async closeSession(
    sessionId: string,
    playbackSeconds: number,
  ): Promise<void> {
    const res = await fetch(
      `${this.apiUrl}/v2/streaming/sessions/${sessionId}/close`,
      {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({ playback_seconds: playbackSeconds }),
      },
    );
    if (!res.ok) {
      console.error('[JubJub] close failed:', res.status);
    }
  }

  beaconClose(
    sessionId: string,
    walletAddress: string,
    playbackSeconds: number,
  ): void {
    const payload = JSON.stringify({
      viewer_wallet: walletAddress,
      playback_seconds: playbackSeconds,
    });
    // text/plain, NOT application/json. A JSON Blob is not a CORS-simple
    // content type, so the browser must preflight it — and during page unload
    // the document is being discarded, so the OPTIONS goes out and the POST
    // that should follow is dropped. Measured against production: one OPTIONS
    // 204, no POST, ever; the session then stayed open until the ten-minute
    // idle sweep closed it, holding the viewer's pull authority the whole time.
    // text/plain is preflight-free and actually delivers. The body is still
    // JSON — the backend parses the bytes and ignores the declared type, and
    // accepts the old application/json form too so a vendored bundle keeps
    // working.
    const blob = new Blob([payload], { type: 'text/plain' });
    navigator.sendBeacon(
      `${this.apiUrl}/v2/streaming/sessions/${sessionId}/beacon-close`,
      blob,
    );
  }
}
