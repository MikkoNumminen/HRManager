"use client";

import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { colors } from "@/muiStyles";
import { AuditLog } from "@/schemas";

const actionColors: Record<string, string> = {
  create: "#4ade80",
  update: "#60a5fa",
  delete: "#f87171",
  seed: "#fbbf24",
  reset: "#fbbf24",
};

const entityTypeLabels: Record<string, string> = {
  person: "Person",
  team: "Team",
  teamMember: "Team Member",
  user: "User",
  userPermission: "Permission",
};

const permissionLabels: Record<string, string> = {
  "person:create": "create new people",
  "person:delete": "delete people",
  "person:update_position": "change people's positions",
  "person:update_email": "change people's emails",
  "person:read": "view people",
  "team:create": "create new teams",
  "team:delete": "delete teams",
  "team:update_manager": "change team managers",
  "team:add_member": "add members to teams",
  "team:remove_member": "remove members from teams",
  "team:read": "view teams",
  "data:reset": "reset all data",
  "data:seed": "load mock data",
  "admin:manage_users": "manage users",
  "admin:assign_permissions": "change user permissions",
  "admin:view_audit_log": "view the audit log",
};

const selectStyles = {
  color: colors.slate300,
  "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate300 },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate100 },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate100 },
  "& .MuiSvgIcon-root": { color: colors.slate400 },
  minWidth: 150,
};

const labelStyles = { color: colors.slate400, "&.Mui-focused": { color: colors.slate100 } };

function describeChanges(
  action: string,
  entityType: string,
  before: string | null,
  after: string | null,
): string {
  try {
    const b = before ? JSON.parse(before) : null;
    const a = after ? JSON.parse(after) : null;

    if (action === "create") {
      if (entityType === "person") return `Added a new person: ${a?.name ?? "unknown"}`;
      if (entityType === "team") return `Created a new team: ${a?.teamName ?? "unknown"}`;
      if (entityType === "teamMember") return "Added a member to a team";
      return "New record created";
    }

    if (action === "delete") {
      if (entityType === "person")
        return `Removed person: ${b?.name ?? "unknown"} (${b?.email ?? ""})`;
      if (entityType === "team") return `Deleted team: ${b?.teamName ?? "unknown"}`;
      if (entityType === "teamMember") return "Removed a member from a team";
      if (entityType === "userPermission") {
        const key = b?.permissionKey ?? "";
        const label = permissionLabels[key] ?? key;
        return `Reset "${label}" back to role default`;
      }
      return "Record deleted";
    }

    if (action === "update") {
      if (entityType === "person") {
        if (a?.position !== undefined && b?.position !== a.position)
          return `Changed position from "${b?.position}" to "${a?.position}"`;
        if (a?.email !== undefined && b?.email !== a.email)
          return `Changed email from "${b?.email}" to "${a?.email}"`;
        return "Updated person details";
      }
      if (entityType === "team") {
        if (a?.teamManagerId !== undefined) {
          if (a.teamManagerId === null) return "Removed the team manager";
          return "Changed the team manager";
        }
        return "Updated team details";
      }
      if (entityType === "user") return `Changed role from "${b?.role}" to "${a?.role}"`;
      if (entityType === "userPermission") {
        const granted = a?.granted;
        const key = a?.permissionKey ?? "";
        const label = permissionLabels[key] ?? key;
        return granted ? `Granted the ability to ${label}` : `Revoked the ability to ${label}`;
      }
      return "Record updated";
    }

    if (action === "seed") {
      return b?.clearExisting || a?.clearExisting
        ? "Loaded mock data (replaced existing)"
        : "Loaded mock data (kept existing)";
    }

    if (action === "reset") {
      const persons = b?.personCount ?? b?.persons ?? 0;
      const teams = b?.teamCount ?? b?.teams ?? 0;
      return `Cleared all data (${persons} persons, ${teams} teams removed)`;
    }

    return "-";
  } catch {
    return before ?? after ?? "-";
  }
}

