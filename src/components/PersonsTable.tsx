import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

interface Person {
  id: string;
  name: string;
  position: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PersonTableProps {
  persons: Person[];
}

const PersonTable: React.FC<PersonTableProps> = ({ persons }) => {
  return (
    <TableContainer component={Paper} sx={{ marginBottom: '20px' }}>
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
            <TableRow key={person.id}>
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
