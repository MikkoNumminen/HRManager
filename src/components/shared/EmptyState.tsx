"use client";

import { Box, Typography } from "@mui/material";
import { SvgIconComponent } from "@mui/icons-material";
import { colors } from "@/muiStyles";

interface EmptyStateProps {
  icon: SvgIconComponent;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={5}
      gap={1}
    >
      <Icon sx={{ fontSize: 48, color: colors.slate400, mb: 0.5 }} />
      <Typography variant="h6" sx={{ color: colors.slate300, fontWeight: 500 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: colors.slate400, textAlign: "center" }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
