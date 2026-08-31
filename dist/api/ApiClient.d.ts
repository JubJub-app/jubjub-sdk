import type { ContentInfo } from '../types';
export declare class ApiClient {
    private apiUrl;
    private sessionToken;
    constructor(apiUrl: string);
    setSessionToken(token: string): void;
    registerContent(platformKey: string, info: {
        creator: string;
        title: string;
        mediaUrl: string;
        description?: string;
        pricePerMinute?: number;
        platformName?: string;
        platformVideoId?: string;
        platformVideoUrl?: string;
    }): Promise<{
        content_id: string;
        [key: string]: unknown;
    }>;
    getPlaybackInfo(contentId: string): Promise<ContentInfo>;
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
    createViewerSession(contentId: string, walletAddress: string, signMessage: (message: string) => Promise<string>): Promise<{
        sessionToken: string;
        profileId: string;
    }>;
    private authHeaders;
    /**
     * @param playbackGrant Opaque `jjg_` grant from getPlaybackInfo. Omitted
     *   when absent (older backend) — the server is in accept-not-require
     *   mode, so a missing grant must not fail the call.
     */
    createStreamingSession(contentId: string, walletAddress: string, playbackGrant?: string | null): Promise<{
        sessionId: string;
        onChainSessionId: string;
    }>;
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
    getSessionPlaybackUrl(sessionId: string): Promise<{
        url: string;
        expiresInSeconds: number;
    }>;
    recordSegment(sessionId: string): Promise<void>;
    closeSession(sessionId: string, playbackSeconds: number): Promise<void>;
    beaconClose(sessionId: string, walletAddress: string, playbackSeconds: number): void;
}
