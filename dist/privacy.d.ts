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
export declare const MEMBER_FALLBACK_NAME = "JubJub member";
/** A person as the SDK is allowed to show them to someone else. */
export interface PublicProfile {
    /** Always set: the public display name, else the handle, else "JubJub member". */
    display_name: string;
    avatar_url?: string;
    handle?: string;
    /** Opaque, non-identifying reference ("mbr_..."). Never a profile id. */
    member_ref?: string;
}
export declare function isInternalIdentityKey(key: string): boolean;
export declare function looksLikeEmail(value: unknown): boolean;
/** Replace every email address in free text (error bodies, log lines). */
export declare function redactEmails(text: string): string;
/**
 * Deep copy with every internal-identity key removed and any email address
 * inside a string value replaced. Arrays and plain objects are walked;
 * everything else is returned as is. Never throws on odd input.
 */
export declare function stripInternalIdentity<T>(value: T, depth?: number): T;
/**
 * A person's public face from whatever shape the backend sent. Accepts a
 * nested object (`raw[prefix]` = { display_name, avatar_url, handle,
 * member_ref }) or flat fields (`<prefix>_display_name`, `<prefix>_name`,
 * `<prefix>_avatar_url`, `<prefix>_handle`, `<prefix>_member_ref`). A name
 * that is an email, or equal to an internal id the response carried, is
 * refused. Returns null only when the response says nothing about the person.
 */
export declare function publicProfileFrom(raw: unknown, prefix?: string): PublicProfile | null;
