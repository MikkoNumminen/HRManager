"use client";

import { Box, Button, Typography } from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { colors, pageContainerStyles } from "@/muiStyles";
import { useTranslations } from "next-intl";

export default function MyReviewsClient() {
  const t = useTranslations("reviews");

  return (
    <Box sx={pageContainerStyles}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <AssignmentIcon sx={{ color: colors.slate400, fontSize: 48 }} />
        <Box>
          <Typography variant="h6" sx={{ color: colors.slate100 }}>
            {t("myReviewsHeading")}
          </Typography>
          <Typography variant="body2" sx={{ color: colors.slate400 }}>
            {t("noMyReviewsHint")}
          </Typography>
        </Box>
      </Box>
      <Button
        component="a"
        href="/reviews"
        sx={{
          color: colors.slate300,
          border: `1px solid ${colors.slate300}`,
          borderRadius: "4px",
          px: 2,
        }}
      >
        {t("heading")}
      </Button>
    </Box>
  );
}
