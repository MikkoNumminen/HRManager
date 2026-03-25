"use client";

import { useOptimistic, useState, useRef } from "react";
import { Person } from "@/schemas";
import { Box, Typography, Pagination } from "@mui/material";
import { pageContainerStyles } from "@/muiStyles";
import AddPersonForm from "./AddPersonForm";
import { EditablePersonsTable as PersonTable } from "./PersonsDataTable";
import SearchBar from "./SearchBar";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { PAGE_SIZE } from "@/constants";

interface OptimisticPersonsProps {
  persons: Person[];
  total: number;
  page: number;
  search: string;
  canCreate: boolean;
}

type OptimisticAction = { type: "add"; person: Person };

export default function OptimisticPersons({
  persons,
  total,
  page,
  search,
  canCreate,
}: OptimisticPersonsProps) {
  const t = useTranslations("persons");
  const router = useRouter();
  const [inputValue, setInputValue] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [optimisticPersons, addOptimistic] = useOptimistic<Person[], OptimisticAction>(
    persons,
    (state, action) => (action.type === "add" ? [...state, action.person] : state),
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleSearch(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      params.set("page", "1");
      router.replace(`/managePersons?${params.toString()}`);
    }, 400);
  }

  function handlePageChange(_e: React.ChangeEvent<unknown>, newPage: number) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("page", String(newPage));
    router.push(`/managePersons?${params.toString()}`);
  }

  const handleOptimisticAdd = (name: string, email: string) => {
    const now = new Date();
    addOptimistic({
      type: "add",
      person: {
        id: crypto.randomUUID(),
        name,
        email,
        position: null,
        createdAt: now,
        updatedAt: now,
      },
    });
  };

  return (
    <>
      {canCreate && <AddPersonForm onOptimisticAdd={handleOptimisticAdd} />}
      <Box sx={pageContainerStyles}>
        <Typography variant="h6" mb={1}>
          {t("heading")}
        </Typography>
        <SearchBar value={inputValue} onChange={handleSearch} />
        <PersonTable persons={optimisticPersons} canCreate={canCreate} />
        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Pagination count={totalPages} page={page} onChange={handlePageChange} />
          </Box>
        )}
      </Box>
    </>
  );
}
