/**
 * Where a viewer who owns a piece goes to say so.
 *
 * The page files the claim with the backend; the backend holds the piece's
 * payments once the claimant confirms their email, and a person decides.
 * A plain URL, opened in a new tab: a host page is never asked to run
 * anything of ours, and the link works with the SDK's own script blocked.
 */
export declare const CLAIM_PAGE_URL = "https://jubjubapp.com/claim";
export declare function claimUrlFor(contentId: string | undefined | null, from?: string): string | undefined;
