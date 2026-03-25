import { z } from "zod";

export const MAX_CONCURRENT_SESSIONS = 5;

export const UserSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  active: z.boolean(),
  lastActiveAt: z.date(),
  createdAt: z.date(),
});

export type UserSession = z.infer<typeof UserSessionSchema>;
