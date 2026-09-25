/**
 * Privacy rule (2026-09-25): profile ids and emails are INTERNAL. Only a
 * JubJub platform admin, or a person reading their OWN record, may see them.
 * Everything this SDK hands to a host page -- events, getContentInfo(),
 * search cards, console logs, DOM -- names other people ONLY by public
 * profile (display name, avatar, handle) or an opaque member ref ("mbr_...").
 *
 * The backend is being changed to stop sending other people's profile_id /
 * email. These helpers make the SDK safe against BOTH shapes: an old response
 * that still carries them is scrubbed here; a new one passes through.
 *
 * Pure (no DOM, no fetch) so the node test runner can exercise it directly.
 */

/** Shown wherever a person has no public name. */
export const MEMBER_FALLBACK_NAME = 'JubJub member';

/** A person as the SDK is allowed to show them to someone else. */
export interface PublicProfile {
  /** Always set: the public display name, else the handle, else "JubJub member". */
  display_name: string;
  avatar_url?: string;
  handle?: string;
  /** Opaque, non-identifying reference ("mbr_..."). Never a profile id. */
  member_ref?: string;
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const EMAIL_RE_G = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * Keys whose VALUES identify a person internally. Matched on the whole key
 * or its last `_` segment(s): `profile_id`, `creator_profile_id`,
 * `owner_email`, `emails`, `holder_ids`, `uid` ... Never `content_id`,
 * `thumbnail_id` or `member_ref`.
 */
const INTERNAL_KEY_RE =
  /(^|_)(profile_?ids?|e_?mails?|owner_?ids?|creator_?ids?|holder_?ids?|user_?ids?|uid|firebase_?uid)$/i;

export function isInternalIdentityKey(key: string): boolean {
  return INTERNAL_KEY_RE.test(key);
}

export function looksLikeEmail(value: unknown): boolean {
  return typeof value === 'string' && EMAIL_RE.test(value);
}

/** Replace every email address in free text (error bodies, log lines). */
export function redactEmails(text: string): string {
  return String(text).replace(EMAIL_RE_G, '[email hidden]');
}

/**
 * Deep copy with every internal-identity key removed and any email address
 * inside a string value replaced. Arrays and plain objects are walked;
 * everything else is returned as is. Never throws on odd input.
 */
export function stripInternalIdentity<T>(value: T, depth = 0): T {
  if (depth > 8) return value;
  if (typeof value === 'string') {
    return (looksLikeEmail(value) ? redactEmails(value) : value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => stripInternalIdentity(v, depth + 1)) as unknown as T;
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isInternalIdentityKey(k)) continue;
      out[k] = stripInternalIdentity(v, depth + 1);
    }
    return out as T;
  }
  return value;
}

function cleanText(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t || looksLikeEmail(t)) return undefined;
  return t;
}

/**
 * A person's public face from whatever shape the backend sent. Accepts a
 * nested object (`raw[prefix]` = { display_name, avatar_url, handle,
 * member_ref }) or flat fields (`<prefix>_display_name`, `<prefix>_name`,
 * `<prefix>_avatar_url`, `<prefix>_handle`, `<prefix>_member_ref`). A name
 * that is an email, or equal to an internal id the response carried, is
 * refused. Returns null only when the response says nothing about the person.
 */
export function publicProfileFrom(raw: unknown, prefix = 'creator'): PublicProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const nested =
    r[prefix] && typeof r[prefix] === 'object' ? (r[prefix] as Record<string, unknown>) : {};

  const pick = (...vals: unknown[]) => {
    for (const v of vals) {
      const c = cleanText(v);
      if (c) return c;
    }
    return undefined;
  };

  // Internal ids the response happens to carry: a "name" equal to one of these
  // is an id wearing a name's clothes, and is not shown.
  const internalIds = new Set<string>();
  for (const src of [r, nested]) {
    for (const [k, v] of Object.entries(src)) {
      if (isInternalIdentityKey(k) && typeof v === 'string' && v.trim()) internalIds.add(v.trim());
    }
  }

  const handleRaw = pick(nested.handle, nested.username, r[`${prefix}_handle`], r[`${prefix}_username`]);
  const handle = handleRaw && !internalIds.has(handleRaw) ? handleRaw : undefined;
  let name = pick(
    nested.display_name,
    nested.name,
    r[`${prefix}_display_name`],
    r[`${prefix}_name`],
  );
  if (name && internalIds.has(name)) name = undefined;

  const avatar = pick(nested.avatar_url, r[`${prefix}_avatar_url`]);
  const refRaw = pick(nested.member_ref, r[`${prefix}_member_ref`]);
  const memberRef = refRaw && /^mbr_/.test(refRaw) ? refRaw : undefined;

  const hasAny =
    Object.keys(nested).length > 0 ||
    Object.keys(r).some((k) => k === prefix || k.startsWith(`${prefix}_`));
  if (!hasAny) return null;

  const out: PublicProfile = {
    display_name: name || (handle ? (handle.startsWith('@') ? handle : `@${handle}`) : MEMBER_FALLBACK_NAME),
  };
  if (avatar && /^https?:\/\//i.test(avatar)) out.avatar_url = avatar;
  if (handle) out.handle = handle;
  if (memberRef) out.member_ref = memberRef;
  return out;
}
