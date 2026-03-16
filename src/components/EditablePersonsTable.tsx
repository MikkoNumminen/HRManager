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

interface Person {
  id: string;
  name: string;
  position: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PersonTableProps {
  persons: Person[];
}

const PersonTable: React.FC<PersonTableProps> = ({ persons }) => {
  const router = useRouter();

  const handleRowClick = (personId: string) => {
    router.push(`/managePersons/${personId}`);
  };

  return (
    <TableContainer component={Paper} sx={{ marginBottom: "20px" }}>
      <Table sx={{ minWidth: 650, maxWidth: 1020 }} aria-label="person table">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Position</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Created At</TableCell>
            <TableCell>Updated At</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {persons.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  height="100px"
                >
                  <Typography align="center">No Persons Available</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            persons.map((person) => (
              <Tooltip key={person.id} title={`Click to manage ${person.name}`} placement="right" arrow>
                <TableRow
                  hover
                  onClick={() => handleRowClick(person.id)}
                  sx={{
                    "&:hover": {
                      cursor: "pointer",
                      backgroundColor: colors.rowHover,
                    },
                  }}
                >
                <TableCell>{person.name}</TableCell>
                <TableCell>{person.position === "-" ? "" : person.position}</TableCell>
                <TableCell>{person.email}</TableCell>
                <TableCell>
                  {new Date(person.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  {new Date(person.updatedAt).toLocaleString()}
                </TableCell>
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
