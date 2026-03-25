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
import { PeopleOutlined } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { colors, mobileCardClickableStyles } from "@/muiStyles";
import { Person } from "@/schemas";
import { formatDate } from "@/utils/formatDate";
import { onActivateKeyDown } from "@/utils/keyboardHandlers";
import { useTranslations } from "next-intl";
import EmptyState from "./EmptyState";

interface PersonTableProps {
  persons: Person[];
  canCreate?: boolean;
}

const PersonTable: React.FC<PersonTableProps> = ({ persons, canCreate }) => {
  const t = useTranslations("persons");
  const tc = useTranslations("common");
  const router = useRouter();

  const handleRowClick = (personId: string) => {
    router.push(`/managePersons/${personId}`);
  };

  const emptyMessage = (
    <EmptyState
      icon={PeopleOutlined}
      title={t("noPersons")}
      subtitle={canCreate ? t("noPersonsHint") : undefined}
    />
  );

  return (
    <>
      {/* Desktop: table view */}
      <Box data-testid="table-view" sx={{ display: { xs: "none", md: "block" } }}>
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
                  <TableCell colSpan={5}>{emptyMessage}</TableCell>
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
                      onKeyDown={onActivateKeyDown(() => handleRowClick(person.id))}
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
                      <TableCell>{formatDate(person.createdAt)}</TableCell>
                      <TableCell>{formatDate(person.updatedAt)}</TableCell>
                    </TableRow>
                  </Tooltip>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Mobile: clickable card view */}
      <Box data-testid="card-view" sx={{ display: { xs: "block", md: "none" } }}>
        {persons.length === 0
          ? emptyMessage
          : persons.map((person) => (
              <Box
                key={person.id}
                tabIndex={0}
                role="button"
                aria-label={t("clickToManage", { name: person.name })}
                onClick={() => handleRowClick(person.id)}
                onKeyDown={onActivateKeyDown(() => handleRowClick(person.id))}
                sx={mobileCardClickableStyles}
              >
                <Typography variant="subtitle1" sx={{ color: colors.slate100, fontWeight: 600 }}>
                  {person.name}
                </Typography>
                {person.position && (
                  <Typography variant="body2" sx={{ color: colors.slate300 }}>
                    {person.position}
                  </Typography>
                )}
                {person.email && (
                  <Typography variant="body2" sx={{ color: colors.slate400 }}>
                    {person.email}
                  </Typography>
                )}
                <Typography
                  variant="caption"
                  sx={{ color: colors.slate400, mt: 0.5, display: "block" }}
                >
                  {tc("createdAt")}: {formatDate(person.createdAt)}
                </Typography>
              </Box>
            ))}
      </Box>
    </>
  );
};

export default PersonTable;
