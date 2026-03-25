"use client";

import { Box, Button, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { colors } from "@/muiStyles";
import { useTranslations } from "next-intl";

interface RecoveryCodesListProps {
  codes: string[];
  onCopy: (codes: string[]) => void;
}

/** Renders recovery codes in a grid with a copy button. */
export default function RecoveryCodesList({ codes, onCopy }: RecoveryCodesListProps) {
  const t = useTranslations("twoFactor");
  return (
    <Box sx={{ textAlign: "center", mb: 2 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 1,
          backgroundColor: colors.slate600,
          borderRadius: 1,
          p: 2,
          mb: 2,
        }}
      >
        {codes.map((code) => (
          <Typography
            key={code}
            variant="body2"
            sx={{ fontFamily: "monospace", color: colors.slate100, letterSpacing: "0.05em" }}
          >
            {code}
          </Typography>
        ))}
      </Box>
      <Button
        onClick={() => onCopy(codes)}
        startIcon={<ContentCopyIcon />}
        sx={{ color: colors.slate300 }}
      >
        {t("copyCodes")}
      </Button>
    </Box>
  );
}
