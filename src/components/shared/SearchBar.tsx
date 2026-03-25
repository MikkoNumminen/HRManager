"use client";

import { TextField, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { textFieldStyles } from "@/muiStyles";
import { useTranslations } from "next-intl";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const t = useTranslations("common");

  return (
    <TextField
      size="small"
      placeholder={t("searchPlaceholder")}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={t("searchPlaceholder")}
      inputProps={{
        "data-keyboard-shortcut": "search",
      }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: "var(--hrm-slate400)", fontSize: "1.2rem" }} />
            </InputAdornment>
          ),
        },
      }}
      sx={{
        ...textFieldStyles,
        mb: 1.5,
        maxWidth: { xs: "100%", sm: 320 },
      }}
      fullWidth
    />
  );
}
