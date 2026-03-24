"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import { colors, pageContainerStyles, headerStyles } from "@/muiStyles";
import { TeamReviewCycle } from "@/schemas";
import { useTranslations } from "next-intl";

interface Props {
  cycles: TeamReviewCycle[];
}

type ReviewType = "SELF" | "MANAGER" | "PEER" | "DIRECT_REPORT";

const ALL_TYPES: ReviewType[] = ["SELF", "MANAGER", "PEER", "DIRECT_REPORT"];

const cellBorderStyle = `1px solid ${colors.slate600}`;

export default function TeamReviewsDashboardClient({ cycles }: Props) {
  const t = useTranslations("reviews");
  const [selectedCycleId, setSelectedCycleId] = useState<string>(
    cycles.length > 0 ? cycles[0].cycleId : "",
  );

  const selectedCycle = cycles.find((c) => c.cycleId === selectedCycleId) ?? null;

  // Determine which review types are present in the selected cycle's data
  const activeTypes: ReviewType[] = selectedCycle
    ? ALL_TYPES.filter((type) =>
        selectedCycle.reports.some((report) => report.requests.some((req) => req.type === type)),
      )
    : [];

  if (cycles.length === 0) {
    return (
      <Box sx={pageContainerStyles}>
        <Box sx={headerStyles}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <GroupIcon sx={{ color: colors.slate400, fontSize: 20 }} />
            <Typography variant="h6" sx={{ color: colors.slate100 }}>
              {t("teamReviewsHeading")}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography sx={{ color: colors.slate400 }}>{t("noManagedTeams")}</Typography>
          <Typography variant="body2" sx={{ color: colors.slate400, mt: 1 }}>
            {t("noManagedTeamsHint")}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={pageContainerStyles}>
        <Box sx={headerStyles}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <GroupIcon sx={{ color: colors.slate400, fontSize: 20 }} />
            <Typography variant="h6" sx={{ color: colors.slate100 }}>
              {t("teamReviewsHeading")}
            </Typography>
          </Box>
          {cycles.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel
                sx={{
                  color: colors.slate400,
                  "&.Mui-focused": { color: colors.slate100 },
                }}
              >
                {t("selectCycle")}
              </InputLabel>
              <Select
                value={selectedCycleId}
                label={t("selectCycle")}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                sx={{
                  color: colors.slate100,
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate600 },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate400 },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: colors.slate400,
                  },
                  "& .MuiSvgIcon-root": { color: colors.slate400 },
                  "& .MuiSelect-select": { py: 1 },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: colors.slate700,
                      border: cellBorderStyle,
                      "& .MuiMenuItem-root": {
                        color: colors.slate100,
                        "&:hover": { backgroundColor: colors.slate600 },
                        "&.Mui-selected": { backgroundColor: colors.slate600 },
                      },
                    },
                  },
                }}
              >
                {cycles.map((cycle) => (
                  <MenuItem key={cycle.cycleId} value={cycle.cycleId}>
                    {cycle.cycleName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {selectedCycle && selectedCycle.reports.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography sx={{ color: colors.slate400 }}>{t("noManagedTeams")}</Typography>
            <Typography variant="body2" sx={{ color: colors.slate400, mt: 1 }}>
              {t("noManagedTeamsHint")}
            </Typography>
          </Box>
        ) : selectedCycle ? (
          <TableContainer sx={{ border: cellBorderStyle, borderRadius: "4px" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      color: colors.slate400,
                      border: cellBorderStyle,
                      fontWeight: 600,
                    }}
                  >
                    {t("employee")}
                  </TableCell>
                  {activeTypes.map((type) => (
                    <TableCell
                      key={type}
                      align="center"
                      sx={{
                        color: colors.slate400,
                        border: cellBorderStyle,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {type === "SELF"
                        ? t("typeSelf")
                        : type === "MANAGER"
                          ? t("typeManager")
                          : type === "PEER"
                            ? t("typePeer")
                            : t("typeDirectReport")}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedCycle.reports.map((report) => (
                  <TableRow key={report.subjectId}>
                    <TableCell
                      sx={{
                        color: colors.slate100,
                        border: cellBorderStyle,
                      }}
                    >
                      {report.subjectName}
                    </TableCell>
                    {activeTypes.map((type) => {
                      const request = report.requests.find((req) => req.type === type);
                      if (!request) {
                        return (
                          <TableCell
                            key={type}
                            align="center"
                            sx={{ color: colors.slate400, border: cellBorderStyle }}
                          >
                            {"—"}
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={type} align="center" sx={{ border: cellBorderStyle }}>
                          {request.status === "SUBMITTED" ? (
                            <Chip label={t("statusSubmitted")} color="success" size="small" />
                          ) : (
                            <Chip
                              label={t("statusPending")}
                              variant="outlined"
                              size="small"
                              sx={{
                                color: colors.slate400,
                                borderColor: colors.slate600,
                              }}
                            />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
      </Box>
    </Box>
  );
}
