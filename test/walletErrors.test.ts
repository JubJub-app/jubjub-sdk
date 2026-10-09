import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  UNAUTHORISED_ACCOUNT_CODE,
  accountIsAuthorised,
  classifyWalletError,
  isWalletError,
  markWalletError,
  unauthorisedAccountError,
  walletErrorCode,
  walletGateMessage,
} from '../src/walletErrors';

/** What MetaMask threw on bankrtv.app, 2026-10-09, wrapped the way viem rethrows it. */
function metamask4100() {
  const inner = Object.assign(
    new Error('The requested account and/or method has not been authorized by the user.'),
    { code: 4100 },
  );
  const wrapped = new Error(
    'The requested method and/or account has not been authorized by the user. (viem@2.47.17)',
  ) as Error & { cause?: unknown };
  wrapped.cause = inner;
  return wrapped;
}

test('4100 unauthorised: by code, by nested viem cause, and by MetaMask wording', () => {
  assert.equal(classifyWalletError({ code: 4100, message: 'Unauthorized' }), 'unauthorised');
  assert.equal(classifyWalletError(metamask4100()), 'unauthorised');
  assert.equal(walletErrorCode(metamask4100()), 4100);
  assert.equal(
    classifyWalletError(new Error('The requested account and/or method has not been authorized by the user.')),
    'unauthorised',
  );
});

test('4001 user rejected and wallet wording map to rejected', () => {
  assert.equal(classifyWalletError({ code: 4001, message: 'User rejected the request.' }), 'rejected');
  assert.equal(classifyWalletError({ code: 'ACTION_REJECTED' }), 'rejected');
  assert.equal(classifyWalletError(new Error('MetaMask Message Signature: User denied message signature.')), 'rejected');
});

test('-32002 pending, 4200 unsupported, 4900 disconnected', () => {
  assert.equal(
    classifyWalletError({ code: -32002, message: "Request of type 'wallet_requestPermissions' already pending" }),
    'pending',
  );
  assert.equal(classifyWalletError(new Error('Request already pending for origin')), 'pending');
  assert.equal(classifyWalletError({ code: 4200, message: 'Unsupported method' }), 'unsupported');
  assert.equal(classifyWalletError({ code: 4900, message: 'Disconnected' }), 'disconnected');
  assert.equal(classifyWalletError({ code: 4901, message: 'Chain disconnected' }), 'disconnected');
});

test("the SDK's own unauthorised-account error and chain mismatch are recognised", () => {
  const err = unauthorisedAccountError('0x68709311A1999A8861A5aD5b6bb454dFffDC3ddB', 'bankrtv.app');
  assert.equal(err.code, UNAUTHORISED_ACCOUNT_CODE);
  assert.match(err.message, /bankrtv\.app/);
  assert.equal(classifyWalletError(err), 'unauthorised');
  assert.equal(
    classifyWalletError(new Error('The requested chain ID does not match the currently active chain.')),
    'chain_mismatch',
  );
});

test('a wallet that did not answer, no account, and unknown errors', () => {
  assert.equal(classifyWalletError(new TypeError("Cannot read properties of undefined (reading 'error')")), 'no_reply');
  assert.equal(classifyWalletError(new Error('No accounts returned from wallet.')), 'no_account');
  assert.equal(classifyWalletError(new Error('Internal JSON-RPC error')), 'other');
  assert.equal(classifyWalletError(null), 'other');
  assert.equal(classifyWalletError(undefined), 'other');
});

test('gate text: unauthorised asks the viewer to connect this site, rejected says they cancelled', () => {
  const un = walletGateMessage('unauthorised', { host: 'bankrtv.app' });
  assert.equal(un.title, 'Connect your wallet to this site');
  assert.match(un.sub, /bankrtv\.app/);
  assert.match(un.sub, /connect this site/i);
  assert.equal(un.action, 'Connect wallet');

  const rej = walletGateMessage('rejected');
  assert.equal(rej.title, 'You cancelled the request');
  assert.equal(rej.action, 'Try again');

  const pend = walletGateMessage('pending');
  assert.match(pend.title, /waiting/i);
  assert.match(pend.sub, /already has a request open/);

  const chain = walletGateMessage('chain_mismatch', { chainLabel: 'Base Sepolia' });
  assert.match(chain.title, /Base Sepolia/);
});

test('no wallet error is ever reported as a payment-service outage', () => {
  const kinds = [
    'rejected', 'unauthorised', 'pending', 'unsupported', 'disconnected',
    'chain_mismatch', 'no_account', 'no_reply', 'other',
  ] as const;
  for (const k of kinds) {
    const t = walletGateMessage(k, { detail: 'Internal JSON-RPC error' });
    assert.doesNotMatch(t.title, /Payment service unavailable/, k);
    assert.doesNotMatch(t.sub, /Payment service unavailable/, k);
    assert.ok(t.action.length > 0, k);
  }
  assert.match(walletGateMessage('other', { detail: 'Internal JSON-RPC error' }).sub, /Internal JSON-RPC error/);
});

test('accountIsAuthorised is case-insensitive and strict about shape', () => {
  const addr = '0x68709311A1999A8861A5aD5b6bb454dFffDC3ddB';
  assert.equal(accountIsAuthorised([addr.toLowerCase()], addr), true);
  assert.equal(accountIsAuthorised([addr], addr.toLowerCase()), true);
  assert.equal(accountIsAuthorised(['0x0000000000000000000000000000000000000001'], addr), false);
  assert.equal(accountIsAuthorised([], addr), false);
  assert.equal(accountIsAuthorised(null, addr), false);
  assert.equal(accountIsAuthorised('not-a-list', addr), false);
  assert.equal(accountIsAuthorised([addr], ''), false);
});

test('markWalletError tags an error without changing its shape; fetch failures stay untagged', () => {
  const walletErr = markWalletError(Object.assign(new Error('User rejected'), { code: 4001 }));
  assert.equal(isWalletError(walletErr), true);
  assert.equal(walletErr.code, 4001);
  assert.deepEqual(Object.keys(walletErr), ['code']);
  assert.equal(isWalletError(new TypeError('Failed to fetch')), false);
  assert.equal(isWalletError(null), false);
  assert.equal(markWalletError(null), null);
});
