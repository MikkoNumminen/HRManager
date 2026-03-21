"use client";

import {
  AppBar,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { avatarStyles, colors, userMenuItemStyles, userMenuStyles } from "@/muiStyles";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRef, useState, useTransition } from "react";
import { resetAll, seedMockData } from "@/serverActions";
import ConfirmDialog from "./ConfirmDialog";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeSwitcher from "./ThemeSwitcher";
import { Permissions } from "@/schemas";
import { useTranslations } from "next-intl";
import { DEMO_EMAIL, STORAGE_KEY } from "@/tutorialConfig";

interface TopBarProps {
  title: string;
  backHref?: string;
  permissions?: Permissions;
}

export default function TopBar({ title, backHref, permissions }: TopBarProps) {
  const t = useTranslations("topBar");
  const tc = useTranslations("common");
  const { data: session } = useSession();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const menuOpen = Boolean(anchorEl);

  const user = session?.user;
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

  const handleSeed = (clearExisting: boolean) => {
    setSeedDialogOpen(false);
    setError(null);
    startTransition(async () => {
      try {
        await seedMockData(clearExisting);
      } catch (e) {
        setError(e instanceof Error ? e.message : tc("error"));
      }
    });
  };

  return (
    <>
      <AppBar
        position="static"
        sx={{
          mb: 1.5,
          backgroundColor: colors.slate600,
          borderRadius: "4px",
          border: `1px solid ${colors.slate300}`,
          ...(backHref && {
            ml: { xs: "-40px", sm: "-48px" },
            width: { xs: "calc(100% + 40px)", sm: "calc(100% + 48px)" },
          }),
        }}
        elevation={0}
      >
        <Toolbar
          sx={{
            position: "relative",
            ...(backHref && {
              paddingLeft: { xs: "48px !important", sm: "64px !important" },
            }),
          }}
        >
          {backHref && (
            <IconButton
              component={Link}
              href={backHref}
              aria-label={tc("goBack")}
              data-tutorial="back-button"
              sx={{
                position: "absolute",
                left: 4,
                color: colors.slate100,
                "&:hover": { backgroundColor: colors.hoverOverlay },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: "0.95rem", sm: "1.25rem" },
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </Typography>
          </Box>
          {error && (
            <Typography variant="caption" sx={{ color: colors.error, mr: 2 }}>
              {error}
            </Typography>
          )}
          <ThemeSwitcher />
          <LanguageSwitcher />
          {user ? (
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
                {session?.user?.permissions?.["admin:manage_users"] && (
                  <MenuItem
                    component={Link}
                    href="/admin"
                    onClick={() => setAnchorEl(null)}
                    sx={userMenuItemStyles}
                    data-tutorial="nav-user-management"
                  >
                    {t("userManagement")}
                  </MenuItem>
                )}
                {session?.user?.permissions?.["admin:view_audit_log"] && (
                  <MenuItem
                    component={Link}
                    href="/admin/audit"
                    onClick={() => setAnchorEl(null)}
                    sx={userMenuItemStyles}
                    data-tutorial="nav-audit-log"
                  >
                    {t("auditLog")}
                  </MenuItem>
                )}
                {canSeed && (
                  <MenuItem
                    disabled={isPending}
                    onClick={() => {
                      setAnchorEl(null);
                      setSeedDialogOpen(true);
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
                      setResetDialogOpen(true);
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
                    if (session?.user?.email === DEMO_EMAIL) {
                      localStorage.removeItem(STORAGE_KEY);
                    }
                    signOut();
                  }}
                  sx={userMenuItemStyles}
                >
                  {t("signOut")}
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end">
              <Button
                onClick={() => signIn("demo")}
                sx={{
                  color: "#fff",
                  backgroundColor: colors.slate600,
                  borderRadius: "4px",
                  px: 2,
                  "&:hover": { backgroundColor: colors.hoverOverlay },
                }}
              >
                {t("tryDemo")}
              </Button>
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
          )}
        </Toolbar>
      </AppBar>

      {/* Hidden form for resetAll server action */}
      <Box
        component="form"
        action={async () => {
          try {
            await resetAll();
            setError(null);
          } catch (e) {
            setError(e instanceof Error ? e.message : tc("error"));
          }
        }}
        ref={formRef}
        sx={{ display: "none" }}
      />

      <ConfirmDialog
        open={resetDialogOpen}
        title={t("resetTitle")}
        message={t("resetMessage")}
        confirmLabel={t("resetConfirm")}
        onConfirm={() => {
          setResetDialogOpen(false);
          formRef.current?.requestSubmit();
        }}
        onCancel={() => setResetDialogOpen(false)}
      />

      <Dialog
        open={seedDialogOpen}
        onClose={() => setSeedDialogOpen(false)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: colors.slate700,
              border: `1px solid ${colors.slate300}`,
              borderRadius: "8px",
            },
          },
        }}
      >
        <DialogTitle sx={{ color: colors.slate100 }}>{t("seedTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: colors.slate400 }}>{t("seedMessage")}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSeedDialogOpen(false)} sx={{ color: colors.slate300 }}>
            {tc("cancel")}
          </Button>
          <Button
            onClick={() => handleSeed(false)}
            sx={{
              color: colors.slate100,
              "&:hover": { backgroundColor: colors.hoverOverlay },
            }}
          >
            {t("keepExisting")}
          </Button>
          <Button
            onClick={() => handleSeed(true)}
            sx={{
              color: colors.error,
              "&:hover": { backgroundColor: colors.errorBg },
            }}
          >
            {t("replaceAll")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
