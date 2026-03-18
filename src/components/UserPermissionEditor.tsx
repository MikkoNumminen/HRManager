"use client";

import { updateUserRole, updateUserPermission } from "@/serverActions";
import {
  colors,
  formStyles,
  headerStyles,
  smallButtonStyles,
  activeButtonStyles,
} from "@/muiStyles";
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import { useActionState, useState, useTransition } from "react";

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: string;
  overrides: { key: string; granted: boolean }[];
  resolvedPermissions: Record<string, boolean>;
}

interface UserPermissionEditorProps {
  user: UserData;
  allPermissionKeys: string[];
  roleDefaults: Record<string, string[]>;
  canAssignPermissions: boolean;
}

type FormState = { error: string | null };

const roleColors: Record<string, string> = {
  superuser: "#f59e0b",
  administrator: "#3b82f6",
  user: colors.slate300,
  guest: colors.slate400,
};

export default function UserPermissionEditor({
  user,
  allPermissionKeys,
  roleDefaults,
  canAssignPermissions,
}: UserPermissionEditorProps) {
  const [selectedRole, setSelectedRole] = useState(user.role);
  const roleChanged = selectedRole !== user.role;
  const isSuperuser = user.role === "superuser";
  const [isPending, startTransition] = useTransition();
  const [permError, setPermError] = useState<string | null>(null);

  const [roleState, roleAction, roleIsPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await updateUserRole(formData);
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "An error occurred" };
      }
    },
    { error: null },
  );

  const defaults = roleDefaults[selectedRole] ?? [];
  const overrideMap = new Map(user.overrides.map((o) => [o.key, o.granted]));

  const handlePermissionAction = (permissionKey: string, action: "grant" | "deny" | "reset") => {
    setPermError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("userId", user.id);
        formData.set("permissionKey", permissionKey);
        formData.set("action", action);
        await updateUserPermission(formData);
      } catch (e) {
        setPermError(e instanceof Error ? e.message : "An error occurred");
      }
    });
  };

  const formatKey = (key: string) => {
    const [domain, action] = key.split(":");
    return `${domain}:${action}`;
  };

  const groupedKeys = allPermissionKeys.reduce(
    (acc, key) => {
      const [domain] = key.split(":");
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(key);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  return (
    <>
      <Box component="form" action={roleAction} sx={formStyles}>
        <Box sx={headerStyles}>
          <Typography variant="h5">User Role</Typography>
          <Chip
            label={user.role}
            size="small"
            sx={{
              color: roleColors[user.role] ?? colors.slate300,
              borderColor: roleColors[user.role] ?? colors.slate300,
              fontWeight: 600,
              textTransform: "capitalize",
            }}
            variant="outlined"
          />
        </Box>
        {roleState.error && <Typography color="error">{roleState.error}</Typography>}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="body2" sx={{ color: colors.slate400 }}>
            {user.name ?? "Unknown"} ({user.email})
          </Typography>
        </Box>
        <input type="hidden" name="userId" value={user.id} />
        {isSuperuser ? (
          <Typography variant="body2" sx={{ color: colors.slate400 }}>
            The superuser role cannot be changed.
          </Typography>
        ) : (
          <>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel sx={{ color: colors.slate400 }}>Role</InputLabel>
              <Select
                name="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                label="Role"
                sx={{
                  color: colors.slate300,
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate300 },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate100 },
                  "& .MuiSvgIcon-root": { color: colors.slate300 },
                }}
              >
                <MenuItem value="administrator">Administrator</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="guest">Guest</MenuItem>
              </Select>
            </FormControl>
            <Box display="flex" gap={1} justifyContent="flex-end">
              <Button
                type="submit"
                disabled={!roleChanged || roleIsPending}
                sx={{ ...smallButtonStyles, ...(roleChanged && activeButtonStyles) }}
              >
                Save Role
              </Button>
            </Box>
          </>
        )}
      </Box>

      <Box sx={formStyles}>
        <Box sx={headerStyles}>
          <Typography variant="h5">Permissions</Typography>
        </Box>
        {permError && <Typography color="error">{permError}</Typography>}
        {isSuperuser ? (
          <Typography variant="body2" sx={{ color: colors.slate400 }}>
            The superuser has all permissions and cannot be modified.
          </Typography>
        ) : !canAssignPermissions ? (
          <Typography variant="body2" sx={{ color: colors.slate400 }}>
            You do not have permission to modify user permissions.
          </Typography>
        ) : (
          Object.entries(groupedKeys).map(([domain, keys]) => (
            <Box key={domain} sx={{ mb: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{ color: colors.slate100, textTransform: "capitalize", mb: 1 }}
              >
                {domain}
              </Typography>
              <TableContainer component={Paper} sx={{ backgroundColor: "transparent" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: colors.slate400 }}>Permission</TableCell>
                      <Tooltip
                        title="The default access level based on the user's role (e.g. administrators can manage data, regular users can only read)"
                        placement="top"
                        arrow
                      >
                        <TableCell sx={{ color: colors.slate400, cursor: "help" }}>
                          Role Default
                        </TableCell>
                      </Tooltip>
                      <Tooltip
                        title="A per-user override that grants or denies this permission regardless of role defaults"
                        placement="top"
                        arrow
                      >
                        <TableCell sx={{ color: colors.slate400, cursor: "help" }}>
                          Override
                        </TableCell>
                      </Tooltip>
                      <Tooltip
                        title="The actual permission in effect — determined by override if set, otherwise falls back to role default"
                        placement="top"
                        arrow
                      >
                        <TableCell sx={{ color: colors.slate400, cursor: "help" }}>
                          Effective
                        </TableCell>
                      </Tooltip>
                      <Tooltip
                        title="Grant or deny an override, or reset to remove it and revert to role default"
                        placement="top"
                        arrow
                      >
                        <TableCell sx={{ color: colors.slate400, cursor: "help" }} align="right">
                          Actions
                        </TableCell>
                      </Tooltip>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {keys.map((key) => {
                      const isDefault = defaults.includes(key);
                      const override = overrideMap.get(key);
                      const hasOverride = override !== undefined;
                      const effective = hasOverride ? override : isDefault;

                      return (
                        <TableRow key={key}>
                          <TableCell sx={{ color: colors.slate300 }}>{formatKey(key)}</TableCell>
                          <TableCell>
                            <Chip
                              label={isDefault ? "Allowed" : "Denied"}
                              size="small"
                              sx={{
                                color: isDefault ? colors.green400 : "#f87171",
                                borderColor: isDefault ? colors.green400 : "#f87171",
                              }}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {hasOverride ? (
                              <Chip
                                label={override ? "Granted" : "Denied"}
                                size="small"
                                sx={{
                                  color: override ? colors.green400 : "#f87171",
                                  borderColor: override ? colors.green400 : "#f87171",
                                  fontWeight: 600,
                                }}
                                variant="outlined"
                              />
                            ) : (
                              <Typography variant="body2" sx={{ color: colors.slate400 }}>
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={effective ? "Allowed" : "Denied"}
                              size="small"
                              sx={{
                                backgroundColor: effective
                                  ? "rgba(74, 222, 128, 0.15)"
                                  : "rgba(248, 113, 113, 0.15)",
                                color: effective ? colors.green400 : "#f87171",
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Box display="flex" gap={0.5} justifyContent="flex-end">
                              {hasOverride ? (
                                <Button
                                  size="small"
                                  disabled={isPending}
                                  onClick={() => handlePermissionAction(key, "reset")}
                                  sx={{
                                    color: colors.slate400,
                                    fontSize: "0.7rem",
                                    minWidth: "auto",
                                    px: 1,
                                  }}
                                >
                                  Reset
                                </Button>
                              ) : effective ? (
                                <Button
                                  size="small"
                                  disabled={isPending}
                                  onClick={() => handlePermissionAction(key, "deny")}
                                  sx={{
                                    color: "#f87171",
                                    fontSize: "0.7rem",
                                    minWidth: "auto",
                                    px: 1,
                                  }}
                                >
                                  Deny
                                </Button>
                              ) : (
                                <Button
                                  size="small"
                                  disabled={isPending}
                                  onClick={() => handlePermissionAction(key, "grant")}
                                  sx={{
                                    color: colors.green400,
                                    fontSize: "0.7rem",
                                    minWidth: "auto",
                                    px: 1,
                                  }}
                                >
                                  Grant
                                </Button>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))
        )}
      </Box>
    </>
  );
}
