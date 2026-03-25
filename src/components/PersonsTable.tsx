"use client";

import React from "react";
import { Typography } from "@mui/material";
import { PeopleOutlined } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Person } from "@/schemas";
import { colors } from "@/muiStyles";
import DataTable, { Column, MobileDetail } from "./DataTable";

// ─── Read-only variant (homepage) ────────────────────────────────────────────

interface PersonsTableProps {
  persons: Person[];
  minimal?: boolean;
  linkToProfile?: boolean;
}

export function PersonsTable({
  persons,
  minimal = false,
  linkToProfile = false,
}: PersonsTableProps) {
  const t = useTranslations("persons");
  const tc = useTranslations("common");

  const columns: Column<Person>[] = [
    {
      header: tc("name"),
      accessor: (p) =>
        linkToProfile ? (
          <Link href={`/employees/${p.id}`} style={{ color: "inherit", textDecoration: "none" }}>
            <Typography
              component="span"
              sx={{
                "&:hover": { color: colors.green400, textDecoration: "underline" },
              }}
            >
              {p.name}
            </Typography>
          </Link>
        ) : (
          p.name
        ),
    },
    { header: t("position"), accessor: (p) => p.position ?? "" },
    { header: tc("email"), accessor: (p) => p.email ?? "" },
    { header: tc("createdAt"), accessor: (p) => new Date(p.createdAt).toLocaleString() },
    { header: tc("updatedAt"), accessor: (p) => new Date(p.updatedAt).toLocaleString() },
  ];

  const mobileDetails: MobileDetail<Person>[] = [
    {
      render: (p) =>
        p.position ? (
          <Typography variant="body2" sx={{ color: colors.slate300 }}>
            {p.position}
          </Typography>
        ) : null,
    },
    {
      render: (p) =>
        p.email ? (
          <Typography variant="body2" sx={{ color: colors.slate400 }}>
            {p.email}
          </Typography>
        ) : null,
    },
    {
      render: (p) => (
        <Typography variant="caption" sx={{ color: colors.slate400, mt: 0.5, display: "block" }}>
          {tc("createdAt")}: {new Date(p.createdAt).toLocaleString()}
        </Typography>
      ),
    },
  ];

  return (
    <DataTable<Person>
      data={persons}
      columns={columns}
      getRowKey={(p) => p.id}
      getItemName={(p) => p.name}
      emptyMessage={t("noPersons")}
      minimal={minimal}
      linkToProfile={linkToProfile}
      mobileDetails={mobileDetails}
      tableAriaLabel="person table"
    />
  );
}

// ─── Editable variant (manage page) ──────────────────────────────────────────

interface EditablePersonsTableProps {
  persons: Person[];
  canCreate?: boolean;
}

export function EditablePersonsTable({ persons, canCreate }: EditablePersonsTableProps) {
  const t = useTranslations("persons");
  const tc = useTranslations("common");
  const router = useRouter();

  const columns: Column<Person>[] = [
    { header: tc("name"), accessor: (p) => p.name },
    { header: t("position"), accessor: (p) => p.position ?? "" },
    { header: tc("email"), accessor: (p) => p.email ?? "" },
    { header: tc("createdAt"), accessor: (p) => new Date(p.createdAt).toLocaleString() },
    { header: tc("updatedAt"), accessor: (p) => new Date(p.updatedAt).toLocaleString() },
  ];

  const mobileDetails: MobileDetail<Person>[] = [
    {
      render: (p) =>
        p.position ? (
          <Typography variant="body2" sx={{ color: colors.slate300 }}>
            {p.position}
          </Typography>
        ) : null,
    },
    {
      render: (p) =>
        p.email ? (
          <Typography variant="body2" sx={{ color: colors.slate400 }}>
            {p.email}
          </Typography>
        ) : null,
    },
    {
      render: (p) => (
        <Typography variant="caption" sx={{ color: colors.slate400, mt: 0.5, display: "block" }}>
          {tc("createdAt")}: {new Date(p.createdAt).toLocaleString()}
        </Typography>
      ),
    },
  ];

  return (
    <DataTable<Person>
      data={persons}
      columns={columns}
      getRowKey={(p) => p.id}
      getItemName={(p) => p.name}
      emptyMessage={t("noPersons")}
      emptyIcon={PeopleOutlined}
      emptySubtitle={canCreate ? t("noPersonsHint") : undefined}
      onRowClick={(id) => router.push(`/managePersons/${id}`)}
      clickTooltip={(p) => t("clickToManage", { name: p.name })}
      mobileDetails={mobileDetails}
      tableAriaLabel="person table"
    />
  );
}

export default PersonsTable;
