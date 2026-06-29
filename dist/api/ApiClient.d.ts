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
    createViewerSession(contentId: string, walletAddress: string): Promise<{
        sessionToken: string;
        profileId: string;
    }>;
    private authHeaders;
    createStreamingSession(contentId: string, walletAddress: string): Promise<{
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
