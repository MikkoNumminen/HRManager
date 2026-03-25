"use client";

import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { avatarStyles, colors } from "@/muiStyles";
import { signIn } from "next-auth/react";
import { DEMO_EMAIL } from "@/constants";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "../shared/LanguageSwitcher";
import ThemeSwitcher from "../shared/ThemeSwitcher";
import NavMenu from "./NavMenu";
import type { Session } from "next-auth";
import type { Permissions } from "@/schemas";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  session: Session | null;
  permissions?: Permissions;
  isPending: boolean;
  onSeedOpen: () => void;
  onResetOpen: () => void;
  onSignOut: () => void;
}

export default function MobileDrawer({
  open,
  onClose,
  session,
  permissions,
  isPending,
  onSeedOpen,
  onResetOpen,
  onSignOut,
}: MobileDrawerProps) {
  const t = useTranslations("topBar");
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
  const isDemo = user?.email === DEMO_EMAIL;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        display: { xs: "block", md: "none" },
        "& .MuiDrawer-paper": {
          backgroundColor: colors.slate700,
          borderLeft: `1px solid ${colors.slate300}`,
        },
      }}
    >
      <Box
        sx={{
          width: 280,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        role="presentation"
        data-testid="mobile-drawer"
      >
        {user && (
          <>
            <Box sx={{ px: 2, py: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Avatar src={user.image ?? undefined} alt={user.name ?? "User"} sx={avatarStyles}>
                  {!user.image && initials}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ color: colors.slate100, fontWeight: 500 }}>
                    {user.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.slate400 }}>
                    {user.email}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Divider sx={{ borderColor: colors.slate300 }} />
          </>
        )}

        <List sx={{ flex: 1, py: 1 }}>
          <NavMenu session={session} permissions={permissions} variant="mobile" onClose={onClose} />
          {canSeed && (
            <ListItem disablePadding>
              <ListItemButton
                disabled={isPending}
                onClick={() => {
                  onClose();
                  onSeedOpen();
                }}
                sx={{
                  color: colors.slate100,
                  "&:hover": { backgroundColor: colors.hoverOverlay },
                }}
              >
                <ListItemText primary={t("loadMockData")} />
              </ListItemButton>
            </ListItem>
          )}
          {canReset && (
            <ListItem disablePadding>
              <ListItemButton
                disabled={isPending}
                onClick={() => {
                  onClose();
                  onResetOpen();
                }}
                sx={{
                  color: colors.error,
                  "&:hover": { backgroundColor: colors.hoverOverlay },
                }}
              >
                <ListItemText primary={t("resetAllData")} />
              </ListItemButton>
            </ListItem>
          )}
        </List>

        <Divider sx={{ borderColor: colors.slate300 }} />
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
          <ThemeSwitcher />
          <LanguageSwitcher />
        </Box>

        {user && (
          <>
            <Divider sx={{ borderColor: colors.slate300 }} />
            {isDemo && (
              <Box sx={{ px: 2, py: 1.5 }}>
                <Button
                  onClick={onSignOut}
                  fullWidth
                  data-testid="exit-demo-button-mobile"
                  sx={{
                    color: colors.green400,
                    border: `1px solid ${colors.green400}`,
                    borderRadius: "4px",
                    fontWeight: 600,
                    "&:hover": {
                      backgroundColor: colors.green900,
                    },
                  }}
                >
                  {t("exitDemo")}
                </Button>
              </Box>
            )}
            <List sx={{ py: 0 }}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={onSignOut}
                  sx={{
                    color: colors.slate100,
                    "&:hover": { backgroundColor: colors.hoverOverlay },
                  }}
                >
                  <ListItemText primary={t("signOut")} />
                </ListItemButton>
              </ListItem>
            </List>
          </>
        )}

        {!user && (
          <>
            <Divider sx={{ borderColor: colors.slate300 }} />
            <Box sx={{ px: 2, py: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
              {demoEnabled && (
                <Button
                  onClick={() => {
                    onClose();
                    signIn("demo");
                  }}
                  fullWidth
                  sx={{
                    color: colors.green400,
                    borderRadius: "4px",
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
                onClick={() => {
                  onClose();
                  signIn();
                }}
                fullWidth
                sx={{
                  color: colors.slate300,
                  border: `1px solid ${colors.slate300}`,
                  borderRadius: "4px",
                  "&:hover": { backgroundColor: colors.hoverOverlay },
                }}
              >
                {t("signIn")}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}
