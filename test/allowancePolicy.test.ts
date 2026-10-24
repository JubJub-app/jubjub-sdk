import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STREAMING_ALLOWANCE_USD,
  MAX_STREAMING_ALLOWANCE_USD,
  PREFLIGHT_FLOOR_MICRO,
  needsPreflightApproval,
  standingAllowanceMicro,
} from '../src/allowancePolicy';

// The pot model (Tom, 2026-10-24), decision 2: the SDK approves before a
// session only when the allowance is below the backend's floor
// (FUNDING_FLOOR_MICRO, $0.50). Above it the backend decides, and its 402
// drives any exact approval.

test('the pre-flight floor is the backend floor, $0.50 in micro-USDC', () => {
  assert.equal(PREFLIGHT_FLOOR_MICRO, 500_000n);
});

test('an allowance at or above the floor needs no approval: the replay draws from the pot', () => {
  assert.equal(needsPreflightApproval(500_000n), false);
  assert.equal(needsPreflightApproval(1_000_000n), false); // the dashboard's $1 approval
  assert.equal(needsPreflightApproval(10_000_000n), false); // the SDK's $10 standing amount
  // Before 2.2.0 the threshold was max($2, price x 120 min): a viewer who had
  // approved $1 on the studio was asked again here. Pinned: $1.99 is enough.
  assert.equal(needsPreflightApproval(1_990_000n), false);
});

test('an allowance below the floor needs an approval', () => {
  assert.equal(needsPreflightApproval(0n), true);
  assert.equal(needsPreflightApproval(499_999n), true);
  assert.equal(needsPreflightApproval(120_000n), true);
});

test('the standing amount defaults to $10 and is clamped to the $500 ceiling', () => {
  assert.equal(DEFAULT_STREAMING_ALLOWANCE_USD, 10);
  assert.equal(MAX_STREAMING_ALLOWANCE_USD, 500);
  assert.equal(standingAllowanceMicro(undefined), 10_000_000n);
  assert.equal(standingAllowanceMicro(NaN), 10_000_000n);
  assert.equal(standingAllowanceMicro(-3), 10_000_000n);
  assert.equal(standingAllowanceMicro(25), 25_000_000n);
  assert.equal(standingAllowanceMicro(500), 500_000_000n);
  assert.equal(standingAllowanceMicro(10_000), 500_000_000n);
});

test('the standing amount is never below the floor', () => {
  // Approving less than the floor would be refused by the backend at once and
  // ask the viewer again on the next play.
  assert.equal(standingAllowanceMicro(0.1), PREFLIGHT_FLOOR_MICRO);
  assert.equal(standingAllowanceMicro(0.5), PREFLIGHT_FLOOR_MICRO);
  assert.equal(standingAllowanceMicro(0.51), 510_000n);
  assert.equal(needsPreflightApproval(standingAllowanceMicro(0.1)), false);
});
