export const HEX_COLOR = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

const DEFAULT_COLOR = "#1976d2";

/**
 * Only accept hex colors. Anything else falls back to the default, so an arbitrary
 * string can't be injected into a CSS sink (e.g. an Emotion `sx` backgroundColor).
 * Applied both when persisting a leave-type colour and when rendering it, so the
 * sink stays safe regardless of how the stored value got there.
 */
export function safeColor(value: unknown): string {
  return typeof value === "string" && HEX_COLOR.test(value) ? value : DEFAULT_COLOR;
}
