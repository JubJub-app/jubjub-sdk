import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLAIM_PAGE_URL, claimUrlFor } from '../src/claim';

test('claimUrlFor carries the piece and where the viewer came from', () => {
  assert.equal(claimUrlFor('cnt_abc'), `${CLAIM_PAGE_URL}?c=cnt_abc&from=sdk`);
  assert.equal(claimUrlFor('cnt_abc', 'gate'), `${CLAIM_PAGE_URL}?c=cnt_abc&from=gate`);
});

test('claimUrlFor escapes an id and gives nothing for no id', () => {
  assert.equal(claimUrlFor('a b&c'), `${CLAIM_PAGE_URL}?c=a%20b%26c&from=sdk`);
  assert.equal(claimUrlFor(undefined), undefined);
  assert.equal(claimUrlFor(''), undefined);
  assert.equal(claimUrlFor(null), undefined);
});
