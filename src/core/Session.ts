import type { ApiClient } from '../api/ApiClient';

export class Session {
  readonly id: string;
  readonly onChainId: string;
  readonly contentId: string;
  readonly walletAddress: string;
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
  ): Promise<Session> {
    const result = await api.createStreamingSession(contentId, walletAddress);
    return new Session(
      result.sessionId,
      result.onChainSessionId,
      contentId,
      walletAddress,
      api,
    );
  }

  async close(playbackSeconds: number): Promise<void> {
    await this.api.closeSession(this.id, playbackSeconds);
  }

  beaconClose(playbackSeconds: number): void {
    this.api.beaconClose(this.id, this.walletAddress, playbackSeconds);
  }
}
