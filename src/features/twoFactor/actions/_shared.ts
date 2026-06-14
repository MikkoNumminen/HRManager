// Shared types for the twoFactor feature server actions.

export interface TwoFactorSetupResult {
  uri: string;
  secret: string;
  recoveryCodes: string[];
}
