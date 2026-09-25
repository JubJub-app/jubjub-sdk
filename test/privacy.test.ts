import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MEMBER_FALLBACK_NAME,
  publicProfileFrom,
  redactEmails,
  stripInternalIdentity,
} from '../src/privacy';
import { ApiClient, toContentInfo } from '../src/api/ApiClient';

const BASE = {
  content_id: 'cnt_1',
  title: 'A piece',
  price_per_minute_usdc: 0.05,
  content_contract: null,
  payment_router: '0xrouter',
  usdc_address: '0xusdc',
  chain_id: 8453,
};

test('playback info from an OLD backend: profile id and email never reach the host', () => {
  const info = toContentInfo({
    ...BASE,
    creator_profile_id: 'Zx9QpL2mRr8TtYyUu1',
    creator_email: 'alice@example.com',
    owner_email: 'bob@example.com',
    profile_id: 'Zx9QpL2mRr8TtYyUu1',
  });
  const text = JSON.stringify(info);
  assert.ok(!text.includes('alice@example.com'));
  assert.ok(!text.includes('bob@example.com'));
  assert.ok(!text.includes('Zx9QpL2mRr8TtYyUu1'));
  // The response did say something about the creator, just nothing public.
  assert.deepEqual(info.creator, { display_name: MEMBER_FALLBACK_NAME });
  assert.equal(info.price_per_minute_usdc, 0.05);
});

test('playback info from a NEW backend carries the public profile', () => {
  const info = toContentInfo({
    ...BASE,
    playback_grant: 'jjg_x',
    gated: true,
    creator: {
      display_name: 'Alice',
      avatar_url: 'https://cdn.example/a.png',
      handle: 'alice',
      member_ref: 'mbr_abc',
    },
  });
  assert.deepEqual(info.creator, {
    display_name: 'Alice',
    avatar_url: 'https://cdn.example/a.png',
    handle: 'alice',
    member_ref: 'mbr_abc',
  });
  assert.equal(info.gated, true);
  assert.equal(info.playback_grant, 'jjg_x');
});

test('playback info with no creator fields at all has no creator, and does not crash', () => {
  assert.equal(toContentInfo(BASE).creator, undefined);
  assert.doesNotThrow(() => toContentInfo(null));
  assert.doesNotThrow(() => toContentInfo('nonsense'));
});

test('a display name that is an email or an internal id is refused', () => {
  assert.equal(
    publicProfileFrom({ creator_name: 'carol@example.com' })!.display_name,
    MEMBER_FALLBACK_NAME,
  );
  assert.equal(
    publicProfileFrom({ creator_name: 'pid123456', creator_profile_id: 'pid123456' })!.display_name,
    MEMBER_FALLBACK_NAME,
  );
  // Handle is the next best public name.
  assert.equal(publicProfileFrom({ creator_handle: 'dave' })!.display_name, '@dave');
  // display_name wins over the legacy creator_name.
  assert.equal(
    publicProfileFrom({ creator_display_name: 'Eve', creator_name: 'eve-legacy' })!.display_name,
    'Eve',
  );
  // A member ref must be opaque: anything not mbr_ is dropped.
  assert.equal(publicProfileFrom({ creator_member_ref: 'Zx9QpL2m' })!.member_ref, undefined);
});

test('stripInternalIdentity removes id/email keys at any depth and keeps public ones', () => {
  const out = stripInternalIdentity({
    content_id: 'cnt_1',
    thumbnail_id: 'th_1',
    owner_profile_id: 'p1',
    holders: [{ profile_id: 'p2', email: 'h@example.com', display_name: 'Holder', member_ref: 'mbr_2' }],
    note: 'contact z@example.com',
  });
  assert.deepEqual(out, {
    content_id: 'cnt_1',
    thumbnail_id: 'th_1',
    holders: [{ display_name: 'Holder', member_ref: 'mbr_2' }],
    note: 'contact [email hidden]',
  });
});

test('redactEmails hides every address in free text', () => {
  assert.equal(
    redactEmails('creator a@b.co not found; b.c+d@x.org too'),
    'creator [email hidden] not found; [email hidden] too',
  );
});

test('search scrubs owner identifiers the backend failed to strip', async () => {
  const g = globalThis as any;
  const realFetch = g.fetch;
  g.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      results: [{ content_id: 'cnt_1', title: 'T', creator_email: 'x@y.com', owner_profile_id: 'p9' }],
      count: 1,
      scope: 'discoverable',
      next_cursor: null,
    }),
  });
  try {
    const res = await new ApiClient('https://api.example').search('pk_test');
    assert.deepEqual(res.results, [{ content_id: 'cnt_1', title: 'T' }]);
    assert.equal(res.count, 1);
  } finally {
    g.fetch = realFetch;
  }
});

test('a registration error never echoes the creator email', async () => {
  const g = globalThis as any;
  const realFetch = g.fetch;
  g.fetch = async () => ({
    ok: false,
    status: 400,
    text: async () => '{"detail":"no creator alice@example.com"}',
  });
  try {
    await assert.rejects(
      new ApiClient('https://api.example').registerContent('pk', {
        creator: 'alice@example.com',
        title: 't',
        mediaUrl: 'https://m/x.mp4',
      }),
      (err: Error) => !err.message.includes('alice@example.com'),
    );
  } finally {
    g.fetch = realFetch;
  }
});
