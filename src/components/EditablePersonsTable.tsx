"use client";

import {
  Box,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tooltip,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { colors } from "@/muiStyles";
import { Person } from "@/schemas";
import { useTranslations } from "next-intl";

interface PersonTableProps {
  persons: Person[];
}

const PersonTable: React.FC<PersonTableProps> = ({ persons }) => {
  const t = useTranslations("persons");
  const tc = useTranslations("common");
  const router = useRouter();

  const handleRowClick = (personId: string) => {
    router.push(`/managePersons/${personId}`);
  };

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: { xs: 500, sm: 650 } }} aria-label="person table">
        <TableHead>
          <TableRow>
            <TableCell scope="col">{tc("name")}</TableCell>
            <TableCell scope="col">{t("position")}</TableCell>
            <TableCell scope="col">{tc("email")}</TableCell>
            <TableCell scope="col">{tc("createdAt")}</TableCell>
            <TableCell scope="col">{tc("updatedAt")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {persons.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <Box display="flex" justifyContent="center" alignItems="center" height="100px">
                  <Typography align="center">{t("noPersons")}</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            persons.map((person) => (
              <Tooltip
                key={person.id}
                title={t("clickToManage", { name: person.name })}
                placement="right"
                arrow
              >
                <TableRow
                  hover
                  tabIndex={0}
                  onClick={() => handleRowClick(person.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleRowClick(person.id);
                    }
                  }}
                  sx={{
                    "&:hover, &:focus-visible": {
                      cursor: "pointer",
                      backgroundColor: colors.rowHover,
                    },
                  }}
                >
                  <TableCell>{person.name}</TableCell>
                  <TableCell>{person.position ?? ""}</TableCell>
                  <TableCell>{person.email ?? ""}</TableCell>
                  <TableCell>{new Date(person.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{new Date(person.updatedAt).toLocaleString()}</TableCell>
                </TableRow>
              </Tooltip>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PersonTable;
