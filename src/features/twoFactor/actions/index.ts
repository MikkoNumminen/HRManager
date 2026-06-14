/**
 * Barrel re-export for the twoFactor feature server actions.
 *
 * This module has NO "use server" directive — it only re-exports the actions
 * (and the shared TwoFactorSetupResult type) defined in the group modules,
 * keeping `@/features/twoFactor/actions` resolving to exactly the same public
 * surface as the former single file.
 */
export * from "./_shared";
export * from "./setup";
export * from "./recovery";
export * from "./verify";
export * from "./adminReset";
