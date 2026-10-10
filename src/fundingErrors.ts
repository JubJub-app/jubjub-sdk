/**
 * Typed funding errors from the streaming endpoints.
 *
 * The backend checks the viewer's USDC allowance and balance before it opens a
 * streaming session (POST /v2/streaming/sessions) and again on every gated-URL
 * refresh (POST /v2/streaming/sessions/{id}/playback-url):
 *
 *   402 {"detail": {"reason": "insufficient_allowance" | "insufficient_balance",
 *                   "message", "required_micro", "allowance_micro",
 *                   "balance_micro", "spender", "token", "chain_id"}}
 *   402 {"detail": {"reason": "tab_unpaid", "code": "tab_unpaid", "message",
 *                   "owed_micro", "owed_usd", "required_micro",
 *                   "required_approval_usd", "short": "allowance" | "balance",
 *                   "allowance_micro", "balance_micro", "spender", "token",
 *                   "chain_id"}}
 *   503 {"detail": {"reason": "funding_unverifiable", "message"}}
 *
 * tab_unpaid (session open, and a session the backend ended mid-play): the
 * wallet owes for earlier viewing, so allowance AND balance must cover the
 * tab plus the floor. required_micro is that total, and it is exactly what
 * the approve button asks for.
 *
 * Pure and DOM-free so it is unit-tested directly (test/fundingErrors.test.ts).
 * Parsing NEVER throws: a missing or garbled body yields null and the caller
 * keeps its ordinary "failed: <status>" error.
 */

/** USDC has 6 decimals: 500000 micro = $0.50. */
export const USDC_MICRO = 1_000_000;

/** The backend's minimum; used only when a 402 body omits required_micro. */
export const DEFAULT_REQUIRED_MICRO = 500_000;

export type FundingRequiredReason =
  | 'insufficient_allowance'
  | 'insufficient_balance'
  | 'tab_unpaid';

/** "$0.50" from 500000 micro USDC. */
export function formatMicroUsdc(micro: number): string {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '$0.00';
  return `$${(n / USDC_MICRO).toFixed(2)}`;
}

/** 'Base' for 8453, 'Base Sepolia' for 84532, 'Base' when unknown. */
function networkLabel(chainId: number | null): string {
  return chainId === 84532 ? 'Base Sepolia' : 'Base';
}

/**
 * The user-facing gate text for a funding error. Exported so a host that
 * renders its own UI (the Farcaster mini-app) can show exactly what the
 * built-in gate shows.
 */
export function fundingMessage(
  err: FundingRequiredError | FundingUnverifiableError,
): { title: string; sub: string; action: string } {
  if (err instanceof FundingUnverifiableError) {
    return {
      title: "Couldn't check your USDC",
      sub: "We couldn't reach the network to verify your wallet. Please try again.",
      action: 'Try again',
    };
  }
  const need = formatMicroUsdc(err.requiredMicro);
  if (err.reason === 'tab_unpaid') {
    const owed = formatMicroUsdc(err.owedMicro ?? 0);
    if (err.short === 'balance') {
      return {
        title: `You have ${owed} unpaid from earlier viewing`,
        sub:
          `Add USDC (${networkLabel(err.chainId)}) so your wallet holds at least ${need}, ` +
          'then try again to settle it and keep watching.',
        action: 'Try again',
      };
    }
    return {
      title: `You have ${owed} unpaid from earlier viewing`,
      sub: `Approve ${need} to settle it and keep watching.`,
      action: `Approve ${need}`,
    };
  }
  if (err.reason === 'insufficient_allowance') {
    return {
      title: `Approve at least ${need} USDC for JubJub streaming`,
      sub:
        err.allowanceMicro != null
          ? `Your current USDC approval is ${formatMicroUsdc(err.allowanceMicro)}. ` +
            'Approve in your wallet to start streaming.'
          : 'Approve in your wallet to start streaming.',
      action: 'Approve USDC',
    };
  }
  return {
    title: `Add at least ${need} USDC (${networkLabel(err.chainId)}) to your wallet`,
    sub:
      err.balanceMicro != null
        ? `Your wallet holds ${formatMicroUsdc(err.balanceMicro)} USDC. Top up, then try again.`
        : 'Top up your wallet, then try again.',
    action: 'Try again',
  };
}

/**
 * 402: the viewer cannot fund streaming. `spender` is the address the USDC
 * allowance must be granted to (the creator pool), NOT the payment router.
 * Amounts are micro-USDC; null when the backend did not send one.
 */
