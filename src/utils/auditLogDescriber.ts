/**
 * Pure function that describes audit log changes in human-readable form.
 * Extracted from AuditLogViewer to reduce component complexity.
 */

type TranslateFn = (key: string, params?: Record<string, string>) => string;

interface DescribeChangesParams {
  action: string;
  entityType: string;
  before: string | null;
  after: string | null;
  t: TranslateFn;
  tc: TranslateFn;
  permissionLabels: Record<string, string>;
  userNames: Record<string, string>;
}

export function describeChanges({
  action,
  entityType,
  before,
  after,
  t,
  tc,
  permissionLabels,
  userNames,
}: DescribeChangesParams): string {
  try {
    const b = before ? JSON.parse(before) : null;
    const a = after ? JSON.parse(after) : null;
    const unknown = tc("unknown");

    const resolveTarget = (): string => {
      const email = a?.targetEmail ?? b?.targetEmail;
      if (!email) return unknown;
      return userNames[email] ?? email;
    };

    if (action === "create") {
      if (entityType === "person") return t("addedPerson", { name: a?.name ?? unknown });
      if (entityType === "team") return t("createdTeam", { name: a?.teamName ?? unknown });
      if (entityType === "teamMember") return t("addedMember");
      if (entityType === "department") return t("createdDepartment", { name: a?.name ?? unknown });
      return t("newRecord");
    }

    if (action === "delete") {
      if (entityType === "person")
        return t("removedPerson", { name: b?.name ?? unknown, email: b?.email ?? "" });
      if (entityType === "team") return t("deletedTeam", { name: b?.teamName ?? unknown });
      if (entityType === "teamMember") return t("removedMember");
      if (entityType === "department") return t("deletedDepartment", { name: b?.name ?? unknown });
      if (entityType === "userPermission") {
        const key = b?.permissionKey ?? "";
        const label = permissionLabels[key] ?? key;
        const target = resolveTarget();
        return t("resetPermission", { target, label });
      }
      return t("recordDeleted");
    }

    if (action === "kickout") {
      if (entityType === "user") {
        return t("kickedOutUser", {
          name: b?.name ?? unknown,
          email: b?.email ?? "",
          role: b?.role ?? "",
        });
      }
      return t("recordDeleted");
    }

    if (action === "update") {
      if (entityType === "person") {
        if (a?.name !== undefined && b?.name !== a.name)
          return t("changedName", { oldValue: b?.name ?? "", newValue: a?.name ?? "" });
        if (a?.position !== undefined && b?.position !== a.position)
          return t("changedPosition", {
            oldValue: b?.position ?? "",
            newValue: a?.position ?? "",
          });
        if (a?.email !== undefined && b?.email !== a.email)
          return t("changedEmail", { oldValue: b?.email ?? "", newValue: a?.email ?? "" });
        return t("updatedPerson");
      }
      if (entityType === "team") {
        if (a?.teamName !== undefined && b?.teamName !== a.teamName)
          return t("renamedTeam", { oldValue: b?.teamName ?? "", newValue: a?.teamName ?? "" });
        if (a?.departmentId !== undefined) {
          if (a.departmentId === null) return t("removedTeamFromDept");
          return t("assignedTeamToDept");
        }
        if (a?.teamManagerId !== undefined) {
          if (a.teamManagerId === null) return t("removedManager");
          return t("changedManager");
        }
        return t("updatedTeam");
      }
      if (entityType === "department") {
        if (a?.headId !== undefined) {
          if (a.headId === null) return t("removedHead");
          return t("changedHead");
        }
        if (a?.name !== undefined && b?.name !== a.name)
          return t("renamedDepartment", { oldValue: b?.name ?? "", newValue: a?.name ?? "" });
        return t("updatedDepartment");
      }
      if (entityType === "user") {
        const target = resolveTarget();
        return t("changedRole", { target, oldValue: b?.role ?? "", newValue: a?.role ?? "" });
      }
      if (entityType === "userPermission") {
        const granted = a?.granted;
        const key = a?.permissionKey ?? "";
        const label = permissionLabels[key] ?? key;
        const target = resolveTarget();
        return granted
          ? t("grantedPermission", { target, label })
          : t("revokedPermission", { target, label });
      }
      return t("recordUpdated");
    }

    if (action === "seed") {
      return b?.clearExisting || a?.clearExisting ? t("seedReplaced") : t("seedKept");
    }

    if (action === "reset") {
      const persons = b?.personCount ?? b?.persons ?? 0;
      const teams = b?.teamCount ?? b?.teams ?? 0;
      const departments = b?.departmentCount ?? b?.departments ?? 0;
      return t("clearedData", {
        persons: String(persons),
        teams: String(teams),
        departments: String(departments),
      });
    }

    if (action === "permission_denied") {
      return t("permissionDenied", { key: a?.permissionKey ?? unknown });
    }

    if (action === "rate_limited") {
      return t("rateLimited", { action: a?.rateLimitedAction ?? unknown });
    }

    return tc("dash");
  } catch {
    return before ?? after ?? tc("dash");
  }
}
