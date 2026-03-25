"use client";

import { ListItem, ListItemButton, ListItemText, MenuItem } from "@mui/material";
import { colors, userMenuItemStyles } from "@/muiStyles";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Session } from "next-auth";
import type { Permissions } from "@/schemas";

interface NavItem {
  href: string;
  label: string;
  show: boolean;
  dataTutorial?: string;
  dataTutorialMobile?: string;
}

interface NavMenuProps {
  session: Session | null;
  permissions?: Permissions;
  variant: "desktop" | "mobile";
  onClose: () => void;
}

export default function NavMenu({ session, permissions, variant, onClose }: NavMenuProps) {
  const t = useTranslations("topBar");
  const user = session?.user;

  const canDataIO = permissions?.["data:import"] || permissions?.["data:export"];
  const canLeave = permissions?.["leave:view"];
  const canPositions = permissions?.["position:manage"];

  const navItems: NavItem[] = [
    { href: "/profile", label: t("profile"), show: !!user },
    { href: "/employee", label: t("employeePortal"), show: !!user },
    {
      href: "/reviews",
      label: t("performanceReviews"),
      show: !!(
        session?.user?.permissions?.["review:view"] ||
        session?.user?.permissions?.["review:manage"] ||
        session?.user?.permissions?.["review:submit"]
      ),
    },
    {
      href: "/orgchart",
      label: t("orgChart"),
      show: !!session?.user?.permissions?.["person:read"],
    },
    {
      href: "/dashboard",
      label: t("dashboard"),
      show: !!session?.user?.permissions?.["dashboard:view"],
    },
    {
      href: "/admin",
      label: t("userManagement"),
      show: !!session?.user?.permissions?.["admin:manage_users"],
      dataTutorial: "nav-user-management",
      dataTutorialMobile: "nav-user-management-mobile",
    },
    {
      href: "/admin/audit",
      label: t("auditLog"),
      show: !!session?.user?.permissions?.["admin:view_audit_log"],
      dataTutorial: "nav-audit-log",
      dataTutorialMobile: "nav-audit-log-mobile",
    },
    { href: "/admin/data", label: t("dataImportExport"), show: !!canDataIO },
    { href: "/leave", label: t("leaveManagement"), show: !!canLeave },
    { href: "/positions", label: t("positionCatalog"), show: !!canPositions },
  ];

  if (variant === "desktop") {
    return (
      <>
        {navItems
          .filter((item) => item.show)
          .map((item) => (
            <MenuItem
              key={item.href}
              component={Link}
              href={item.href}
              onClick={onClose}
              sx={userMenuItemStyles}
              data-tutorial={item.dataTutorial}
            >
              {item.label}
            </MenuItem>
          ))}
      </>
    );
  }

  // Mobile variant
  return (
    <>
      {navItems
        .filter((item) => item.show)
        .map((item) => (
          <ListItem key={item.href} disablePadding>
            <ListItemButton
              component={Link}
              href={item.href}
              onClick={onClose}
              sx={{
                color: colors.slate100,
                "&:hover": { backgroundColor: colors.hoverOverlay },
              }}
              data-tutorial={item.dataTutorialMobile ?? item.dataTutorial}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
    </>
  );
}
