"use client";

import {
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
import { useRouter } from "next/navigation";
import { colors } from "@/muiStyles";
import { AppUser } from "@/schemas";
import { useTranslations } from "next-intl";

const roleColors: Record<string, string> = {
  superuser: "#f59e0b",
  administrator: "#3b82f6",
  user: colors.slate300,
  guest: colors.slate400,
};

interface UserManagementTableProps {
  users: AppUser[];
}

const UserManagementTable: React.FC<UserManagementTableProps> = ({ users }) => {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650, maxWidth: 1020 }} aria-label="user management table">
        <TableHead>
          <TableRow>
            <TableCell>{tc("name")}</TableCell>
            <TableCell>{tc("email")}</TableCell>
            <TableCell>{t("role")}</TableCell>
            <TableCell>{tc("createdAt")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>
                <Box display="flex" justifyContent="center" alignItems="center" height="100px">
                  <Typography align="center">{t("noUsers")}</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <Tooltip
                key={user.id}
                title={t("clickToManage", { name: user.name ?? user.email })}
                placement="right"
                arrow
              >
                <TableRow
                  hover
                  onClick={() => router.push(`/admin/${user.id}`)}
                  sx={{
                    "&:hover": {
                      cursor: "pointer",
                      backgroundColor: colors.rowHover,
                    },
                  }}
                >
                  <TableCell>{user.name ?? tc("dash")}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      size="small"
                      sx={{
                        color: roleColors[user.role] ?? colors.slate300,
                        borderColor: roleColors[user.role] ?? colors.slate300,
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              </Tooltip>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default UserManagementTable;
