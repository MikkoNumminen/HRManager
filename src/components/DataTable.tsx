"use client";

import React from "react";
import {
  Avatar,
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { SvgIconComponent } from "@mui/icons-material";
import Link from "next/link";
import { colors, mobileCardStyles, mobileCardClickableStyles } from "@/muiStyles";
import { getInitials } from "@/utils/initials";
import EmptyState from "./EmptyState";

// ─── Public types ────────────────────────────────────────────────────────────

export interface Column<T> {
  /** Column header — can be a string or ReactNode (e.g. wrapped in Tooltip) */
  header: React.ReactNode;
  /** Extract the cell value from a data item */
  accessor: (item: T) => React.ReactNode;
}

/** A detail line shown in mobile card view below the title */
export interface MobileDetail<T> {
  /** Render this detail line; return null/undefined to skip */
  render: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  /** Data items to render */
  data: T[];
  /** Column definitions for the desktop table */
  columns: Column<T>[];
  /** Unique key for each row */
  getRowKey: (item: T) => string;
  /** Display name for each item (used in chips, mobile card title, aria) */
  getItemName: (item: T) => string;

  // ─── Empty state ─────────────────────────────────────────────────────
  /** Simple text message shown when data is empty (non-editable variant) */
  emptyMessage?: string;
  /** Rich empty state with icon (editable variant) */
  emptyIcon?: SvgIconComponent;
  /** Subtitle shown below the empty icon (e.g. "Create your first person") */
  emptySubtitle?: string;

  // ─── Minimal / chip mode ─────────────────────────────────────────────
  /** When true, render compact chips instead of a table */
  minimal?: boolean;
  /** When true in minimal mode, chips link to /employees/:id */
  linkToProfile?: boolean;

  // ─── Editable / clickable mode ───────────────────────────────────────
  /** Called when a row is clicked; receives getRowKey(item) */
  onRowClick?: (id: string) => void;
  /** Tooltip + aria-label for clickable rows; receives item */
  clickTooltip?: (item: T) => string;

  // ─── Mobile card ─────────────────────────────────────────────────────
  /** Additional detail lines for mobile cards (below the title) */
  mobileDetails?: MobileDetail<T>[];

  /** Table aria-label */
  tableAriaLabel?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DataTable<T>({
  data,
  columns,
  getRowKey,
  getItemName,
  emptyMessage,
  emptyIcon,
  emptySubtitle,
  minimal = false,
  linkToProfile = false,
  onRowClick,
  clickTooltip,
  mobileDetails,
  tableAriaLabel,
}: DataTableProps<T>) {
  const isClickable = !!onRowClick;

  // ─── Keyboard handler for clickable rows / cards ─────────────────────
  const handleKeyDown = (id: string) => (e: React.KeyboardEvent) => {
    if (onRowClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onRowClick(id);
    }
  };

  // ─── Minimal: chip list ──────────────────────────────────────────────
  if (minimal) {
    if (data.length === 0) {
      return (
        <Typography sx={{ color: colors.slate400, textAlign: "center", py: 2 }}>
          {emptyMessage}
        </Typography>
      );
    }
    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {data.map((item) => {
          const id = getRowKey(item);
          const name = getItemName(item);
          const initials = getInitials(name);
          const avatar = (
            <Avatar
              sx={{
                bgcolor: colors.slate600,
                color: `${colors.slate100} !important`,
                fontSize: "0.75rem",
              }}
            >
              {initials}
            </Avatar>
          );
          const baseSx = {
            color: colors.slate100,
            borderColor: colors.slate300,
            "& .MuiChip-label": { fontWeight: 500 },
          };

          return linkToProfile ? (
            <Chip
              key={id}
              component={Link}
              href={`/employees/${id}`}
              clickable
              avatar={avatar}
              label={name}
              variant="outlined"
              sx={{
                ...baseSx,
                "&:hover": { borderColor: colors.green400, color: colors.green400 },
              }}
            />
          ) : (
            <Chip key={id} avatar={avatar} label={name} variant="outlined" sx={baseSx} />
          );
        })}
      </Box>
    );
  }

  // ─── Empty state (full mode) ─────────────────────────────────────────
  const emptyContent = emptyIcon ? (
    <EmptyState icon={emptyIcon} title={emptyMessage ?? ""} subtitle={emptySubtitle} />
  ) : (
    <Box display="flex" justifyContent="center" alignItems="center" height="100px">
      <Typography align="center">{emptyMessage}</Typography>
    </Box>
  );

  // ─── Desktop table ──────────────────────────────────────────────────
  const desktopTable = (
    <Box data-testid="table-view" sx={{ display: { xs: "none", md: "block" } }}>
      <TableContainer component={Paper} sx={!isClickable ? { marginBottom: "20px" } : undefined}>
        <Table sx={{ minWidth: { xs: 500, sm: 650 } }} aria-label={tableAriaLabel ?? "data table"}>
          <TableHead>
            <TableRow>
              {columns.map((col, i) => (
                <TableCell key={i} scope="col">
                  {col.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>{emptyContent}</TableCell>
              </TableRow>
            ) : (
              data.map((item) => {
                const id = getRowKey(item);
                const row = (
                  <TableRow
                    key={id}
                    hover={isClickable}
                    tabIndex={isClickable ? 0 : undefined}
                    onClick={isClickable ? () => onRowClick!(id) : undefined}
                    onKeyDown={isClickable ? handleKeyDown(id) : undefined}
                    sx={
                      isClickable
                        ? {
                            "&:hover, &:focus-visible": {
                              cursor: "pointer",
                              backgroundColor: colors.rowHover,
                            },
                          }
                        : undefined
                    }
                  >
                    {columns.map((col, ci) => (
                      <TableCell key={ci}>{col.accessor(item)}</TableCell>
                    ))}
                  </TableRow>
                );

                if (isClickable && clickTooltip) {
                  return (
                    <Tooltip key={id} title={clickTooltip(item)} placement="right" arrow>
                      {row}
                    </Tooltip>
                  );
                }
                return row;
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // ─── Mobile cards ────────────────────────────────────────────────────
  const mobileCards = (
    <Box
      data-testid="card-view"
      sx={{ display: { xs: "block", md: "none" }, ...(isClickable ? {} : { mb: 2 }) }}
    >
      {data.length === 0
        ? emptyContent
        : data.map((item) => {
            const id = getRowKey(item);
            const name = getItemName(item);
            const cardProps = isClickable
              ? {
                  tabIndex: 0,
                  role: "button" as const,
                  "aria-label": clickTooltip ? clickTooltip(item) : name,
                  onClick: () => onRowClick!(id),
                  onKeyDown: handleKeyDown(id),
                  sx: mobileCardClickableStyles,
                }
              : { sx: mobileCardStyles };

            return (
              <Box key={id} {...cardProps}>
                <Typography variant="subtitle1" sx={{ color: colors.slate100, fontWeight: 600 }}>
                  {isClickable ? (
                    name
                  ) : linkToProfile ? (
                    <Link
                      href={`/employees/${id}`}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      <Typography
                        component="span"
                        sx={{
                          fontWeight: 600,
                          "&:hover": {
                            color: colors.green400,
                            textDecoration: "underline",
                          },
                        }}
                      >
                        {name}
                      </Typography>
                    </Link>
                  ) : (
                    name
                  )}
                </Typography>
                {mobileDetails?.map((detail, i) => {
                  const content = detail.render(item);
                  return content != null ? (
                    <React.Fragment key={i}>{content}</React.Fragment>
                  ) : null;
                })}
              </Box>
            );
          })}
    </Box>
  );

  return (
    <>
      {desktopTable}
      {mobileCards}
    </>
  );
}
