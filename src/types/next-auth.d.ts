import "next-auth";

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
      permissions?: Record<string, boolean>;
      demoSessionId?: string;
      sessionId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    permissions?: Record<string, boolean>;
    userId?: string;
    demoSessionId?: string;
    sessionId?: string;
    sessionLastUpdate?: number;
  }
}
