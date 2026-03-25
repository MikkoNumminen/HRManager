"use client";

import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { avatarStyles, colors, userMenuItemStyles, userMenuStyles } from "@/muiStyles";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import NavMenu from "./NavMenu";
import type { Session } from "next-auth";
import type { Permissions } from "@/schemas";

interface UserMenuProps {
  session: Session | null;
  permissions?: Permissions;
  isPending: boolean;
  onSeedOpen: () => void;
  onResetOpen: () => void;
  onSignOut: () => void;
}

export default function UserMenu({
  session,
  permissions,
  isPending,
  onSeedOpen,
  onResetOpen,
  onSignOut,
}: UserMenuProps) {
  const t = useTranslations("topBar");
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(anchorEl);
  const user = session?.user;
  const demoEnabled = process.env.NEXT_PUBLIC_DEMO_LOGIN !== "false";

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : undefined;

  const canSeed = permissions?.["data:seed"];
  const canReset = permissions?.["data:reset"];

  if (!user) {
    return (
      <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end">
        {demoEnabled && (
          <Button
            onClick={() => signIn("demo")}
            sx={{
              color: colors.green400,
              borderRadius: "4px",
              px: 2,
              fontWeight: 600,
              "&:hover": {
                backgroundColor: colors.green900,
              },
            }}
          >
            {t("tryDemo")}
          </Button>
        )}
        <Button
          onClick={() => signIn()}
          sx={{
            color: colors.slate300,
            border: `1px solid ${colors.slate300}`,
            borderRadius: "4px",
            px: 2,
            "&:hover": { backgroundColor: colors.hoverOverlay },
          }}
        >
          {t("signIn")}
        </Button>
      </Box>
    );
  }

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label={t("userMenu")}
        data-tutorial="user-menu-button"
      >
        <Avatar src={user.image ?? undefined} alt={user.name ?? "User"} sx={avatarStyles}>
          {!user.image && initials}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={() => setAnchorEl(null)}
        sx={userMenuStyles}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" sx={{ color: colors.slate100, fontWeight: 500 }}>
            {user.name}
          </Typography>
          <Typography variant="caption" sx={{ color: colors.slate400 }}>
            {user.email}
          </Typography>
        </Box>
        <Divider sx={{ borderColor: colors.slate300 }} />
        <NavMenu
          session={session}
          permissions={permissions}
          variant="desktop"
          onClose={() => setAnchorEl(null)}
        />
        {canSeed && (
          <MenuItem
            disabled={isPending}
            onClick={() => {
              setAnchorEl(null);
              onSeedOpen();
            }}
            sx={userMenuItemStyles}
          >
            {t("loadMockData")}
          </MenuItem>
        )}
        {canReset && (
          <MenuItem
            disabled={isPending}
            onClick={() => {
              setAnchorEl(null);
              onResetOpen();
            }}
            sx={{ ...userMenuItemStyles, color: colors.error }}
          >
            {t("resetAllData")}
          </MenuItem>
        )}
        <Divider sx={{ borderColor: colors.slate300 }} />
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onSignOut();
          }}
          sx={userMenuItemStyles}
        >
          {t("signOut")}
        </MenuItem>
      </Menu>
    </>
  );
}