export class FundingRequiredError extends Error {
  readonly name = 'FundingRequiredError';
  readonly status = 402;
  readonly retryable = false;
  readonly reason: FundingRequiredReason;
  readonly requiredMicro: number;
  readonly allowanceMicro: number | null;
  readonly balanceMicro: number | null;
  readonly spender: string | null;
  readonly token: string | null;
  readonly chainId: number | null;
  /** tab_unpaid only: what the wallet owes from earlier viewing. */
  readonly owedMicro: number | null;
  /** tab_unpaid only: which fell short. 'balance' means approving cannot help. */
  readonly short: 'allowance' | 'balance' | null;

  constructor(fields: {
    reason: FundingRequiredReason;
    message?: string;
    requiredMicro?: number | null;
    allowanceMicro?: number | null;
    balanceMicro?: number | null;
    spender?: string | null;
    token?: string | null;
    chainId?: number | null;
    owedMicro?: number | null;
    short?: 'allowance' | 'balance' | null;
  }) {
    super(fields.message || fields.reason);
    // Keep instanceof working when compiled to ES5-style classes.
    Object.setPrototypeOf(this, FundingRequiredError.prototype);
    this.reason = fields.reason;
    this.requiredMicro =
      fields.requiredMicro != null && Number.isFinite(fields.requiredMicro) && fields.requiredMicro > 0
        ? fields.requiredMicro
        : DEFAULT_REQUIRED_MICRO;
    this.allowanceMicro = fields.allowanceMicro ?? null;
    this.balanceMicro = fields.balanceMicro ?? null;
    this.spender = fields.spender ?? null;
    this.token = fields.token ?? null;
    this.chainId = fields.chainId ?? null;
    this.owedMicro = fields.owedMicro ?? null;
    this.short = fields.short ?? null;
  }

  /**
   * True when the fix is an approval: insufficient_allowance, or a tab the
   * allowance does not cover. tab_unpaid short on BALANCE is not one.
   */
  get needsApproval(): boolean {
    return (
      this.reason === 'insufficient_allowance' ||
      (this.reason === 'tab_unpaid' && this.short !== 'balance')
    );
  }
}

/** 503 funding_unverifiable: the backend could not read the chain. Retry. */
export class FundingUnverifiableError extends Error {
  readonly name = 'FundingUnverifiableError';
  readonly status = 503;
  readonly retryable = true;
  readonly reason = 'funding_unverifiable' as const;

  constructor(message?: string) {
    super(message || 'funding_unverifiable');
    Object.setPrototypeOf(this, FundingUnverifiableError.prototype);
  }
}

export function isFundingRequiredError(err: unknown): err is FundingRequiredError {
  return err instanceof FundingRequiredError;
}

export function isFundingUnverifiableError(err: unknown): err is FundingUnverifiableError {
  return err instanceof FundingUnverifiableError;
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function addr(v: unknown): string | null {
  return typeof v === 'string' && ADDRESS_RE.test(v) ? v : null;
}

/**
 * Turn a failed response into a typed funding error, or null when it is not
 * one (any other status, or a body that does not carry a known reason).
 * Accepts the raw body text; never throws.
 */
export function parseFundingError(
  status: number,
  bodyText: string | null | undefined,
): FundingRequiredError | FundingUnverifiableError | null {
  if (status !== 402 && status !== 503) return null;
  let detail: any = null;
  try {
    const body = bodyText ? JSON.parse(bodyText) : null;
    detail = body && typeof body === 'object' ? (body as any).detail : null;
  } catch {
    return null;
  }
  if (!detail || typeof detail !== 'object') return null;
  const reason = detail.reason;
  const message = typeof detail.message === 'string' ? detail.message : undefined;

  if (status === 503 && reason === 'funding_unverifiable') {
    return new FundingUnverifiableError(message);
  }
  if (
    status === 402 &&
    (reason === 'insufficient_allowance' ||
      reason === 'insufficient_balance' ||
      reason === 'tab_unpaid')
  ) {
    return new FundingRequiredError({
      reason,
      message,
      requiredMicro: num(detail.required_micro),
      allowanceMicro: num(detail.allowance_micro),
      balanceMicro: num(detail.balance_micro),
      spender: addr(detail.spender),
      token: addr(detail.token),
      chainId: num(detail.chain_id),
      owedMicro: reason === 'tab_unpaid' ? num(detail.owed_micro) : null,
      short:
        reason === 'tab_unpaid' && (detail.short === 'allowance' || detail.short === 'balance')
          ? detail.short
          : null,
    });
  }
  return null;
}
