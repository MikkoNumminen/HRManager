"use client";

import { useOptimistic, useState, useRef } from "react";
import { Department } from "@/schemas";
import { Box, Typography, Pagination } from "@mui/material";
import { pageContainerStyles } from "@/muiStyles";
import AddDepartmentForm from "./AddDepartment";
import { EditableDepartmentsTable } from "./DepartmentsDataTable";
import SearchBar from "./SearchBar";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { PAGE_SIZE } from "@/constants";

interface OptimisticDepartmentsProps {
  departments: Department[];
  total: number;
  page: number;
  search: string;
  canCreate: boolean;
}

type OptimisticAction = { type: "add"; department: Department };

export default function OptimisticDepartments({
  departments,
  total,
  page,
  search,
  canCreate,
}: OptimisticDepartmentsProps) {
  const t = useTranslations("departments");
  const router = useRouter();
  const [inputValue, setInputValue] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [optimisticDepartments, addOptimistic] = useOptimistic<Department[], OptimisticAction>(
    departments,
    (state, action) => (action.type === "add" ? [...state, action.department] : state),
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleSearch(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      params.set("page", "1");
      router.replace(`/manageDepartments?${params.toString()}`);
    }, 400);
  }

  function handlePageChange(_e: React.ChangeEvent<unknown>, newPage: number) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("page", String(newPage));
    router.push(`/manageDepartments?${params.toString()}`);
  }

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
        <SearchBar value={inputValue} onChange={handleSearch} />
        <EditableDepartmentsTable departments={optimisticDepartments} canCreate={canCreate} />
        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Pagination count={totalPages} page={page} onChange={handlePageChange} />
          </Box>
        )}
      </Box>
    </>
  );
}
