"use client";

import { AppBar, Box, IconButton, Toolbar, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { colors } from "@/muiStyles";
import { useSession, signOut } from "next-auth/react";
import { useRef, useState, useTransition } from "react";
import { resetAll, seedMockData } from "@/serverActions";
import { useSnackbar } from "../SnackbarProvider";
import LanguageSwitcher from "../LanguageSwitcher";
import ThemeSwitcher from "../ThemeSwitcher";
import { Permissions } from "@/schemas";
import { useTranslations } from "next-intl";
import { DEMO_EMAIL, STORAGE_KEY } from "@/tutorialConfig";
import HeaderTitle from "./HeaderTitle";
import UserMenu from "./UserMenu";
import MobileDrawer from "./MobileDrawer";
import AdminDialogs from "./AdminDialogs";

interface TopBarProps {
  title: string;
  backHref?: string;
  permissions?: Permissions;
}

export default function TopBar({ title, backHref, permissions }: TopBarProps) {
  const t = useTranslations("topBar");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const { data: session } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

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

  const resetFormAction = async () => {
    const result = await resetAll();
    if (result?.error) {
      setError(result.error);
      return;
    }
    setError(null);
    showSnackbar(tn("dataReset"));
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
          <HeaderTitle title={title} backHref={backHref} />
          {error && (
            <Typography variant="caption" role="alert" sx={{ color: colors.error, mr: 2 }}>
              {error}
            </Typography>
          )}

          {/* Desktop controls: theme, language, avatar/menu (hidden on mobile) */}
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}>
            <ThemeSwitcher />
            <LanguageSwitcher />
            <UserMenu
              session={session}
              permissions={permissions}
              isPending={isPending}
              onSeedOpen={() => setSeedDialogOpen(true)}
              onResetOpen={() => setResetDialogOpen(true)}
              onSignOut={handleSignOut}
            />
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

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        session={session}
        permissions={permissions}
        isPending={isPending}
        onSeedOpen={() => setSeedDialogOpen(true)}
        onResetOpen={() => setResetDialogOpen(true)}
        onSignOut={handleSignOut}
      />

      <AdminDialogs
        seedDialogOpen={seedDialogOpen}
        resetDialogOpen={resetDialogOpen}
        onSeedClose={() => setSeedDialogOpen(false)}
        onResetClose={() => setResetDialogOpen(false)}
        onSeed={handleSeed}
        onResetConfirm={() => {
          setResetDialogOpen(false);
          formRef.current?.requestSubmit();
        }}
        formRef={formRef}
        resetFormAction={resetFormAction}
      />
    </>
  );
}
