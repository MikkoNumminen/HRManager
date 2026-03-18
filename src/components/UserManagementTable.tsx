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
  const router = useRouter();

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650, maxWidth: 1020 }} aria-label="user management table">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Created At</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>
                <Box display="flex" justifyContent="center" alignItems="center" height="100px">
                  <Typography align="center">No Users Found</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <Tooltip
                key={user.id}
                title={`Click to manage permissions for ${user.name ?? user.email}`}
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
                  <TableCell>{user.name ?? "-"}</TableCell>
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
