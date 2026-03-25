import { prisma } from "@/db";
import { ActionError } from "@/actionErrors";
import { PositionSchema, Position } from "./schemas";
import { getDemoSessionId } from "@/demoSession";
import { hasPermission } from "@/permissions";

export async function getPositions(): Promise<Position[]> {
  const allowed = await hasPermission("person:read");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  const positions = await prisma.position.findMany({
    where: { deletedAt: null, sessionId },
    omit: { sessionId: true, deletedAt: true },
    orderBy: { name: "asc" },
  });

  return positions.map((p) => PositionSchema.parse(p));
}
