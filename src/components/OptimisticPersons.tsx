"use client";

import { useOptimistic } from "react";
import { Person } from "@/schemas";
import { Box, Typography } from "@mui/material";
import { pageContainerStyles } from "@/muiStyles";
import AddPersonForm from "./AddPeople";
import PersonTable from "./EditablePersonsTable";
import { useTranslations } from "next-intl";

interface OptimisticPersonsProps {
  persons: Person[];
  canCreate: boolean;
}

type OptimisticAction = { type: "add"; person: Person };

export default function OptimisticPersons({ persons, canCreate }: OptimisticPersonsProps) {
  const t = useTranslations("persons");

  const [optimisticPersons, addOptimistic] = useOptimistic<Person[], OptimisticAction>(
    persons,
    (state, action) => {
      switch (action.type) {
        case "add":
          return [...state, action.person];
        default:
          return state;
      }
    },
  );

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
        <PersonTable persons={optimisticPersons} />
      </Box>
    </>
  );
}
