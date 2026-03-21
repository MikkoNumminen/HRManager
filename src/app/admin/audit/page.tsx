import { Box, Typography } from "@mui/material";
import TopBar from "@/components/TopBar";
import AuditLogViewer from "@/components/AuditLogViewer";
import { colors } from "@/muiStyles";
import { getAuditLogs, getAuditLogUserEmails } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { prisma } from "@/db";
import { getTranslations } from "next-intl/server";
import { AuditLog, AuditActionSchema, AuditEntityTypeSchema } from "@/schemas";

/**
 * For audit log entries that target a user (role changes, permission changes),
 * enrich the before/after JSON with the target user's email so the UI can
 * display who was affected — not just who performed the action.
 */
async function enrichLogsWithTargetEmails(logs: AuditLog[]): Promise<AuditLog[]> {
  const needsEnrichment = logs.filter(
    (log) =>
      (log.entityType === "user" || log.entityType === "userPermission") && log.entityId != null,
  );
  if (needsEnrichment.length === 0) return logs;

  const entityIds = [...new Set(needsEnrichment.map((log) => log.entityId!))];
  const users = await prisma.user.findMany({
    where: { id: { in: entityIds } },
    select: { id: true, email: true },
  });
  const emailMap = new Map(users.map((u) => [u.id, u.email]));

  return logs.map((log) => {
    if (
      (log.entityType !== "user" && log.entityType !== "userPermission") ||
      log.entityId == null
    ) {
      return log;
    }
    const targetEmail = emailMap.get(log.entityId);
    if (!targetEmail) return log;

    const inject = (json: string | null): string | null => {
      if (!json) return json;
      try {
        const parsed = JSON.parse(json);
        if (parsed.targetEmail) return json; // already enriched
        return JSON.stringify({ ...parsed, targetEmail });
      } catch {
        return json;
      }
    };

    return { ...log, before: inject(log.before), after: inject(log.after) };
  });
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["admin:view_audit_log"]) redirect("/");

  const params = await searchParams;

  const filters = {
    userEmail: typeof params.userEmail === "string" ? params.userEmail : undefined,
    action:
      typeof params.action === "string"
        ? AuditActionSchema.safeParse(params.action).data
        : undefined,
    entityType:
      typeof params.entityType === "string"
        ? AuditEntityTypeSchema.safeParse(params.entityType).data
        : undefined,
    dateFrom: typeof params.dateFrom === "string" ? new Date(params.dateFrom) : undefined,
    dateTo: typeof params.dateTo === "string" ? new Date(params.dateTo) : undefined,
    page: typeof params.page === "string" ? parseInt(params.page, 10) : 1,
    pageSize: typeof params.pageSize === "string" ? parseInt(params.pageSize, 10) : 25,
  };

  const { logs: rawLogs, total } = await getAuditLogs(filters);
  const [logs, userEmails] = await Promise.all([
    enrichLogsWithTargetEmails(rawLogs),
    getAuditLogUserEmails(),
  ]);

  // Build email → name map for displaying user names instead of raw emails
  // Include both actor emails and target emails from the log JSON
  const allEmails = new Set<string>();
  for (const log of logs) {
    if (log.userEmail) allEmails.add(log.userEmail);
    for (const json of [log.before, log.after]) {
      if (!json) continue;
      try {
        const parsed = JSON.parse(json);
        if (parsed.targetEmail) allEmails.add(parsed.targetEmail);
      } catch {
        /* skip invalid JSON */
      }
    }
  }
  const usersWithNames = await prisma.user.findMany({
    where: { email: { in: [...allEmails] } },
    select: { email: true, name: true },
  });
  const userNames: Record<string, string> = {};
  for (const u of usersWithNames) {
    if (u.name) userNames[u.email] = u.name;
  }

  const t = await getTranslations("admin");

  return (
    <>
      <TopBar title={t("auditTitle")} backHref="/admin" permissions={permissions} />
      <Box
        data-tutorial="audit-log"
        sx={{
          border: `1px solid ${colors.slate300}`,
          borderRadius: "4px",
          padding: { xs: "12px", sm: "20px" },
        }}
      >
        <Typography variant="h6" mb={1}>
          {t("auditHeading")}
        </Typography>
        <AuditLogViewer
          logs={logs}
          total={total}
          currentPage={filters.page}
          pageSize={filters.pageSize}
          userEmails={userEmails}
          userNames={userNames}
          currentFilters={{
            userEmail: filters.userEmail,
            action: filters.action,
            entityType: filters.entityType,
          }}
        />
      </Box>
    </>
  );
}
