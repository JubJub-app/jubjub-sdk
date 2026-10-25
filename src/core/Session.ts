import type { ApiClient } from '../api/ApiClient';

export class Session {
  readonly id: string;
  readonly onChainId: string;
  readonly contentId: string;
  readonly walletAddress: string;
  /** 2.4.0: 'card' on a card session; undefined on the approve rail. */
  rail?: string;
  /** 2.4.0: the card this session draws on (null on the approve rail). */
  cardTokenId: number | null = null;
  /** 2.4.0: what the card could still cover for this session at open. */
  cardBalanceMicro: number | null = null;
  private api: ApiClient;

  private constructor(
    id: string,
    onChainId: string,
    contentId: string,
    walletAddress: string,
    api: ApiClient,
  ) {
    this.id = id;
    this.onChainId = onChainId;
    this.contentId = contentId;
    this.walletAddress = walletAddress;
    this.api = api;
  }

  static async create(
    contentId: string,
    walletAddress: string,
    api: ApiClient,
    playbackGrant?: string | null,
    /** 2.4.0: open a card session against this card token id. */
    cardTokenId?: number | null,
  ): Promise<Session> {
    const result =
      cardTokenId != null
        ? await api.createStreamingSession(contentId, walletAddress, playbackGrant, cardTokenId)
        : await api.createStreamingSession(contentId, walletAddress, playbackGrant);
    const session = new Session(
      result.sessionId,
      result.onChainSessionId,
      contentId,
      walletAddress,
      api,
    );
    if (result.rail) session.rail = result.rail;
    if (cardTokenId != null) session.cardTokenId = result.cardTokenId ?? cardTokenId;
    if (result.cardBalanceMicro != null) session.cardBalanceMicro = result.cardBalanceMicro;
    return session;
  }

  async close(playbackSeconds: number): Promise<void> {
    await this.api.closeSession(this.id, playbackSeconds);
  }

  beaconClose(playbackSeconds: number): void {
    this.api.beaconClose(this.id, this.walletAddress, playbackSeconds);
  }
}
