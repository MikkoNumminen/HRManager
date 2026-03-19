import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
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

      <form action={handleSubmit} style={{ display: "contents" }}>
        <Box sx={formStyles}>
          <Box sx={{ pl: 1, mb: 1 }}>
            {persons.map((p) => (
              <RemovePersonCheckBoxList key={p.id} {...p} />
            ))}
          </Box>

          <Box display="flex" gap={1} justifyContent="flex-end">
            <Button href=".." sx={smallButtonStyles}>
              Cancel
            </Button>
            <Button type="submit" sx={smallButtonStyles}>
              Remove
            </Button>
          </Box>
        </Box>
      </form>
    </>
  );
}
