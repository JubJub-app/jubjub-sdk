import type { WalletLike } from '../types';

export class Wallet {
  private client: WalletLike | null = null;
  private _address: string | null = null;
  private mode: 'byo' | 'privy' | null = null;

  constructor(existingClient?: WalletLike) {
    if (existingClient) {
      this.client = existingClient;
      this._address =
        existingClient.account?.address ??
        existingClient.address ??
        null;
      this.mode = 'byo';
    }
  }

  async connect(): Promise<string> {
    if (this._address && this.client) {
      return this._address;
    }

    // BYO wallet was provided but has no address yet — try reading it
    if (this.client) {
      const addr =
        this.client.account?.address ?? this.client.address ?? null;
      if (addr) {
        this._address = addr;
        this.mode = 'byo';
        return addr;
      }
    }

    // No BYO wallet — try Privy
    try {
      const privy = await import('@privy-io/js-sdk-core');
      // @privy-io/js-sdk-core provides a headless SDK.
      // For the MVP the UMD build will fail this import gracefully
      // and require a BYO wallet. Full Privy integration is Sprint 2.
      throw new Error('Privy headless SDK integration is not yet implemented');
    } catch {
      throw new Error(
        'No wallet provided. Pass a wallet client via options.wallet, ' +
          'or install @privy-io/js-sdk-core for built-in wallet connect.',
      );
    }
  }

  getAddress(): string | null {
    return this._address;
  }

  getClient(): WalletLike | null {
    return this.client;
  }

  getMode(): 'byo' | 'privy' | null {
    return this.mode;
  }
}
