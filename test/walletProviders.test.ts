import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  announcedProviders,
  candidateProviders,
  describeProvider,
  resetProviderDiscovery,
  selectProvider,
  startProviderDiscovery,
} from '../src/walletProviders';

/** A window with EIP-6963 wallets that answer the request event, like real extensions. */
function fakeWindow(wallets: Array<{ rdns: string; name: string; provider: any }>, ethereum?: any) {
  const listeners = new Map<string, Array<(ev: any) => void>>();
  const win: any = {
    ethereum,
    Event: class { type: string; constructor(type: string) { this.type = type; } },
    addEventListener(type: string, fn: (ev: any) => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), fn]);
    },
    dispatchEvent(ev: any) {
      if (ev.type === 'eip6963:requestProvider') {
        for (const w of wallets) {
          for (const fn of listeners.get('eip6963:announceProvider') ?? []) {
            fn({ detail: { info: { uuid: w.rdns, name: w.name, icon: '', rdns: w.rdns }, provider: w.provider } });
          }
        }
      }
      return true;
    },
    requests: 0,
  };
  win.requests = () => (listeners.get('eip6963:announceProvider') ?? []).length;
  return win;
}

const metamask = { isMetaMask: true, request: async () => [] };
const coinbase = { isCoinbaseWallet: true, request: async () => [] };


test('discovery collects every announced wallet once and is idempotent', () => {
  resetProviderDiscovery();
  const win = fakeWindow([
    { rdns: 'io.metamask', name: 'MetaMask', provider: metamask },
    { rdns: 'com.coinbase.wallet', name: 'Coinbase Wallet', provider: coinbase },
  ]);
  startProviderDiscovery(win);
  startProviderDiscovery(win);
  assert.equal(win.requests(), 1, 'one listener however often discovery starts');
  assert.deepEqual(
    announcedProviders().map((c) => c.info?.rdns),
    ['io.metamask', 'com.coinbase.wallet'],
  );
});

test('discovery is a no-op without a window', () => {
  resetProviderDiscovery();
  startProviderDiscovery(undefined);
  assert.deepEqual(announcedProviders(), []);
});

test('candidates merge EIP-6963, window.ethereum.providers and window.ethereum without duplicates', () => {
  resetProviderDiscovery();
  const multiplexer = { providers: [metamask, coinbase], request: async () => [] };
  const win = fakeWindow([{ rdns: 'io.metamask', name: 'MetaMask', provider: metamask }], multiplexer);
  startProviderDiscovery(win);
  const cands = candidateProviders(win);
  assert.deepEqual(
    cands.map((c) => c.source),
    ['eip6963', 'window.ethereum.providers', 'window.ethereum'],
  );
  assert.equal(cands.length, 3, 'metamask appears once although announced and in providers[]');
});

test('a single wallet behaves exactly as before: window.ethereum is the one used', async () => {
  resetProviderDiscovery();
  const win = fakeWindow([{ rdns: 'io.metamask', name: 'MetaMask', provider: metamask }], metamask);
  startProviderDiscovery(win);
  const { chosen, reason } = await selectProvider(candidateProviders(win));
  assert.equal(chosen?.provider, metamask);
  assert.equal(reason, 'only-candidate');
});

test('a host-provided provider always wins', async () => {
  resetProviderDiscovery();
  const injected = { request: async () => [] };
  const { chosen, reason } = await selectProvider([{ provider: metamask, info: null, source: 'window.ethereum' }], {
    injected,
  });
  assert.equal(chosen?.provider, injected);
  assert.equal(reason, 'host-provided');
});

test('two wallets: walletRdns picks, else the one already connected to this site', async () => {
  resetProviderDiscovery();
  const win = fakeWindow(
    [
      { rdns: 'io.metamask', name: 'MetaMask', provider: metamask },
      { rdns: 'com.coinbase.wallet', name: 'Coinbase Wallet', provider: coinbase },
    ],
    coinbase,
  );
  startProviderDiscovery(win);
  const cands = candidateProviders(win);

  const byRdns = await selectProvider(cands, { preferRdns: 'io.metamask' });
  assert.equal(byRdns.chosen?.provider, metamask);
  assert.equal(byRdns.reason, 'walletRdns=io.metamask');

  const byAuth = await selectProvider(cands, {
    authorised: async (c) => c.provider === metamask,
  });
  assert.equal(byAuth.chosen?.provider, metamask);
  assert.equal(byAuth.reason, 'already-authorised');
});

test('two wallets, neither chosen: falls back to window.ethereum and says it was ambiguous', async () => {
  resetProviderDiscovery();
  const win = fakeWindow(
    [
      { rdns: 'io.metamask', name: 'MetaMask', provider: metamask },
      { rdns: 'com.coinbase.wallet', name: 'Coinbase Wallet', provider: coinbase },
    ],
    coinbase,
  );
  startProviderDiscovery(win);
  const { chosen, reason } = await selectProvider(candidateProviders(win), {
    legacy: win.ethereum,
    authorised: async () => { throw new Error('probe failed'); },
  });
  assert.equal(chosen?.provider, coinbase);
  assert.equal(reason, 'ambiguous-fallback');
});

test('no provider at all', async () => {
  resetProviderDiscovery();
  const { chosen, reason } = await selectProvider([]);
  assert.equal(chosen, null);
  assert.equal(reason, 'no-provider');
});

test('describeProvider names the wallet by rdns or by its flags', () => {
  resetProviderDiscovery();
  assert.equal(
    describeProvider({ provider: metamask, info: { uuid: '1', name: 'MetaMask', icon: '', rdns: 'io.metamask' }, source: 'eip6963' }),
    'io.metamask (eip6963)',
  );
  assert.equal(describeProvider({ provider: coinbase, info: null, source: 'window.ethereum' }), 'isCoinbaseWallet (window.ethereum)');
  assert.equal(
    describeProvider({ provider: { providers: [1, 2] }, info: null, source: 'window.ethereum' }),
    'unknown wallet providers[2] (window.ethereum)',
  );
  assert.equal(describeProvider(null), 'none');
});
