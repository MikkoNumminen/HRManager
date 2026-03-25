"use client";

import { Box, Typography } from "@mui/material";
import { colors } from "@/muiStyles";
import { NODE_WIDTH, NODE_HEIGHT } from "./orgChartUtils";

export interface OrgNodeContentProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string | null;
  color: string;
}

export default function OrgNodeContent({ icon, label, subtitle, color }: OrgNodeContentProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 1,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        backgroundColor: colors.slate700,
        border: `2px solid ${color}`,
        borderRadius: "8px",
        overflow: "hidden",
        cursor: "grab",
      }}
    >
      <Box sx={{ color, flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ overflow: "hidden", minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: colors.slate100,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            sx={{
              color: colors.slate400,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "block",
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
