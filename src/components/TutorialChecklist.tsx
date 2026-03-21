"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Collapse,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SchoolIcon from "@mui/icons-material/School";
import ReplayIcon from "@mui/icons-material/Replay";
import { colors } from "@/muiStyles";
import { useTutorial } from "./TutorialProvider";
import { TUTORIAL_STEPS } from "@/tutorialConfig";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

function getStepRoute(route: string | RegExp): string | null {
  if (typeof route === "string") return route;
  return null;
}

export default function TutorialChecklist() {
  const t = useTranslations("tutorial");
  const router = useRouter();
  const { isActive, completedSteps, totalSteps, completedCount, allComplete, resetTutorial } =
    useTutorial();
  const [expanded, setExpanded] = useState(true);

  if (!isActive) return null;

  const progress = (completedCount / totalSteps) * 100;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 1100,
        pointerEvents: "none",
      }}
    >
      <Paper
        elevation={12}
        sx={{
          width: { xs: 280, sm: 320 },
          maxHeight: "80vh",
          backgroundColor: colors.slate700,
          border: `1px solid ${colors.slate300}`,
          borderRadius: "12px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          pointerEvents: "auto",
        }}
      >
        <Box
          onClick={() => setExpanded(!expanded)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 1.5,
            cursor: "pointer",
            "&:hover": { backgroundColor: colors.hoverOverlay },
          }}
        >
          <SchoolIcon sx={{ color: colors.green400, fontSize: 24 }} />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ color: colors.slate100, fontWeight: 600 }}>
              {t("checklistTitle")}
            </Typography>
            <Typography variant="caption" sx={{ color: colors.slate400 }}>
              {t("checklistProgress", { completed: completedCount, total: totalSteps })}
            </Typography>
          </Box>
          <IconButton size="small" sx={{ color: colors.slate300 }}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 3,
            backgroundColor: colors.slate600,
            "& .MuiLinearProgress-bar": {
              backgroundColor: colors.green400,
            },
          }}
        />

        <Collapse in={expanded}>
          <Box sx={{ maxHeight: "50vh", overflowY: "auto" }}>
            <List dense sx={{ py: 0.5 }}>
              {TUTORIAL_STEPS.map((step) => {
                const done = completedSteps.has(step.id);
                const navigableRoute = getStepRoute(step.route);

                return (
                  <ListItem
                    key={step.id}
                    onClick={() => {
                      if (!done && navigableRoute) {
                        router.push(navigableRoute);
                      }
                    }}
                    sx={{
                      cursor: !done && navigableRoute ? "pointer" : "default",
                      opacity: done ? 0.6 : 1,
                      "&:hover":
                        !done && navigableRoute ? { backgroundColor: colors.hoverOverlay } : {},
                      py: 0.5,
                      px: 1.5,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {done ? (
                        <CheckCircleIcon sx={{ color: colors.green400, fontSize: 20 }} />
                      ) : (
                        <RadioButtonUncheckedIcon sx={{ color: colors.slate400, fontSize: 20 }} />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={t(`step_${step.id}` as Parameters<typeof t>[0])}
                      primaryTypographyProps={{
                        variant: "body2",
                        sx: {
                          color: done ? colors.slate400 : colors.slate100,
                          textDecoration: done ? "line-through" : "none",
                          fontSize: "0.8rem",
                        },
                      }}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Box>

          {allComplete && (
            <Box sx={{ p: 1.5, pt: 0 }}>
              <Button
                onClick={resetTutorial}
                startIcon={<ReplayIcon />}
                size="small"
                fullWidth
                sx={{
                  color: colors.slate300,
                  border: `1px solid ${colors.slate300}`,
                  borderRadius: "8px",
                  "&:hover": { backgroundColor: colors.hoverOverlay },
                }}
              >
                {t("restartTutorial")}
              </Button>
            </Box>
          )}
        </Collapse>
      </Paper>
    </Box>
  );
}
