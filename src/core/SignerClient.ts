import { parseFundingError } from '../fundingErrors';
import { ContentNotPlayableError } from '../streamingErrors';

/**
 * The creator-held signer (docs/creator-held-signer.md in the dashboard repo).
 *
 * A creator who opts a piece into signed playback runs a small service that
 * holds THEIR Mux signing key. JubJub never holds the key and has no switch
 * over playback; playback-info only says where the signer is. After the paid
 * streaming session opens, the SDK asks the signer for a short-lived token,
 * using the SIWE message the viewer already signed for JubJub, and renews it
 * through the credential the signer returns. The signer re-reads the wallet's
 * USDC allowance and balance on Base on every call: "able to pay" is the
 * check, because by-the-second billing settles after viewing from a standing
 * allowance.
 */

export interface PlaybackSignerInfo {
  url: string;
  host: 'mux';
  playback_id: string;
}

export interface SignerTokens {
  host: string;
  playbackId: string;
  tokens: { v: string; t?: string; s?: string };
  /** Seconds the video token is good for. */
  expiresIn: number;
  /** Seconds after issue at which to renew; defaults to 80% of expiresIn. */
  renewAfter?: number;
  /** Signer-issued credential for renewals, so the viewer signs once. */
  renewal?: string;
}

export type SignerProof = { message: string; signature: string } | { renewal: string };

export class SignerError extends Error {
  constructor(
    public readonly status: number,
    public readonly reason: string,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'SignerError';
  }
}

export function isSignerError(err: unknown): err is SignerError {
  return err instanceof SignerError;
}

/** A complete, well-formed signer block, or null: anything less is "no signer". */
export function signerInfoFrom(raw: unknown): PlaybackSignerInfo | null {
  const r = raw as Record<string, unknown> | null | undefined;
  if (!r || typeof r !== 'object') return null;
  const url = typeof r.url === 'string' ? r.url.trim() : '';
  const playbackId = typeof r.playback_id === 'string' ? r.playback_id.trim() : '';
  if (!url || !playbackId || r.host !== 'mux') return null;
  if (!/^https:\/\//i.test(url)) return null;
  return { url, host: 'mux', playback_id: playbackId };
}

/** The stream URL carrying the signer's token. */
export function buildTokenedUrl(host: string, playbackId: string, token: string): string {
  if (host !== 'mux') throw new SignerError(0, 'unsupported_host', `Unsupported signer host: ${host}`);
  return `https://stream.mux.com/${encodeURIComponent(playbackId)}.m3u8?token=${encodeURIComponent(token)}`;
}

export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

/** Parse the signer's answer; a shape we do not know is a refusal. */
export function parseSignerTokens(raw: unknown): SignerTokens {
  const r = (raw ?? {}) as Record<string, unknown>;
  const tokens = (r.tokens ?? {}) as Record<string, unknown>;
  if (typeof r.playback_id !== 'string' || typeof r.host !== 'string' || typeof tokens.v !== 'string') {
    throw new SignerError(502, 'malformed', 'The signer answered without a playback token.', raw);
  }
  return {
    host: r.host,
    playbackId: r.playback_id,
    tokens: {
      v: tokens.v,
      t: typeof tokens.t === 'string' ? tokens.t : undefined,
      s: typeof tokens.s === 'string' ? tokens.s : undefined,
    },
    expiresIn: typeof r.expires_in === 'number' && r.expires_in > 0 ? r.expires_in : 600,
    renewAfter: typeof r.renew_after === 'number' ? r.renew_after : undefined,
    renewal: typeof r.renewal === 'string' ? r.renewal : undefined,
  };
}

export class SignerClient {
  constructor(
    private readonly signer: PlaybackSignerInfo,
    private readonly fetchImpl: typeof fetch = (...a) => fetch(...a),
  ) {}

  get info(): PlaybackSignerInfo {
    return this.signer;
  }

  /**
   * Ask for a playback token. First call: the SIWE proof. Renewals: the
   * credential the signer returned. Errors are typed so the SDK's existing
   * gates apply: 402 becomes the backend's FundingRequiredError (same body
   * shape), 404 a ContentNotPlayableError, everything else a SignerError.
   */
  async fetchTokens(args: {
    contentId: string;
    wallet: string;
    proof: SignerProof;
    native?: boolean;
  }): Promise<SignerTokens> {
    const res = await this.fetchImpl(joinUrl(this.signer.url, 'token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content_id: args.contentId,
        wallet: args.wallet,
        ...args.proof,
        aud: ['v'],
        native: args.native === true,
      }),
    });
    const text = await res.text().catch(() => '');
    if (res.status === 402 || res.status === 503) {
      const funding = parseFundingError(res.status, text);
      if (funding) throw funding;
    }
    if (res.status === 404) {
      throw new ContentNotPlayableError('hosted_elsewhere', "This piece's signer does not know it yet.");
    }
    if (!res.ok) {
      let body: unknown = null;
      try { body = JSON.parse(text); } catch { /* not json */ }
      const reason = (body as { reason?: string } | null)?.reason ?? `http_${res.status}`;
      throw new SignerError(
        res.status,
        reason,
        res.status === 401
          ? 'The signer did not accept the wallet signature.'
          : 'The protected stream could not be unlocked.',
        body,
      );
    }
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = null; }
    return parseSignerTokens(body);
  }

  /** Poster and storyboard tokens, issued without a wallet. Never throws. */
  async fetchPreview(contentId: string): Promise<{ t?: string; s?: string } | null> {
    try {
      const res = await this.fetchImpl(joinUrl(this.signer.url, `preview/${encodeURIComponent(contentId)}`));
      if (!res.ok) return null;
      const body = (await res.json()) as { tokens?: { t?: string; s?: string } };
      return body?.tokens ?? null;
    } catch {
      return null;
    }
  }
}
