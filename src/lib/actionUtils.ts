import { RateLimitError } from "@/rateLimit";
import { ActionError, type ErrorCode } from "@/actionErrors";
import { getTranslations } from "next-intl/server";
import logger from "@/lib/logger";
import { captureServerActionError } from "@/lib/sentryCapture";

/**
 * Server actions return ActionResult so error messages survive Next.js production sanitization.
 * The `code` field lets callers react programmatically to specific error types.
 */
export type ActionResult = { error: string; code: ErrorCode } | undefined;

export async function safe(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
  } catch (error) {
    // Re-throw Next.js internal errors (redirect, notFound) so they work normally
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error instanceof ActionError) return { error: error.message, code: error.code };
    if (error instanceof RateLimitError) return { error: error.message, code: "rateLimited" };
    // Unexpected error: report to Sentry and log it, then return a GENERIC message.
    // Returning error.message previously leaked Prisma/DB internals (table, column
    // and constraint names) straight to the client; the real error stays server-side.
    captureServerActionError(error, { source: "safe" });
    logger.error({ err: error, code: "unexpectedError" }, "Server action failed");
    const tErr = await getTranslations("errors");
    return { error: tErr("unexpectedError"), code: "unexpectedError" };
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUUID(value: string, fieldName: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new ActionError("invalidId", `Invalid ${fieldName} format`);
  }
}
