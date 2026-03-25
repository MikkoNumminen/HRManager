"use client";

import { Box, IconButton, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { colors } from "@/muiStyles";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface HeaderTitleProps {
  title: string;
  backHref?: string;
}

export default function HeaderTitle({ title, backHref }: HeaderTitleProps) {
  const tc = useTranslations("common");

  return (
    <>
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
    </>
  );
}
