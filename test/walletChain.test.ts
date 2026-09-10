import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAIN_MISMATCH_CODE,
  chainIdMatches,
  chainMismatchError,
  isChainMismatchError,
  isUserRejection,
} from '../src/walletChain';

test('chainIdMatches accepts hex, decimal string and number forms', () => {
  assert.equal(chainIdMatches('0x2105', 8453), true);
  assert.equal(chainIdMatches('0x14A34', 84532), true);
  assert.equal(chainIdMatches('0x14a34', 84532), true);
  assert.equal(chainIdMatches('8453', 8453), true);
  assert.equal(chainIdMatches(8453, 8453), true);
});

test('chainIdMatches rejects other chains and junk', () => {
  assert.equal(chainIdMatches('0x1', 8453), false);
  assert.equal(chainIdMatches('0x2105', 84532), false);
  assert.equal(chainIdMatches('', 8453), false);
  assert.equal(chainIdMatches(null, 8453), false);
  assert.equal(chainIdMatches(undefined, 8453), false);
  assert.equal(chainIdMatches('not-a-chain', 8453), false);
  assert.equal(chainIdMatches(8453.5, 8453), false);
});

test('isUserRejection recognises EIP-1193 4001 and wallet wording', () => {
  assert.equal(isUserRejection({ code: 4001, message: 'User rejected the request.' }), true);
  assert.equal(isUserRejection({ code: 'ACTION_REJECTED' }), true);
  assert.equal(isUserRejection(new Error('MetaMask Tx Signature: User denied transaction signature.')), true);
  assert.equal(isUserRejection(new Error('User declined')), true);
  assert.equal(isUserRejection(new Error('Internal JSON-RPC error')), false);
  assert.equal(isUserRejection(null), false);
});

test("isChainMismatchError recognises Phantom's switch refusal text", () => {
  assert.equal(
    isChainMismatchError(new Error('The requested chain ID does not match the currently active chain.')),
    true,
  );
  assert.equal(
    isChainMismatchError({ message: 'Requested chain id cannot be shown to the user.' }),
    true,
  );
});

test('isChainMismatchError recognises the SDK error and not unrelated ones', () => {
  const err = chainMismatchError('Base');
  assert.equal(err.code, CHAIN_MISMATCH_CODE);
  assert.match(err.message, /another network/);
  assert.match(err.message, /Switch it to Base/);
  assert.equal(isChainMismatchError(err), true);
  assert.equal(isChainMismatchError(new Error('Payment service unavailable')), false);
  assert.equal(isChainMismatchError({ code: 4001, message: 'User rejected the request.' }), false);
  assert.equal(isChainMismatchError(undefined), false);
});

test('chainMismatchError keeps the underlying wallet error as cause', () => {
  const cause = new Error('Unrecognized chain ID');
  const err = chainMismatchError('Base Sepolia', cause);
  assert.equal(err.cause, cause);
  assert.match(err.message, /Base Sepolia/);
});
