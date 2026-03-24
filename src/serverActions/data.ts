"use server";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/permissions";
import { captureAuditContext, deferAudit, deferAuditLog, DeferredAuditEntry } from "@/auditLog";
import { rateLimit } from "@/rateLimit";
import { getDemoSessionId } from "@/demoSession";
import { MAX_IMPORT_ROWS, MAX_IMPORT_FILE_SIZE } from "@/schemas";
import { parseCSV, generateCSV, validatePersonImportRows } from "@/csvUtils";
import { getTranslations } from "next-intl/server";
import type { ErrorCode } from "@/actionErrors";

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; field: string; message: string }[];
}

export async function importPersonsCsv(
  _prevState: { error?: string; code?: ErrorCode; result?: ImportResult } | null,
  data: FormData,
): Promise<{ error?: string; code?: ErrorCode; result?: ImportResult }> {
  await requirePermission("data:import");
  await rateLimit("importPersonsCsv");
  const t = await getTranslations("errors");

  const file = data.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: t("csvNoFile"), code: "csvNoFile" };
  }
  if (!file.name.endsWith(".csv")) {
    return { error: t("csvNotCsvFile"), code: "csvNotCsvFile" };
  }
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    return { error: t("csvFileTooLarge"), code: "csvFileTooLarge" };
  }

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length <= 1) {
    return { error: t("csvEmpty"), code: "csvEmpty" };
  }
  if (rows.length - 1 > MAX_IMPORT_ROWS) {
    return { error: t("csvTooManyRows", { max: MAX_IMPORT_ROWS }), code: "csvTooManyRows" };
  }

  const sessionId = await getDemoSessionId();

  const existingPersons = await prisma.person.findMany({
    where: { deletedAt: null, sessionId },
    select: { email: true },
  });
  const existingEmails = new Set(
    existingPersons.map((p) => p.email?.toLowerCase()).filter(Boolean) as string[],
  );

  const { valid, errors, skipped } = validatePersonImportRows(rows, existingEmails);

  if (valid.length === 0 && errors.length > 0) {
    return { result: { imported: 0, skipped, errors } };
  }

  let imported = 0;
  if (valid.length > 0) {
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      for (const row of valid) {
        const person = await tx.person.create({
          data: {
            name: row.name,
            email: row.email,
            position: row.position ?? null,
            sessionId,
          },
        });
        auditEntries.push({
          ...ctx,
          action: "import",
          entityType: "person",
          entityId: person.id,
          after: { name: person.name, email: person.email, position: person.position },
        });
        imported++;
      }
    });
    deferAudit(auditEntries);
  }

  revalidatePath("/managePersons");
  revalidatePath("/");
  revalidatePath("/admin/data");
  return { result: { imported, skipped, errors } };
}

export async function exportPersonsCsv(): Promise<string> {
  await requirePermission("data:export");
  await rateLimit("exportPersonsCsv");

  const sessionId = await getDemoSessionId();
  const persons = await prisma.person.findMany({
    where: { deletedAt: null, sessionId },
    orderBy: { name: "asc" },
  });

  await deferAuditLog({
    action: "export",
    entityType: "person",
    after: { rowCount: persons.length },
  });

  return generateCSV(
    ["name", "email", "position", "createdAt"],
    persons.map((p) => [p.name, p.email ?? "", p.position ?? "", p.createdAt.toISOString()]),
  );
}

export async function exportTeamsCsv(): Promise<string> {
  await requirePermission("data:export");
  await rateLimit("exportTeamsCsv");

  const sessionId = await getDemoSessionId();
  const teams = await prisma.team.findMany({
    where: { deletedAt: null, sessionId },
    include: {
      manager: true,
      department: true,
      members: {
        where: { deletedAt: null },
        include: { person: true },
      },
    },
    orderBy: { teamName: "asc" },
  });

  await deferAuditLog({
    action: "export",
    entityType: "team",
    after: { rowCount: teams.length },
  });

  return generateCSV(
    ["name", "manager", "department", "memberCount", "members", "createdAt"],
    teams.map((t) => [
      t.teamName,
      t.manager?.name ?? "",
      t.department?.name ?? "",
      t.members.length.toString(),
      t.members.map((m) => m.person.name).join("; "),
      t.createdAt.toISOString(),
    ]),
  );
}

export async function exportDepartmentsCsv(): Promise<string> {
  await requirePermission("data:export");
  await rateLimit("exportDepartmentsCsv");

  const sessionId = await getDemoSessionId();
  const departments = await prisma.department.findMany({
    where: { deletedAt: null, sessionId },
    include: {
      head: true,
      teams: { where: { deletedAt: null } },
    },
    orderBy: { name: "asc" },
  });

  await deferAuditLog({
    action: "export",
    entityType: "department",
    after: { rowCount: departments.length },
  });

  return generateCSV(
    ["name", "description", "head", "teamCount", "teams", "createdAt"],
    departments.map((d) => [
      d.name,
      d.description ?? "",
      d.head?.name ?? "",
      d.teams.length.toString(),
      d.teams.map((t) => t.teamName).join("; "),
      d.createdAt.toISOString(),
    ]),
  );
}

export async function exportAuditLogsCsv(): Promise<string> {
  await requirePermission("admin:view_audit_log");
  await requirePermission("data:export");
  await rateLimit("exportAuditLogsCsv");

  const sessionId = await getDemoSessionId();
  const MAX_EXPORT_ROWS = 10000;
  const { getAuditLogCollection, isMongoAvailable } = await import("@/mongoDb");
  const logs = isMongoAvailable()
    ? await getAuditLogCollection()
        .find({ sessionId })
        .sort({ createdAt: -1 })
        .limit(MAX_EXPORT_ROWS)
        .toArray()
    : [];

  return generateCSV(
    ["timestamp", "userEmail", "action", "entityType", "entityId", "before", "after"],
    logs.map((l) => [
      l.createdAt.toISOString(),
      l.userEmail ?? "",
      l.action,
      l.entityType,
      l.entityId ?? "",
      l.before ?? "",
      l.after ?? "",
    ]),
  );
}
