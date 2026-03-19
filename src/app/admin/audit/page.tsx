import { Box, Typography } from "@mui/material";
import TopBar from "@/components/TopBar";
import AuditLogViewer from "@/components/AuditLogViewer";
import { colors } from "@/muiStyles";
import { getAuditLogs, getAuditLogUserEmails } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";

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
    action: typeof params.action === "string" ? params.action : undefined,
    entityType: typeof params.entityType === "string" ? params.entityType : undefined,
    dateFrom: typeof params.dateFrom === "string" ? new Date(params.dateFrom) : undefined,
    dateTo: typeof params.dateTo === "string" ? new Date(params.dateTo) : undefined,
    page: typeof params.page === "string" ? parseInt(params.page, 10) : 1,
    pageSize: typeof params.pageSize === "string" ? parseInt(params.pageSize, 10) : 25,
  };

  const { logs, total } = await getAuditLogs(filters);
  const userEmails = await getAuditLogUserEmails();

  return (
    <>
      <TopBar title="Audit Log" backHref="/admin" />
      <Box
        sx={{
          border: `1px solid ${colors.slate300}`,
          borderRadius: "4px",
          padding: "20px",
        }}
      >
        <Typography variant="h5" mb={1}>
          Activity History
        </Typography>
        <AuditLogViewer
          logs={logs}
          total={total}
          currentPage={filters.page}
          pageSize={filters.pageSize}
          userEmails={userEmails}
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
