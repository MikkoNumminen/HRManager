"use client";

import { Box, List, ListItem, ListItemIcon, ListItemText, Typography, Paper } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { useRealtime } from "@/components/shared/RealtimeProvider";
import { useTranslations } from "next-intl";
import { colors } from "@/muiStyles";
import type { RealtimeEvent } from "@/features/realtime/schemas";
import ConnectionIndicator from "./ConnectionIndicator";

const MAX_VISIBLE = 20;

// Map audit actions to icons
function getActionIcon(action: string) {
  switch (action) {
    case "create":
    case "import":
    case "seed":
      return <PersonAddIcon fontSize="small" sx={{ color: colors.success }} />;
    case "update":
      return <EditIcon fontSize="small" sx={{ color: colors.info }} />;
    case "delete":
      return <DeleteIcon fontSize="small" sx={{ color: colors.error }} />;
    case "approve":
      return <CheckCircleIcon fontSize="small" sx={{ color: colors.success }} />;
    case "reject":
      return <CancelIcon fontSize="small" sx={{ color: colors.error }} />;
    default:
      return <NotificationsActiveIcon fontSize="small" sx={{ color: colors.info }} />;
  }
}

// Relative time formatting
function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ActivityFeed() {
  const { events } = useRealtime();
  const t = useTranslations("realtime");

  // Show most recent first, limit to MAX_VISIBLE
  const visibleEvents: RealtimeEvent[] = [...events].reverse().slice(0, MAX_VISIBLE);

  return (
    <Paper
      sx={{
        backgroundColor: colors.slate700,
        border: `1px solid ${colors.slate600}`,
        borderRadius: "4px",
        p: 2,
        maxHeight: 400,
        overflow: "auto",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle1" sx={{ color: colors.slate100, fontWeight: 600 }}>
          {t("activityFeed")}
        </Typography>
        <ConnectionIndicator />
      </Box>

      {visibleEvents.length === 0 ? (
        <Typography variant="body2" sx={{ color: colors.slate400, py: 2, textAlign: "center" }}>
          {t("noActivity")}
        </Typography>
      ) : (
        <List dense disablePadding>
          {visibleEvents.map((event) => (
            <ListItem
              key={event.id}
              disableGutters
              sx={{
                py: 0.5,
                borderBottom: `1px solid ${colors.slate600}`,
                "&:last-child": { borderBottom: "none" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>{getActionIcon(event.action)}</ListItemIcon>
              <ListItemText
                primary={event.summary}
                secondary={formatRelativeTime(event.timestamp)}
                primaryTypographyProps={{
                  variant: "body2",
                  sx: { color: colors.slate300 },
                }}
                secondaryTypographyProps={{
                  variant: "caption",
                  sx: { color: colors.slate400 },
                }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}
