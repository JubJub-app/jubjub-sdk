import type { WalletLike } from '../types';
export declare class Wallet {
    private client;
    private _address;
    private mode;
    constructor(existingClient?: WalletLike);
    connect(): Promise<string>;
    getAddress(): string | null;
    getClient(): WalletLike | null;
    /** True when the connected client can produce a personal_sign signature. */
    canSign(): boolean;
    /**
     * Sign `message` with the connected wallet (EIP-191 personal_sign).
     *
     * Throws when no wallet is connected, or when the connected client has no
     * signMessage. Callers must NOT swallow that: proving wallet ownership is
     * what stops anyone minting a viewer token for someone else's wallet.
     */
    signMessage(message: string): Promise<string>;
    getMode(): 'byo' | 'privy' | null;
}
