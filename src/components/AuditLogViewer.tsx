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

const selectStyles = {
  color: colors.slate300,
  "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate300 },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate100 },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate100 },
  "& .MuiSvgIcon-root": { color: colors.slate400 },
  minWidth: 150,
};

const labelStyles = { color: colors.slate400, "&.Mui-focused": { color: colors.slate100 } };

function formatChanges(before: string | null, after: string | null): string {
  if (!before && !after) return "-";

  try {
    const beforeObj = before ? JSON.parse(before) : null;
    const afterObj = after ? JSON.parse(after) : null;

    if (beforeObj && afterObj) {
      const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
      const parts: string[] = [];
      for (const key of allKeys) {
        const oldVal = beforeObj[key];
        const newVal = afterObj[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          parts.push(`${key}: ${oldVal ?? "∅"} → ${newVal ?? "∅"}`);
        }
      }
      return parts.length > 0 ? parts.join(", ") : "-";
    }

    const obj = afterObj ?? beforeObj;
    return Object.entries(obj)
      .map(([key, val]) => `${key}: ${val}`)
      .join(", ");
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
          <InputLabel sx={labelStyles}>Entity</InputLabel>
          <Select
            value={currentFilters.entityType ?? ""}
            onChange={(e) => updateFilter("entityType", e.target.value)}
            label="Entity"
            sx={selectStyles}
          >
            <MenuItem value="">All Entities</MenuItem>
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
                <TableCell sx={{ color: colors.slate400, cursor: "help" }}>Entity</TableCell>
              </Tooltip>
              <Tooltip title="The ID of the affected resource" placement="top" arrow>
                <TableCell sx={{ color: colors.slate400, cursor: "help" }}>Entity ID</TableCell>
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
                <TableCell colSpan={6}>
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
                  <TableCell>
                    {log.entityId ? (
                      <Tooltip title={log.entityId} placement="top" arrow>
                        <Typography
                          variant="body2"
                          sx={{ cursor: "help", fontFamily: "monospace", fontSize: "0.8rem" }}
                        >
                          {log.entityId.slice(0, 8)}…
                        </Typography>
                      </Tooltip>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                    <Tooltip title={formatChanges(log.before, log.after)} placement="top" arrow>
                      <Typography
                        variant="body2"
                        sx={{
                          cursor: "help",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {formatChanges(log.before, log.after)}
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
