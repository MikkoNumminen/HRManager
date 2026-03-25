import type { KeyboardEvent } from "react";

/**
 * Returns a keydown handler that invokes the given handler
 * when Enter or Space is pressed — the standard activation
 * keys for interactive non-button elements.
 */
export const onActivateKeyDown =
  (handler: () => void) =>
  (e: KeyboardEvent): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler();
    }
  };
