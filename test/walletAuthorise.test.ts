import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STALE_CONNECTION_CODE,
  reconfirmAuthorisedAccount,
  requestAuthorisedAccount,
  staleConnectionError,
} from '../src/walletAuthorise';
import { classifyWalletError, isWalletError, walletGateMessage } from '../src/walletErrors';

const TOM = '0x68709311A1999A8861A5aD5b6bb454dFffDC3ddB';
const OTHER = '0x0000000000000000000000000000000000000002';

/**
 * A wallet with a stale connection record, as measured on bankrtv.app:
 * eth_requestAccounts serves the cached account with no popup, eth_accounts
 * lists nothing for the origin until wallet_requestPermissions rewrites it.
 */
function staleWallet(opts: { afterPermission?: string[] | 'still-empty' | 'reject' | 'pending' | 'unsupported'; noAccountsMethod?: boolean } = {}) {
  const calls: string[] = [];
  let permitted: string[] = [];
  const provider = {
    async request({ method }: { method: string; params?: unknown[] }) {
      calls.push(method);
      if (method === 'eth_requestAccounts') return [TOM];
      if (method === 'eth_accounts') {
        if (opts.noAccountsMethod) throw Object.assign(new Error('Unsupported method'), { code: 4200 });
        return permitted;
      }
      if (method === 'wallet_requestPermissions') {
        const after = opts.afterPermission ?? [TOM];
        if (after === 'reject') throw Object.assign(new Error('User rejected the request.'), { code: 4001 });
        if (after === 'pending') throw Object.assign(new Error("Request of type 'wallet_requestPermissions' already pending"), { code: -32002 });
        if (after === 'unsupported') throw Object.assign(new Error('Method not supported'), { code: 4200 });
        if (after !== 'still-empty') permitted = after;
        return [{ parentCapability: 'eth_accounts' }];
      }
      throw new Error(`unexpected ${method}`);
    },
  };
  return { provider, calls };
}

test('the measured loop: cached account, empty eth_accounts, one fresh permission prompt, then authorised', async () => {
  const { provider, calls } = staleWallet();
  const log: string[] = [];
  const address = await requestAuthorisedAccount(provider, 'bankrtv.app', (m, ...d) => log.push([m, ...d.map(String)].join(' ')));
  assert.equal(address, TOM);
  assert.deepEqual(calls, ['eth_requestAccounts', 'eth_accounts', 'wallet_requestPermissions', 'eth_accounts']);
  assert.equal(calls.filter((c) => c === 'wallet_requestPermissions').length, 1, 'exactly one permission prompt');
  assert.ok(log.some((l) => /asking for a fresh permission/.test(l)));
});

test('a healthy wallet never sees a permission prompt', async () => {
  const calls: string[] = [];
  const provider = {
    async request({ method }: { method: string }) {
      calls.push(method);
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [TOM.toLowerCase()];
      throw new Error(`unexpected ${method}`);
    },
  };
  assert.equal((await requestAuthorisedAccount(provider, 'bankrtv.app')).toLowerCase(), TOM.toLowerCase());
  assert.deepEqual(calls, ['eth_requestAccounts', 'eth_accounts']);
});

test('the viewer picks another account in the fresh dialog: the wallet\'s choice wins', async () => {
  const { provider } = staleWallet({ afterPermission: [OTHER] });
  assert.equal(await requestAuthorisedAccount(provider, 'bankrtv.app'), OTHER);
});

test('still empty after the fresh prompt: a stale-connection error that says disconnect and reload', async () => {
  const { provider, calls } = staleWallet({ afterPermission: 'still-empty' });
  await assert.rejects(requestAuthorisedAccount(provider, 'bankrtv.app'), (e: any) => {
    assert.equal(e.code, STALE_CONNECTION_CODE);
    assert.equal(isWalletError(e), true);
    assert.match(e.message, /disconnect bankrtv\.app, reload the page/);
    return true;
  });
  assert.equal(calls.filter((c) => c === 'wallet_requestPermissions').length, 1);
});

test('declining or already-pending permission prompts are reported as such, never as a stale connection', async () => {
  await assert.rejects(requestAuthorisedAccount(staleWallet({ afterPermission: 'reject' }).provider, 'bankrtv.app'), (e: any) => {
    assert.equal(classifyWalletError(e), 'rejected');
    return true;
  });
  await assert.rejects(requestAuthorisedAccount(staleWallet({ afterPermission: 'pending' }).provider, 'bankrtv.app'), (e: any) => {
    assert.equal(classifyWalletError(e), 'pending');
    return true;
  });
});

test('a wallet without wallet_requestPermissions falls through to the re-check', async () => {
  const { provider, calls } = staleWallet({ afterPermission: 'unsupported' });
  await assert.rejects(requestAuthorisedAccount(provider, 'bankrtv.app'), (e: any) => e.code === STALE_CONNECTION_CODE);
  assert.deepEqual(calls, ['eth_requestAccounts', 'eth_accounts', 'wallet_requestPermissions', 'eth_accounts']);
});

test('a wallet that cannot answer eth_accounts is given the benefit of the doubt, as before', async () => {
  const { provider, calls } = staleWallet({ noAccountsMethod: true });
  assert.equal(await requestAuthorisedAccount(provider, 'bankrtv.app'), TOM);
  assert.deepEqual(calls, ['eth_requestAccounts', 'eth_accounts']);
});

test('before signing: a connection the viewer removed between plays gets one fresh prompt', async () => {
  const { provider, calls } = staleWallet();
  assert.equal(await reconfirmAuthorisedAccount(provider, TOM, 'bankrtv.app'), TOM);
  assert.deepEqual(calls, ['eth_accounts', 'wallet_requestPermissions', 'eth_accounts']);
  const wedged = staleWallet({ afterPermission: 'still-empty' });
  await assert.rejects(reconfirmAuthorisedAccount(wedged.provider, TOM, 'bankrtv.app'), (e: any) => e.code === STALE_CONNECTION_CODE);
});

test('the gate text for a stale connection tells the viewer what to do in the wallet', () => {
  const err = staleConnectionError(TOM, 'bankrtv.app');
  assert.equal(classifyWalletError(err), 'stale_connection');
  const text = walletGateMessage('stale_connection', { host: 'bankrtv.app' });
  assert.match(text.title, /Reconnect your wallet/);
  assert.match(text.sub, /open the wallet/i);
  assert.match(text.sub, /disconnect bankrtv\.app/);
  assert.match(text.sub, /reload/i);
  assert.doesNotMatch(text.title + text.sub, /Payment service unavailable/);
});
