import { redirect } from "next/navigation";
import { Box, Button, TextField, Typography } from "@mui/material";
import { formStyles, headerStyles, smallButtonStyles, textFieldStyles } from "@/muiStyles";
import { createPerson } from "@/serverActions";
import Link from "next/link";

async function handleSubmit(data: FormData) {
  "use server";
  await createPerson(data);
  redirect("/");
}

export default function Page() {
  return (
    <>
      <Box sx={headerStyles}>
        <Typography variant="h4">New Person</Typography>
      </Box>
      <Box sx={formStyles} component="form" action={handleSubmit as never}>
        <TextField name="name" label="Enter Name" size="small" sx={textFieldStyles} />
        <TextField name="email" label="Enter Email" size="small" sx={textFieldStyles} />
        <Box display="flex" gap={1} justifyContent="flex-end">
          <Button component={Link} href=".." sx={smallButtonStyles}>Cancel</Button>
          <Button type="submit" sx={smallButtonStyles}>Create</Button>
        </Box>
      </Box>
    </>
  );
}
