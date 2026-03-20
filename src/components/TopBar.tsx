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
import { Permissions } from "@/schemas";

interface TopBarProps {
  title: string;
  backHref?: string;
  permissions?: Permissions;
}

export default function TopBar({ title, backHref, permissions }: TopBarProps) {
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
        setError(e instanceof Error ? e.message : "An error occurred");
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
          ...(backHref && { ml: "-48px", width: "calc(100% + 48px)" }),
        }}
        elevation={0}
      >
        <Toolbar
          sx={{
            position: "relative",
            ...(backHref && { paddingLeft: "64px !important" }),
          }}
        >
          {backHref && (
            <IconButton
              component={Link}
              href={backHref}
              aria-label="Go back"
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
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">{title}</Typography>
          </Box>
          {error && (
            <Typography variant="caption" sx={{ color: "#f87171", mr: 2 }}>
              {error}
            </Typography>
          )}
          {user ? (
            <>
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="User menu">
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
                  >
                    User Management
                  </MenuItem>
                )}
                {session?.user?.permissions?.["admin:view_audit_log"] && (
                  <MenuItem
                    component={Link}
                    href="/admin/audit"
                    onClick={() => setAnchorEl(null)}
                    sx={userMenuItemStyles}
                  >
                    Audit Log
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
                    Load Mock Data
                  </MenuItem>
                )}
                {canReset && (
                  <MenuItem
                    disabled={isPending}
                    onClick={() => {
                      setAnchorEl(null);
                      setResetDialogOpen(true);
                    }}
                    sx={{ ...userMenuItemStyles, color: "#f87171" }}
                  >
                    Reset All Data
                  </MenuItem>
                )}
                <Divider sx={{ borderColor: colors.slate300 }} />
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null);
                    signOut();
                  }}
                  sx={userMenuItemStyles}
                >
                  Sign out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box display="flex" gap={1}>
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
                Try Demo
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
                Sign in
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
            setError(e instanceof Error ? e.message : "An error occurred");
          }
        }}
        ref={formRef}
        sx={{ display: "none" }}
      />

      <ConfirmDialog
        open={resetDialogOpen}
        title="Reset All Data"
        message="Are you sure you want to delete all persons and teams? This action cannot be undone."
        confirmLabel="Reset All"
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
        <DialogTitle sx={{ color: colors.slate100 }}>Load Mock Data</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: colors.slate400 }}>
            Do you want to keep your existing data or replace it with mock data?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSeedDialogOpen(false)} sx={{ color: colors.slate300 }}>
            Cancel
          </Button>
          <Button
            onClick={() => handleSeed(false)}
            sx={{
              color: colors.slate100,
              "&:hover": { backgroundColor: colors.hoverOverlay },
            }}
          >
            Keep Existing
          </Button>
          <Button
            onClick={() => handleSeed(true)}
            sx={{
              color: "#f87171",
              "&:hover": { backgroundColor: "rgba(248, 113, 113, 0.1)" },
            }}
          >
            Replace All
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
