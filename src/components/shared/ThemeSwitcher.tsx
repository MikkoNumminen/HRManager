"use client";

import { useState } from "react";
import { IconButton, Menu, MenuItem, Typography, Box } from "@mui/material";
import PaletteIcon from "@mui/icons-material/Palette";
import { colors, userMenuStyles, userMenuItemStyles } from "@/muiStyles";
import { THEME_NAMES, THEME_LABELS, THEME_ICONS } from "@/themeConfig";
import { useTheme } from "./ThemeRegistry";
import { useTranslations } from "next-intl";

export default function ThemeSwitcher() {
  const t = useTranslations("topBar");
  const { currentTheme, setTheme } = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label={t("theme")}
        sx={{ color: colors.slate300, mr: 0.5 }}
      >
        <PaletteIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        sx={userMenuStyles}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {THEME_NAMES.map((theme) => (
          <MenuItem
            key={theme}
            onClick={() => {
              setTheme(theme);
              setAnchorEl(null);
            }}
            selected={theme === currentTheme}
            sx={{
              ...userMenuItemStyles,
              ...(theme === currentTheme && {
                backgroundColor: colors.hoverOverlay,
              }),
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography sx={{ fontSize: "1.25rem", lineHeight: 1 }}>
                {THEME_ICONS[theme]}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.slate100 }}>
                {THEME_LABELS[theme]}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
