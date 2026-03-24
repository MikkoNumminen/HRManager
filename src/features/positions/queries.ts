import { prisma } from "@/db";
import { PositionSchema, Position } from "@/schemas";
import { getDemoSessionId } from "@/demoSession";

export async function getPositions(): Promise<Position[]> {
  const sessionId = await getDemoSessionId();
  const positions = await prisma.position.findMany({
    where: { deletedAt: null, sessionId },
    omit: { sessionId: true, deletedAt: true },
    orderBy: { name: "asc" },
  });

  return positions.map((p) => PositionSchema.parse(p));
}
