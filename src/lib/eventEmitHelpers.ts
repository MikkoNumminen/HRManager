// Convenience helpers for creating and emitting real-time events from server actions.

import { randomUUID } from "crypto";
import type { AuditAction, AuditEntityType } from "@/auditLog";
import type { RealtimeEvent } from "@/features/realtime/schemas";
import { emitRealtimeEvent } from "@/lib/eventBus";

// Human-readable past tense for audit actions
const ACTION_LABELS: Record<string, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
  approve: "approved",
  reject: "rejected",
  import: "imported",
  export: "exported",
  seed: "seeded",
  reset: "reset",
  kickout: "kicked out",
};

// Human-readable entity type names
const ENTITY_LABELS: Record<string, string> = {
  person: "person",
  team: "team",
  teamMember: "team member",
  department: "department",
  user: "user",
  userPermission: "user permission",
  reviewTemplate: "review template",
  reviewCycle: "review cycle",
  reviewRequest: "review request",
  reviewSubmission: "review submission",
  leaveType: "leave type",
  leaveRequest: "leave request",
  leaveBalance: "leave balance",
  position: "position",
  featureFlag: "feature flag",
  job: "job",
};

/** Build a human-readable summary from audit entry fields. */
export function buildSummary(
  action: AuditAction,
  entityType: AuditEntityType,
  actorEmail: string | null,
): string {
  const actor = actorEmail ?? "System";
  const verb = ACTION_LABELS[action] ?? action;
  const entity = ENTITY_LABELS[entityType] ?? entityType;
  return `${actor} ${verb} ${entity}`;
}

/** Create and emit a real-time event from mutation context. */
export function emitMutationEvent(params: {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  actorEmail: string | null;
  sessionId: string | null;
}): void {
  const event: RealtimeEvent = {
    id: randomUUID(),
    type: "mutation",
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    actorEmail: params.actorEmail,
    summary: buildSummary(params.action, params.entityType, params.actorEmail),
    sessionId: params.sessionId,
    timestamp: Date.now(),
  };
  emitRealtimeEvent(event);
}
