"use client";

import {
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { useRouter } from "next/navigation";

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
          {persons.map((person) => (
            <TableRow
              key={person.id}
              hover
              onClick={() => handleRowClick(person.id)}
              sx={{
                "&:hover": {
                  cursor: "pointer",
                  backgroundColor: "#f0f0f0", // Change background color on hover
                },
              }}
            >
              <TableCell>{person.name}</TableCell>
              <TableCell>{person.position}</TableCell>
              <TableCell>{person.email}</TableCell>
              <TableCell>
                {new Date(person.createdAt).toLocaleString()}
              </TableCell>
              <TableCell>
                {new Date(person.updatedAt).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PersonTable;