interface AuditLogViewerProps {
  logs: AuditLog[];
  total: number;
  currentPage: number;
  pageSize: number;
  userEmails: string[];
  currentFilters: {
    userEmail?: string;
    action?: string;
    entityType?: string;
  };
}

export default function AuditLogViewer({
  logs,
  total,
  currentPage,
  pageSize,
  userEmails,
  currentFilters,
}: AuditLogViewerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`/admin/audit?${params.toString()}`);
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage + 1));
    router.push(`/admin/audit?${params.toString()}`);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", e.target.value);
    params.set("page", "1");
    router.push(`/admin/audit?${params.toString()}`);
  };

  return (
    <>
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <FormControl size="small">
          <InputLabel sx={labelStyles}>User</InputLabel>
          <Select
            value={currentFilters.userEmail ?? ""}
            onChange={(e) => updateFilter("userEmail", e.target.value)}
            label="User"
            sx={selectStyles}
          >
            <MenuItem value="">All Users</MenuItem>
            {userEmails.map((email) => (
              <MenuItem key={email} value={email}>
                {email}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel sx={labelStyles}>Action</InputLabel>
          <Select
            value={currentFilters.action ?? ""}
            onChange={(e) => updateFilter("action", e.target.value)}
            label="Action"
            sx={selectStyles}
          >
            <MenuItem value="">All Actions</MenuItem>
            {["create", "update", "delete", "seed", "reset"].map((a) => (
              <MenuItem key={a} value={a}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel sx={labelStyles}>Type</InputLabel>
          <Select
            value={currentFilters.entityType ?? ""}
            onChange={(e) => updateFilter("entityType", e.target.value)}
            label="Type"
            sx={selectStyles}
          >
            <MenuItem value="">All Types</MenuItem>
            {Object.entries(entityTypeLabels).map(([key, label]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="audit log table">
          <TableHead>
            <TableRow>
              <Tooltip title="When the action was performed" placement="top" arrow>
                <TableCell sx={{ color: colors.slate400, cursor: "help" }}>Timestamp</TableCell>
              </Tooltip>
              <Tooltip title="The user who performed the action" placement="top" arrow>
                <TableCell sx={{ color: colors.slate400, cursor: "help" }}>User</TableCell>
              </Tooltip>
              <Tooltip
                title="The type of action taken (create, update, delete, etc.)"
                placement="top"
                arrow
              >
                <TableCell sx={{ color: colors.slate400, cursor: "help" }}>Action</TableCell>
              </Tooltip>
              <Tooltip title="The type of resource that was affected" placement="top" arrow>
                <TableCell sx={{ color: colors.slate400, cursor: "help" }}>Type</TableCell>
              </Tooltip>
              <Tooltip
                title="What changed — shows before and after values for updates"
                placement="top"
                arrow
              >
                <TableCell sx={{ color: colors.slate400, cursor: "help" }}>Changes</TableCell>
              </Tooltip>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Box display="flex" justifyContent="center" alignItems="center" height="100px">
                    <Typography align="center">No audit log entries found</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{log.userEmail ?? "System"}</TableCell>
                  <TableCell>
                    <Chip
                      label={log.action}
                      size="small"
                      sx={{
                        color: actionColors[log.action] ?? colors.slate300,
                        borderColor: actionColors[log.action] ?? colors.slate300,
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{entityTypeLabels[log.entityType] ?? log.entityType}</TableCell>
                  <TableCell sx={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                    <Tooltip
                      title={describeChanges(log.action, log.entityType, log.before, log.after)}
                      placement="top"
                      arrow
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          cursor: "help",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {describeChanges(log.action, log.entityType, log.before, log.after)}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={currentPage - 1}
          onPageChange={handlePageChange}
          rowsPerPage={pageSize}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
          sx={{ color: colors.slate300 }}
        />
      </TableContainer>
    </>
  );
}
