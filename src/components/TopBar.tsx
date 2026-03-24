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
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MenuIcon from "@mui/icons-material/Menu";
import { avatarStyles, colors, userMenuItemStyles, userMenuStyles } from "@/muiStyles";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRef, useState, useTransition } from "react";
import { resetAll, seedMockData } from "@/serverActions";
import ConfirmDialog from "./ConfirmDialog";
import { useSnackbar } from "./SnackbarProvider";
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
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const { data: session } = useSession();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  const canDataIO = permissions?.["data:import"] || permissions?.["data:export"];
  const canLeave = permissions?.["leave:view"];
  const canPositions = permissions?.["position:manage"];
  const demoEnabled = process.env.NEXT_PUBLIC_DEMO_LOGIN !== "false";

  const handleSeed = (clearExisting: boolean) => {
    setSeedDialogOpen(false);
    setError(null);
    startTransition(async () => {
      const result = await seedMockData(clearExisting);
      if (result?.error) {
        setError(result.error);
        return;
      }
      showSnackbar(tn("mockDataLoaded"));
    });
  };

  const handleSignOut = () => {
    setAnchorEl(null);
    setDrawerOpen(false);
    try {
      if (session?.user?.email === DEMO_EMAIL) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable (private browsing)
    }
    signOut();
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
            ml: { xs: "-44px", sm: "-48px" },
            width: { xs: "calc(100% + 44px)", sm: "calc(100% + 48px)" },
          }),
        }}
        elevation={0}
      >
        <Toolbar
          sx={{
            position: "relative",
            ...(backHref && { pl: { xs: "56px", sm: "64px" } }),
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
                left: { xs: 4, sm: 8 },
                color: colors.slate100,
                "&:hover": { backgroundColor: colors.hoverOverlay },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{
                fontSize: { xs: "1.1rem", sm: "1.5rem" },
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </Typography>
          </Box>
          {error && (
            <Typography variant="caption" role="alert" sx={{ color: colors.error, mr: 2 }}>
              {error}
            </Typography>
          )}

          {/* Desktop controls: theme, language, avatar/menu (hidden on mobile) */}
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}>
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
                  <MenuItem
                    component={Link}
                    href="/profile"
                    onClick={() => setAnchorEl(null)}
                    sx={userMenuItemStyles}
                  >
                    {t("profile")}
                  </MenuItem>
                  {(session?.user?.permissions?.["review:view"] ||
                    session?.user?.permissions?.["review:manage"] ||
                    session?.user?.permissions?.["review:submit"]) && (
                    <MenuItem
                      component={Link}
                      href="/reviews"
                      onClick={() => setAnchorEl(null)}
                      sx={userMenuItemStyles}
                    >
                      {t("performanceReviews")}
                    </MenuItem>
                  )}
                  {session?.user?.permissions?.["person:read"] && (
                    <MenuItem
                      component={Link}
                      href="/orgchart"
                      onClick={() => setAnchorEl(null)}
                      sx={userMenuItemStyles}
                    >
                      {t("orgChart")}
                    </MenuItem>
                  )}
                  {session?.user?.permissions?.["dashboard:view"] && (
                    <MenuItem
                      component={Link}
                      href="/dashboard"
                      onClick={() => setAnchorEl(null)}
                      sx={userMenuItemStyles}
                    >
                      {t("dashboard")}
                    </MenuItem>
                  )}
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
                  {canDataIO && (
                    <MenuItem
                      component={Link}
                      href="/admin/data"
                      onClick={() => setAnchorEl(null)}
                      sx={userMenuItemStyles}
                    >
                      {t("dataImportExport")}
                    </MenuItem>
                  )}
                  {canLeave && (
                    <MenuItem
                      component={Link}
                      href="/leave"
                      onClick={() => setAnchorEl(null)}
                      sx={userMenuItemStyles}
                    >
                      {t("leaveManagement")}
                    </MenuItem>
                  )}
                  {canPositions && (
                    <MenuItem
                      component={Link}
                      href="/positions"
                      onClick={() => setAnchorEl(null)}
                      sx={userMenuItemStyles}
                    >
                      {t("positionCatalog")}
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
                  <MenuItem onClick={handleSignOut} sx={userMenuItemStyles}>
                    {t("signOut")}
                  </MenuItem>
                </Menu>
              </>
            ) : (
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
            )}
          </Box>

          {/* Mobile: hamburger button (hidden on desktop) */}
          <IconButton
            onClick={() => setDrawerOpen(true)}
            aria-label={t("menu")}
            sx={{
              display: { xs: "flex", md: "none" },
              color: colors.slate100,
            }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile navigation drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
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
            {user && (
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/profile"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    color: colors.slate100,
                    "&:hover": { backgroundColor: colors.hoverOverlay },
                  }}
                >
                  <ListItemText primary={t("profile")} />
                </ListItemButton>
              </ListItem>
            )}
            {(session?.user?.permissions?.["review:view"] ||
              session?.user?.permissions?.["review:manage"] ||
              session?.user?.permissions?.["review:submit"]) && (
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/reviews"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    color: colors.slate100,
                    "&:hover": { backgroundColor: colors.hoverOverlay },
                  }}
                >
                  <ListItemText primary={t("performanceReviews")} />
                </ListItemButton>
              </ListItem>
            )}
            {session?.user?.permissions?.["person:read"] && (
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/orgchart"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    color: colors.slate100,
                    "&:hover": { backgroundColor: colors.hoverOverlay },
                  }}
                >
                  <ListItemText primary={t("orgChart")} />
                </ListItemButton>
              </ListItem>
            )}
            {session?.user?.permissions?.["dashboard:view"] && (
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/dashboard"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    color: colors.slate100,
                    "&:hover": { backgroundColor: colors.hoverOverlay },
                  }}
                >
                  <ListItemText primary={t("dashboard")} />
                </ListItemButton>
              </ListItem>
            )}
            {session?.user?.permissions?.["admin:manage_users"] && (
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/admin"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    color: colors.slate100,
                    "&:hover": { backgroundColor: colors.hoverOverlay },
                  }}
                  data-tutorial="nav-user-management-mobile"
                >
                  <ListItemText primary={t("userManagement")} />
                </ListItemButton>
              </ListItem>
            )}
            {session?.user?.permissions?.["admin:view_audit_log"] && (
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/admin/audit"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    color: colors.slate100,
                    "&:hover": { backgroundColor: colors.hoverOverlay },
                  }}
                  data-tutorial="nav-audit-log-mobile"
                >
                  <ListItemText primary={t("auditLog")} />
                </ListItemButton>
              </ListItem>
            )}
            {canDataIO && (
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/admin/data"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    color: colors.slate100,
                    "&:hover": { backgroundColor: colors.hoverOverlay },
                  }}
                >
                  <ListItemText primary={t("dataImportExport")} />
                </ListItemButton>
              </ListItem>
            )}
            {canLeave && (
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/leave"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    color: colors.slate100,
                    "&:hover": { backgroundColor: colors.hoverOverlay },
                  }}
                >
                  <ListItemText primary={t("leaveManagement")} />
                </ListItemButton>
              </ListItem>
            )}
            {canPositions && (
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/positions"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    color: colors.slate100,
                    "&:hover": { backgroundColor: colors.hoverOverlay },
                  }}
                >
                  <ListItemText primary={t("positionCatalog")} />
                </ListItemButton>
              </ListItem>
            )}
            {canSeed && (
              <ListItem disablePadding>
                <ListItemButton
                  disabled={isPending}
                  onClick={() => {
                    setDrawerOpen(false);
                    setSeedDialogOpen(true);
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
                    setDrawerOpen(false);
                    setResetDialogOpen(true);
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
              <List sx={{ py: 0 }}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={handleSignOut}
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
                      setDrawerOpen(false);
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
                    setDrawerOpen(false);
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

      {/* Hidden form for resetAll server action */}
      <Box
        component="form"
        action={async () => {
          const result = await resetAll();
          if (result?.error) {
            setError(result.error);
            return;
          }
          setError(null);
          showSnackbar(tn("dataReset"));
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
        fullWidth
        maxWidth="xs"
        aria-labelledby="seed-dialog-title"
        aria-describedby="seed-dialog-description"
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
        <DialogTitle id="seed-dialog-title" sx={{ color: colors.slate100 }}>
          {t("seedTitle")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="seed-dialog-description" sx={{ color: colors.slate400 }}>
            {t("seedMessage")}
          </DialogContentText>
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
