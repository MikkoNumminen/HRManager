import { redirect } from "next/navigation";
import Link from "next/link";
import { RemovePersonCheckBoxList } from "@/components/RemovePersonCheckBoxList";
import { formStyles, headerStyles, smallButtonStyles } from "@/muiStyles";
import { removePerson } from "@/serverActions";
import { getPersons } from "@/queries";
import { Box, Button, Typography } from "@mui/material";

async function handleSubmit(data: FormData) {
  "use server";
  await removePerson(data);
  redirect("/");
}

export default async function Page() {
  const persons = await getPersons();
  return (
    <>
      <Box sx={headerStyles}>
        <Typography variant="h4">Remove Person</Typography>
      </Box>

      <Box sx={formStyles} component="form" action={handleSubmit as never} method="POST">
        <Box sx={{ pl: 1, mb: 1 }}>
          {persons.map((p) => (
            <RemovePersonCheckBoxList key={p.id} {...p} />
          ))}
        </Box>

        <Box display="flex" gap={1} justifyContent="flex-end">
          <Button component={Link} href=".." sx={smallButtonStyles}>Cancel</Button>
          <Button type="submit" sx={smallButtonStyles}>Remove</Button>
        </Box>
      </Box>
    </>
  );
}
