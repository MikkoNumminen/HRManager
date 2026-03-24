"use client";

import { Box, Typography } from "@mui/material";
import { colors } from "@/muiStyles";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

interface ImpactItem {
  label: string;
  items: string[];
}

interface DeleteImpactListProps {
  impacts: ImpactItem[];
}

export default function DeleteImpactList({ impacts }: DeleteImpactListProps) {
  const nonEmpty = impacts.filter((i) => i.items.length > 0);
  if (nonEmpty.length === 0) return null;

  return (
    <Box
      sx={{
        mt: 2,
        p: 1.5,
        borderRadius: 1,
        backgroundColor: "rgba(255, 152, 0, 0.08)",
        border: `1px solid ${colors.warning}`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
        <WarningAmberIcon sx={{ color: colors.warning, fontSize: 18 }} />
        <Typography variant="body2" sx={{ color: colors.warning, fontWeight: 600 }}>
          Affected references
        </Typography>
      </Box>
      {nonEmpty.map((impact) => (
        <Box key={impact.label} sx={{ mb: 0.5 }}>
          <Typography variant="body2" sx={{ color: colors.slate300, fontWeight: 500 }}>
            {impact.label}
          </Typography>
          <Typography variant="body2" sx={{ color: colors.slate400, pl: 1 }}>
            {impact.items.join(", ")}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
