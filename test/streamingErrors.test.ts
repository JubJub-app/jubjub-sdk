import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ContentNotPlayableError,
  contentNotPlayableMessage,
  isContentNotPlayableError,
  parseContentNotPlayable,
} from '../src/streamingErrors';

/** The backend's 409 for cnt_7008a13a106c before its contract exists (streaming_session_manager.py). */
const NOT_MINTED = JSON.stringify({
  detail:
    'Content cnt_7008a13a106c cannot be streamed for payment (contract=none, ' +
    'ownership_status=pending, publish_confirmed=True). JubJub only meters media that has ' +
    'been published on-chain against a live contract and catalogue, so a session could not ' +
    'pay its rights holders.',
});

const HOSTED_ELSEWHERE = JSON.stringify({
  detail:
    'Content cnt_abc lives on youtube and JubJub holds no file for it, so there is nothing to stream here.',
});

test('a 409 for an unminted piece is typed not_minted and says the piece is not ready', () => {
  const err = parseContentNotPlayable(409, NOT_MINTED);
  assert.ok(err instanceof ContentNotPlayableError);
  assert.equal(isContentNotPlayableError(err), true);
  assert.equal(err!.reason, 'not_minted');
  assert.equal(err!.status, 409);
  const text = contentNotPlayableMessage(err!);
  assert.equal(text.title, "This video isn't ready for paid streaming yet");
  assert.match(text.sub, /ownership record/);
  assert.doesNotMatch(text.title + text.sub, /Payment service unavailable/);
});

test('a 409 for a piece JubJub holds no file for is typed hosted_elsewhere', () => {
  const err = parseContentNotPlayable(409, HOSTED_ELSEWHERE);
  assert.equal(err?.reason, 'hosted_elsewhere');
  assert.match(contentNotPlayableMessage(err!).title, /own platform/);
});

test('other statuses are not content refusals; an unfamiliar 409 keeps its detail', () => {
  assert.equal(parseContentNotPlayable(402, NOT_MINTED), null);
  assert.equal(parseContentNotPlayable(500, NOT_MINTED), null);
  const other = parseContentNotPlayable(409, JSON.stringify({ detail: 'Something else entirely' }));
  assert.equal(other?.reason, 'unknown');
  assert.match(contentNotPlayableMessage(other!).sub, /Something else entirely/);
  assert.equal(parseContentNotPlayable(409, ''), null);
  assert.equal(parseContentNotPlayable(409, null), null);
});

test("the documented ownership_pending code maps to \"isn't ready\" whatever the wording", () => {
  const body = JSON.stringify({ detail: { reason: 'ownership_pending', content_id: 'cnt_303e26ced0f0', message: 'Content cnt_303e26ced0f0 has no ownership contract yet, so a streaming session could not pay its rights holders.', ownership_status: 'pending', ownership_reason: 'split_config_unresolved' } });
  const err = parseContentNotPlayable(409, body);
  assert.equal(err?.reason, 'not_minted');
  assert.equal(contentNotPlayableMessage(err!).title, "This video isn't ready for paid streaming yet");
  const structured = parseContentNotPlayable(409, JSON.stringify({ detail: { reason: 'content_not_sellable', content_id: 'cnt_x', message: 'Content cnt_x lives on youtube and JubJub holds no file for it, so there is nothing to stream here.' } }));
  assert.equal(structured?.reason, 'hosted_elsewhere');
});

test("the pre-2026-10-09 backend's bare 400 for a missing contract is read the same way", () => {
  // Tom's console, 2.1.4: POST /v2/streaming/sessions -> 400 and the SDK said "Payment service unavailable".
  const legacy = parseContentNotPlayable(400, JSON.stringify({ detail: 'Content cnt_303e26ced0f0 has no ownership contract deployed. Cannot create streaming session.' }));
  assert.equal(legacy?.reason, 'not_minted');
  assert.equal(contentNotPlayableMessage(legacy!).title, "This video isn't ready for paid streaming yet");
  // any other 400 stays an ordinary failure
  assert.equal(parseContentNotPlayable(400, JSON.stringify({ detail: 'viewer_wallet is required' })), null);
  assert.equal(parseContentNotPlayable(400, ''), null);
});

test('a non-JSON 409 body is read as plain text and never throws', () => {
  const err = parseContentNotPlayable(409, 'Content cnt_x cannot be streamed for payment (contract=none)');
  assert.equal(err?.reason, 'not_minted');
  const nested = parseContentNotPlayable(409, JSON.stringify({ detail: { message: 'JubJub only meters media published on-chain against a live contract' } }));
  assert.equal(nested?.reason, 'not_minted');
});
