"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Tooltip,
  Typography,
  CircularProgress,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useState, useTransition } from "react";
import { colors, boxStyles } from "@/muiStyles";
import { Permissions } from "@/schemas";
import { DataExportCounts } from "@/queries";
import {
  exportPersonsCsv,
  exportTeamsCsv,
  exportDepartmentsCsv,
  exportAuditLogsCsv,
} from "@/serverActions";
import CsvImportDialog from "./CsvImportDialog";
import { useTranslations } from "next-intl";

interface DataImportExportProps {
  counts: DataExportCounts;
  permissions: Permissions;
}

function downloadCsvFile(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadTemplate() {
  const template = "name,email,position\n";
  downloadCsvFile(template, "persons_import_template.csv");
}

export default function DataImportExport({ counts, permissions }: DataImportExportProps) {
  const t = useTranslations("dataIO");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  const canImport = permissions["data:import"];
  const canExport = permissions["data:export"];
  const canExportAudit = canExport && permissions["admin:view_audit_log"];

  const handleExport = (key: string, exportFn: () => Promise<string>, filename: string) => {
    setExportingKey(key);
    startTransition(async () => {
      try {
        const csv = await exportFn();
        downloadCsvFile(csv, filename);
      } finally {
        setExportingKey(null);
      }
    });
  };

  const exportCards = [
    {
      key: "persons",
      label: t("persons"),
      count: counts.persons,
      fn: exportPersonsCsv,
      filename: "persons.csv",
      visible: canExport,
    },
    {
      key: "teams",
      label: t("teams"),
      count: counts.teams,
      fn: exportTeamsCsv,
      filename: "teams.csv",
      visible: canExport,
    },
    {
      key: "departments",
      label: t("departments"),
      count: counts.departments,
      fn: exportDepartmentsCsv,
      filename: "departments.csv",
      visible: canExport,
    },
    {
      key: "auditLogs",
      label: t("auditLogs"),
      count: counts.auditLogs,
      fn: exportAuditLogsCsv,
      filename: "audit_logs.csv",
      visible: canExportAudit,
    },
  ];

  return (
    <Box>
      {/* Export Section */}
      {canExport && (
        <>
          <Typography variant="h6" sx={{ color: colors.slate100, mb: 1 }}>
            {t("exportTitle")}
          </Typography>
          <Typography variant="body2" sx={{ color: colors.slate400, mb: 2 }}>
            {t("exportDescription")}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
              mb: 3,
            }}
          >
            {exportCards
              .filter((c) => c.visible)
              .map((card) => (
                <Card key={card.key} sx={boxStyles}>
                  <CardContent
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      "&:last-child": { pb: 2 },
                    }}
                  >
                    <Box>
                      <Typography sx={{ color: colors.slate100, fontWeight: 500 }}>
                        {card.label}
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.slate400 }}>
                        {t("recordCount", { count: card.count })}
                      </Typography>
                    </Box>
                    <Tooltip title={t("downloadCsv")} arrow>
                      <span>
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={isPending || card.count === 0}
                          onClick={() => handleExport(card.key, card.fn, card.filename)}
                          startIcon={
                            exportingKey === card.key ? (
                              <CircularProgress size={16} />
                            ) : (
                              <DownloadIcon />
                            )
                          }
                          sx={{
                            color: colors.slate100,
                            borderColor: colors.slate300,
                            "&:hover": { borderColor: colors.slate100 },
                          }}
                        >
                          {t("export")}
                        </Button>
                      </span>
                    </Tooltip>
                  </CardContent>
                </Card>
              ))}
          </Box>
        </>
      )}

      {/* Divider between sections */}
      {canExport && canImport && <Divider sx={{ borderColor: colors.slate300, my: 3 }} />}

      {/* Import Section */}
      {canImport && (
        <>
          <Typography variant="h6" sx={{ color: colors.slate100, mb: 1 }}>
            {t("importTitle")}
          </Typography>
          <Typography variant="body2" sx={{ color: colors.slate400, mb: 2 }}>
            {t("importDescription")}
          </Typography>
          <Card sx={boxStyles}>
            <CardContent>
              <Typography sx={{ color: colors.slate100, fontWeight: 500, mb: 1 }}>
                {t("importPersons")}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.slate400, mb: 2 }}>
                {t("importPersonsHelp")}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={downloadTemplate}
                  startIcon={<DownloadIcon />}
                  sx={{
                    color: colors.slate300,
                    borderColor: colors.slate300,
                    "&:hover": { borderColor: colors.slate100 },
                  }}
                >
                  {t("downloadTemplate")}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setImportDialogOpen(true)}
                  startIcon={<UploadFileIcon />}
                  sx={{
                    backgroundColor: colors.info,
                    "&:hover": { backgroundColor: colors.info, opacity: 0.9 },
                  }}
                >
                  {t("uploadCsv")}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <CsvImportDialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} />
        </>
      )}
    </Box>
  );
}
