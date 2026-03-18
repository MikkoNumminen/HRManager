"use client";

import {
  AppBar,
  Avatar,
  Box,
  Button,
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
import { useState } from "react";

interface TopBarProps {
  title: string;
  backHref?: string;
}

export default function TopBar({ title, backHref }: TopBarProps) {
  const { data: session } = useSession();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
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

  return (
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
        )}
      </Toolbar>
    </AppBar>
  );
}
