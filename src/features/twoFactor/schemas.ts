import { z } from "zod";

export const TwoFactorSetupSchema = z.object({
  uri: z.string(),
  secret: z.string(),
  recoveryCodes: z.array(z.string()),
});

export type TwoFactorSetup = z.infer<typeof TwoFactorSetupSchema>;

export const TwoFactorVerifySchema = z.object({
  code: z.string().min(6).max(9), // 6-digit TOTP or XXXX-XXXX recovery code
});

export type TwoFactorVerify = z.infer<typeof TwoFactorVerifySchema>;
