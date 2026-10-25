import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// 2.5.0, invisible sign-in option 1. JubJub.ts needs a DOM to run, so the
// wiring is pinned by its source; the behaviour of each piece is tested in
// rememberedSignIn.test.ts.
const src = readFileSync(path.join(process.cwd(), 'src/JubJub.ts'), 'utf8');

function section(start: string, end: string): string {
  const i = src.indexOf(start);
  assert.ok(i >= 0, `missing ${start}`);
  const j = src.indexOf(end, i + start.length);
  return src.slice(i, j < 0 ? undefined : j);
}

test('returning visit: Step 3 resumes the remembered sign-in BEFORE asking the wallet to sign', () => {
  const step3 = section('private async _mintViewerToken', 'private _forgetSessionToken');
  const resume = step3.indexOf('resumeSignIn(address');
  const sign = step3.indexOf('this.api.createViewerSession(');
  assert.ok(resume > 0 && sign > 0 && resume < sign, 'resume must come first');
  assert.match(step3, /if \(resumed\) \{[\s\S]{0,200}this\.api\.setSessionToken\(resumed\.sessionToken\)[\s\S]{0,400}return true;/);
});

test('the resume runs only after the site is confirmed authorised for this account', () => {
  const step3 = section('private async _mintViewerToken', 'private _forgetSessionToken');
  assert.ok(step3.indexOf('_confirmAccountAuthorised(address)') < step3.indexOf('resumeSignIn(address'));
});

test('first visit: the connect-prompt proof is posted, with the device key, and the sign-in is remembered', () => {
  const step3 = section('private async _mintViewerToken', 'private _forgetSessionToken');
  assert.match(step3, /\{ proof, devicePublicKey: deviceKey\?\.publicJwk \?\? null \}/);
  assert.match(step3, /rememberSignIn\(deviceKey, address, minted/);
  // Single use: cleared before it is spent.
  assert.match(step3, /_pendingProof = null;\s*const deviceKey/);
});

test('connect tries the one-prompt sign-in only on a first visit and only on able wallets', () => {
  const connect = section('static async connectBrowserWallet', 'const client = createWalletClient');
  assert.match(connect, /mayConnectAndSignIn\(ethereum\) && !\(await rememberedWallet\(\{\}\)\)/);
  assert.ok(connect.indexOf('connectAndSignIn(') < connect.indexOf('requestAuthorisedAccount('));
});

test('switching wallet or disconnecting asks again', () => {
  const reset = section('static resetWallet(): void', 'static async search');
  assert.match(reset, /forgetSignIn\(/);
  assert.match(reset, /_pendingProof = null/);
  const watch = section('private static _watchAccounts', 'static async connectBrowserWallet');
  assert.match(watch, /'accountsChanged'/);
  assert.match(watch, /_sessionToken = null;\s*JubJub\.resetWallet\(\)/);
});

test('rememberSignIn: false turns remembering off', () => {
  assert.match(src, /config\.rememberSignIn === false/);
  const step3 = section('private async _mintViewerToken', 'private _forgetSessionToken');
  assert.match(step3, /if \(_initRememberSignIn\) \{\s*const resumed/);
  assert.match(step3, /_initRememberSignIn \? await createDeviceKey\(\) : null/);
});

test('back from minting a card: Step 3 redeems the code before any signature, once', () => {
  const step3 = section('private async _mintViewerToken', 'private _forgetSessionToken');
  const redeem = step3.indexOf('redeemSignIn(code, address');
  assert.ok(redeem > step3.indexOf('resumeSignIn(address') && redeem < step3.indexOf('this.api.createViewerSession('));
  assert.match(step3, /const code = _pendingSignInCode;\s*_pendingSignInCode = null;/);
  assert.match(src, /_pendingSignInCode = _pendingSignInCode \?\? takeSignInCode\(\)/);
});
