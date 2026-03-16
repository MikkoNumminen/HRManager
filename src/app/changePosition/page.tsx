import { redirect } from "next/navigation";
import Link from "next/link";
import { formStyles, headerStyles, smallButtonStyles, textFieldStyles } from "@/muiStyles";
import { updatePosition } from "@/serverActions";
import { getPersons } from "@/queries";
import { Box, Button, TextField, Typography } from "@mui/material";
import { RemovePersonCheckBoxList } from "@/components/RemovePersonCheckBoxList";

async function handleSubmit(data: FormData) {
  "use server";
  await updatePosition(data);
  redirect("/");
}

export default async function Page() {
  const persons = await getPersons();
  return (
    <>
      <Box sx={headerStyles}>
        <Typography variant="h4">Change Position</Typography>
      </Box>

      <Box sx={formStyles} component="form" action={handleSubmit as never} method="POST">
        <Box sx={{ pl: 1, mb: 1 }}>
          {persons.map((p) => (
            <RemovePersonCheckBoxList key={p.id} {...p} />
          ))}
        </Box>
        <Box display="flex" gap={1} justifyContent="flex-end">
          <TextField name="name" label="New Position" size="small" sx={{ ...textFieldStyles, flexGrow: 1 }} />
          <Button component={Link} href=".." sx={smallButtonStyles}>Cancel</Button>
          <Button type="submit" sx={smallButtonStyles}>Change</Button>
        </Box>
      </Box>
    </>
  );
}
