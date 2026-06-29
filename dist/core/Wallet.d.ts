import type { WalletLike } from '../types';
export declare class Wallet {
    private client;
    private _address;
    private mode;
    constructor(existingClient?: WalletLike);
    connect(): Promise<string>;
    getAddress(): string | null;
    getClient(): WalletLike | null;
    getMode(): 'byo' | 'privy' | null;
}
