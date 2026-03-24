"use client";

import { useOptimistic } from "react";
import { Department } from "@/schemas";
import { Box, Typography } from "@mui/material";
import { pageContainerStyles } from "@/muiStyles";
import AddDepartmentForm from "./AddDepartment";
import EditableDepartmentsTable from "./EditableDepartmentsTable";
import { useTranslations } from "next-intl";

interface OptimisticDepartmentsProps {
  departments: Department[];
  canCreate: boolean;
}

type OptimisticAction = { type: "add"; department: Department };

export default function OptimisticDepartments({
  departments,
  canCreate,
}: OptimisticDepartmentsProps) {
  const t = useTranslations("departments");

  const [optimisticDepartments, addOptimistic] = useOptimistic<Department[], OptimisticAction>(
    departments,
    (state, action) => (action.type === "add" ? [...state, action.department] : state),
  );

  const handleOptimisticAdd = (name: string, description: string) => {
    const now = new Date();
    addOptimistic({
      type: "add",
      department: {
        id: crypto.randomUUID(),
        name,
        description: description || null,
        headId: null,
        headName: null,
        createdAt: now,
        updatedAt: now,
        teams: [],
      },
    });
  };

  return (
    <>
      {canCreate && <AddDepartmentForm onOptimisticAdd={handleOptimisticAdd} />}
      <Box data-tutorial="departments-table" sx={pageContainerStyles}>
        <Typography variant="h6" mb={1}>
          {t("heading")}
        </Typography>
        <EditableDepartmentsTable departments={optimisticDepartments} canCreate={canCreate} />
      </Box>
    </>
  );
}
