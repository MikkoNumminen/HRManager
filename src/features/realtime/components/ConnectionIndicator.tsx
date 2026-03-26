"use client";

import { Box, Tooltip } from "@mui/material";
import { useRealtime } from "@/components/shared/RealtimeProvider";
import { useTranslations } from "next-intl";
import { colors } from "@/muiStyles";

export default function ConnectionIndicator() {
  const { connected, transport } = useRealtime();
  const t = useTranslations("realtime");

  if (transport === "none") return null;

  const label = connected ? `${t("connected")} (${transport.toUpperCase()})` : t("disconnected");

  return (
    <Tooltip title={label} arrow>
      <Box
        component="span"
        role="status"
        aria-label={label}
        sx={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: connected ? colors.success : colors.error,
          ml: 1,
        }}
      />
    </Tooltip>
  );
}
