"use client";

import { Box } from "@mui/material";
import RoleSelector from "./RoleSelector";
import PermissionGrid from "./PermissionGrid";
import DangerZone from "./DangerZone";

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
  isDemoSession?: boolean;
  twoFactorEnabled?: boolean;
}

export default function UserPermissionEditor({
  user,
  allPermissionKeys,
  roleDefaults,
  canAssignPermissions,
  isDemoSession,
  twoFactorEnabled,
}: UserPermissionEditorProps) {
  // In demo sessions, superuser restrictions are lifted — users can experiment freely
  const isSuperuser = !isDemoSession && user.role === "superuser";
  const defaults = roleDefaults[user.role] ?? [];

  return (
    <Box data-tutorial="permission-editor">
      <RoleSelector
        userId={user.id}
        userName={user.name}
        userEmail={user.email}
        currentRole={user.role}
        isSuperuser={isSuperuser}
        isDemoSession={isDemoSession}
      />

      <PermissionGrid
        userId={user.id}
        allPermissionKeys={allPermissionKeys}
        roleDefaults={defaults}
        overrides={user.overrides}
        isSuperuser={isSuperuser}
        canAssignPermissions={canAssignPermissions}
      />

      {!isSuperuser && (
        <DangerZone
          userId={user.id}
          userName={user.name}
          userEmail={user.email}
          twoFactorEnabled={twoFactorEnabled}
        />
      )}
    </Box>
  );
}
