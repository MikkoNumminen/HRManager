"use client";

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
  Typography,
} from "@mui/material";
import { Person } from "@/schemas";
import { colors, mobileCardStyles } from "@/muiStyles";
import { formatDate } from "@/utils/formatDate";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface PersonTableProps {
  persons: Person[];
  minimal?: boolean;
  linkToProfile?: boolean;
}

const PersonTable: React.FC<PersonTableProps> = ({
  persons,
  minimal = false,
  linkToProfile = false,
}) => {
  const t = useTranslations("persons");
  const tc = useTranslations("common");
  if (minimal) {
    return persons.length === 0 ? (
      <Typography sx={{ color: colors.slate400, textAlign: "center", py: 2 }}>
        {t("noPersons")}
      </Typography>
    ) : (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {persons.map((person) => {
          const initials = person.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          return linkToProfile ? (
            <Chip
              key={person.id}
              component={Link}
              href={`/employees/${person.id}`}
              clickable
              avatar={
                <Avatar
                  sx={{
                    bgcolor: colors.slate600,
                    color: `${colors.slate100} !important`,
                    fontSize: "0.75rem",
                  }}
                >
                  {initials}
                </Avatar>
              }
              label={person.name}
              variant="outlined"
              sx={{
                color: colors.slate100,
                borderColor: colors.slate300,
                "& .MuiChip-label": { fontWeight: 500 },
                "&:hover": { borderColor: colors.green400, color: colors.green400 },
              }}
            />
          ) : (
            <Chip
              key={person.id}
              avatar={
                <Avatar
                  sx={{
                    bgcolor: colors.slate600,
                    color: `${colors.slate100} !important`,
                    fontSize: "0.75rem",
                  }}
                >
                  {initials}
                </Avatar>
              }
              label={person.name}
              variant="outlined"
              sx={{
                color: colors.slate100,
                borderColor: colors.slate300,
                "& .MuiChip-label": { fontWeight: 500 },
              }}
            />
          );
        })}
      </Box>
    );
  }

  const emptyMessage = (
    <Box display="flex" justifyContent="center" alignItems="center" height="100px">
      <Typography align="center">{t("noPersons")}</Typography>
    </Box>
  );

  return (
    <>
      {/* Desktop: table view */}
      <Box data-testid="table-view" sx={{ display: { xs: "none", md: "block" } }}>
        <TableContainer component={Paper} sx={{ marginBottom: "20px" }}>
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
                  <TableRow key={person.id}>
                    <TableCell>
                      {linkToProfile ? (
                        <Link
                          href={`/employees/${person.id}`}
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          <Typography
                            component="span"
                            sx={{
                              "&:hover": { color: colors.green400, textDecoration: "underline" },
                            }}
                          >
                            {person.name}
                          </Typography>
                        </Link>
                      ) : (
                        person.name
                      )}
                    </TableCell>
                    <TableCell>{person.position ?? ""}</TableCell>
                    <TableCell>{person.email ?? ""}</TableCell>
                    <TableCell>{formatDate(person.createdAt)}</TableCell>
                    <TableCell>{formatDate(person.updatedAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Mobile: card view */}
      <Box data-testid="card-view" sx={{ display: { xs: "block", md: "none" }, mb: 2 }}>
        {persons.length === 0
          ? emptyMessage
          : persons.map((person) => (
              <Box key={person.id} sx={mobileCardStyles}>
                <Typography variant="subtitle1" sx={{ color: colors.slate100, fontWeight: 600 }}>
                  {linkToProfile ? (
                    <Link
                      href={`/employees/${person.id}`}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      <Typography
                        component="span"
                        sx={{
                          fontWeight: 600,
                          "&:hover": { color: colors.green400, textDecoration: "underline" },
                        }}
                      >
                        {person.name}
                      </Typography>
                    </Link>
                  ) : (
                    person.name
                  )}
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
