import { z } from "zod";

export const MAX_NAME_LENGTH = 255;
export const MAX_EMAIL_LENGTH = 320;
export const MAX_POSITION_LENGTH = 255;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_URL_LENGTH = 2048;

export const EmailSchema = z.string().email().max(MAX_EMAIL_LENGTH);

/** Default CDN hostnames allowed for profile image URLs. */
const DEFAULT_ALLOWED_IMAGE_DOMAINS = [
  "lh3.googleusercontent.com",
  "avatars.githubusercontent.com",
  "www.gravatar.com",
  "gravatar.com",
  "cdn.discordapp.com",
  "pbs.twimg.com",
  "i.imgur.com",
];

/**
 * Returns the set of allowed image hostnames based on environment config.
 * - If ALLOWED_IMAGE_DOMAINS=* → allow any domain (wildcard).
 * - If ALLOWED_IMAGE_DOMAINS is set → use the comma-separated list.
 * - Otherwise → use DEFAULT_ALLOWED_IMAGE_DOMAINS.
 * Returns null to indicate "any domain allowed".
 */
function getAllowedImageDomains(): string[] | null {
  const env = process.env.ALLOWED_IMAGE_DOMAINS;
  if (env === "*") return null;
  if (env && env.trim().length > 0) {
    return env
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
  }
  return DEFAULT_ALLOWED_IMAGE_DOMAINS;
}

/**
 * Returns true if the hostname is permitted.
 * Exact match OR subdomain of googleusercontent.com are allowed.
 */
function isAllowedImageHostname(hostname: string, allowed: string[]): boolean {
  if (allowed.includes(hostname)) return true;
  // Allow any subdomain of googleusercontent.com
  if (hostname.endsWith(".googleusercontent.com")) return true;
  return false;
}

/** Validates a profile image URL: must be http/https, within MAX_URL_LENGTH, and from an allowed CDN hostname. Empty string is not valid — callers should only apply this to non-empty trimmed values. */
export const ImageUrlSchema = z
  .string()
  .max(MAX_URL_LENGTH, "urlTooLong")
  .superRefine((val, ctx) => {
    let parsed: URL;
    try {
      parsed = new URL(val);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalidUrlFormat" });
      return;
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalidUrlProtocol" });
      return;
    }
    const allowed = getAllowedImageDomains();
    if (allowed !== null && !isAllowedImageHostname(parsed.hostname, allowed)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "imageUrlDomainNotAllowed" });
    }
  });
