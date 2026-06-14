/**
 * Barrel re-export for the persons feature server actions.
 *
 * This module has NO "use server" directive — it only re-exports the actions
 * defined in the "use server" group modules, keeping `@/features/persons/actions`
 * resolving to exactly the same public surface as the former single file.
 */
export * from "./crud";
export * from "./email";
export * from "./manager";
export * from "./delete";
