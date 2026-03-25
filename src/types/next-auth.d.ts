import "next-auth";
import type { PermissionKey } from "@/types/permissions";

declare module "next-auth" {
  interface User {
    demoSessionId?: string;
  }

  interface Session {
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: string;
      permissions?: Partial<Record<PermissionKey, boolean>>;
      demoSessionId?: string;
      sessionId?: string;
      twoFactorRequired?: boolean;
      twoFactorVerified?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    permissions?: Partial<Record<PermissionKey, boolean>>;
    userId?: string;
    demoSessionId?: string;
    sessionId?: string;
    sessionLastUpdate?: number;
    twoFactorRequired?: boolean;
    twoFactorVerified?: boolean;
  }
}
