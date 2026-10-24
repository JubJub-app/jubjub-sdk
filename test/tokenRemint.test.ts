import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ApiClient, ApiHttpError } from '../src/api/ApiClient';
import { isAuthRefusal } from '../src/sessionLifecycle';

// 2026-10-24: a jj_ viewer token that expired mid-viewing made the quiet
// reopen fail with "Payment service unavailable". The open's 401 forgot the
// page-shared token but this instance's ApiClient kept the dead one, so the
// reopen skipped signing and was refused the same way every time.

test('401 and 403 from the open are auth refusals', () => {
  assert.equal(isAuthRefusal(new ApiHttpError('Create session', 401, 'expired')), true);
  assert.equal(isAuthRefusal(new ApiHttpError('Create session', 403, 'invalid')), true);
});

test('funding, content and server answers are not', () => {
  for (const status of [402, 409, 500, 503]) {
    assert.equal(isAuthRefusal(new ApiHttpError('Create session', status)), false, String(status));
  }
  assert.equal(isAuthRefusal(new Error('network')), false);
  assert.equal(isAuthRefusal(null), false);
});

test('the client can forget its token, so the next open signs afresh', () => {
  const api = new ApiClient('https://api.example');
  api.setSessionToken('jj_old');
  assert.equal(api.hasSessionToken(), true);
  api.clearSessionToken();
  assert.equal(api.hasSessionToken(), false);
});

test('the open re-mints once on an auth refusal and forgets the token in both places', () => {
  // JubJub.ts needs a DOM to run, so the wiring is pinned by its source.
  const src = readFileSync(path.join(process.cwd(), 'src/JubJub.ts'), 'utf8');
  const step5 = src.slice(src.indexOf('// 5. Create streaming session'), src.indexOf("Step 5 done"));
  assert.match(step5, /if \(!authRetried && isAuthRefusal\(streamErr\)\)/);
  assert.match(step5, /this\._forgetSessionToken\(\);[\s\S]{0,200}this\._mintViewerToken\(contentId, address\)/);
  assert.doesNotMatch(step5, /_sessionToken = null/, 'forgetting only the shared copy is the bug');
  const forget = src.slice(src.indexOf('private _forgetSessionToken'), src.indexOf('private _gatePayment'));
  assert.match(forget, /_sessionToken = null/);
  assert.match(forget, /this\.api\.clearSessionToken\(\)/);
});
