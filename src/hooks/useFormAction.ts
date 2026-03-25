"use client";

import { useActionState } from "react";
import { useSnackbar } from "@/components/shared/SnackbarProvider";
import type { ActionResult } from "@/lib/actionUtils";

export type FormState = { error: string | null; success?: boolean };

/**
 * Shared hook for form actions using useActionState.
 * Handles the common pattern of calling a server action,
 * checking for errors, showing a snackbar on success,
 * and optionally triggering optimistic updates or callbacks.
 */
export function useFormAction(
  action: (formData: FormData) => Promise<ActionResult>,
  options: {
    successMessage: string;
    onOptimistic?: (...args: unknown[]) => void;
    onSuccess?: () => void;
  },
): [FormState, (formData: FormData) => void, boolean] {
  const { showSnackbar } = useSnackbar();
  return useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      options.onOptimistic?.();
      const result = await action(formData);
      if (result?.error) return { error: result.error, success: false };
      showSnackbar(options.successMessage);
      options.onSuccess?.();
      return { error: null, success: true };
    },
    { error: null, success: false },
  );
}
