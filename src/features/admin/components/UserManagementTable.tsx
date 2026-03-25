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
import { formatDate } from "@/utils/formatDate";
import { onActivateKeyDown } from "@/utils/keyboardHandlers";
import { AppUser } from "@/schemas";
import { useTranslations } from "next-intl";

const roleColors: Record<string, string> = {
  superuser: colors.warning,
  administrator: colors.info,
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
      <Table sx={{ minWidth: { xs: 500, sm: 650 } }} aria-label="user management table">
        <TableHead>
          <TableRow>
            <TableCell scope="col">{tc("name")}</TableCell>
            <TableCell scope="col">{tc("email")}</TableCell>
            <TableCell scope="col">{t("role")}</TableCell>
            <TableCell scope="col">{tc("createdAt")}</TableCell>
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
                  tabIndex={0}
                  onClick={() => router.push(`/admin/${user.id}`)}
                  onKeyDown={onActivateKeyDown(() => router.push(`/admin/${user.id}`))}
                  sx={{
                    "&:hover, &:focus-visible": {
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
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
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
