"use client";

import { useState, useTransition } from "react";
import { IconButton, Menu, MenuItem, Typography, Box } from "@mui/material";
import LanguageIcon from "@mui/icons-material/Language";
import { useLocale, useTranslations } from "next-intl";
import { locales, localeNames, localeFlags, Locale } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";
import { colors, userMenuStyles, userMenuItemStyles } from "@/muiStyles";

export default function LanguageSwitcher() {
  const t = useTranslations("topBar");
  const currentLocale = useLocale();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const open = Boolean(anchorEl);

  const handleSelect = (locale: Locale) => {
    setAnchorEl(null);
    startTransition(async () => {
      await setLocale(locale);
      window.location.reload();
    });
  };

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label={t("language")}
        disabled={isPending}
        sx={{ color: colors.slate300, mr: 0.5 }}
      >
        <LanguageIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        sx={{
          ...userMenuStyles,
          "& .MuiPaper-root": {
            ...userMenuStyles["& .MuiPaper-root"],
            maxHeight: 400,
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {locales.map((locale) => (
          <MenuItem
            key={locale}
            onClick={() => handleSelect(locale)}
            selected={locale === currentLocale}
            sx={{
              ...userMenuItemStyles,
              ...(locale === currentLocale && {
                backgroundColor: colors.hoverOverlay,
              }),
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography sx={{ fontSize: "1.25rem", lineHeight: 1 }}>
                {localeFlags[locale]}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.slate100 }}>
                {localeNames[locale]}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
