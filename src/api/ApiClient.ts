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

  async createViewerSession(
    contentId: string,
    walletAddress: string,
  ): Promise<{ sessionToken: string; profileId: string }> {
    const res = await fetch(`${this.apiUrl}/v2/public/viewer-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content_id: contentId,
        wallet_address: walletAddress,
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

  async createStreamingSession(
    contentId: string,
    walletAddress: string,
  ): Promise<{ sessionId: string; onChainSessionId: string }> {
    const res = await fetch(`${this.apiUrl}/v2/streaming/sessions`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({
        content_id: contentId,
        viewer_wallet: walletAddress,
        viewer_type: 'human',
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
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(
      `${this.apiUrl}/v2/streaming/sessions/${sessionId}/beacon-close`,
      blob,
    );
  }
}
