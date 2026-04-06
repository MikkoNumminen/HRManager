import { prisma } from "@/db";
import { ActionError } from "@/actionErrors";
import { PositionSchema, Position } from "./schemas";
import { getDemoSessionId } from "@/demoSession";
import { hasPermission } from "@/permissions";
import { cache } from "@/lib/cache";
import { ORG_DATA_TAG } from "@/lib/cacheInvalidation";

// Cache TTL: 5 minutes. Invalidated by updateTag(ORG_DATA_TAG) from mutations.
const CACHE_TTL = 300;

export async function getPositions(): Promise<Position[]> {
  const allowed = await hasPermission("person:read");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  return fetchPositionsCached(sessionId);
}

const fetchPositionsCached = cache(
  async (sessionId: string | null): Promise<Position[]> => {
    const positions = await prisma.position.findMany({
      where: { deletedAt: null, sessionId },
      omit: { sessionId: true, deletedAt: true },
      orderBy: { name: "asc" },
    });
    return positions.map((p) => PositionSchema.parse(p));
  },
  ["positions-list"],
  { revalidate: CACHE_TTL, tags: [ORG_DATA_TAG] },
);
