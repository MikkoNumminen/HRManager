import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
import { formStyles, headerStyles, smallButtonStyles, textFieldStyles } from "@/muiStyles";
import { updateEmail } from "@/features/persons/actions";
import { getPersons } from "@/features/persons/queries";
import { Box, Button, TextField, Typography } from "@mui/material";
import { RemovePersonCheckBoxList } from "@/features/persons/components/RemovePersonCheckBoxList";

async function handleSubmit(data: FormData) {
  "use server";
  await updateEmail(data);
  redirect("/");
}

export default async function Page() {
  const persons = await getPersons();
  return (
    <>
      <Box sx={headerStyles}>
        <Typography variant="h4">Change Email</Typography>
      </Box>

      <form action={handleSubmit} style={{ display: "contents" }}>
        <Box sx={formStyles}>
          <Box sx={{ pl: 1, mb: 1 }}>
            {persons.map((p) => (
              <RemovePersonCheckBoxList key={p.id} {...p} />
            ))}
          </Box>
          <Box display="flex" gap={1} justifyContent="flex-end">
            <TextField
              name="name"
              label="New Email"
              type="email"
              size="small"
              sx={{ ...textFieldStyles, flexGrow: 1 }}
            />
            <Button href=".." sx={smallButtonStyles}>
              Cancel
            </Button>
            <Button type="submit" sx={smallButtonStyles}>
              Change
            </Button>
          </Box>
        </Box>
      </form>
    </>
  );
}
