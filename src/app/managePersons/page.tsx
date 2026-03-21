import { Box, Typography } from "@mui/material";
import PersonTable from "@/components/EditablePersonsTable";
import AddPersonForm from "@/components/AddPeople";
import TopBar from "@/components/TopBar";
import { colors } from "@/muiStyles";
import { getPersons } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function ManagePersonsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  const canManagePersons =
    permissions["person:create"] ||
    permissions["person:delete"] ||
    permissions["person:update_position"] ||
    permissions["person:update_email"];
  if (!canManagePersons) redirect("/");

  const persons = await getPersons();
  const t = await getTranslations("persons");

  return (
    <>
      <TopBar title={t("manageTitle")} backHref="/" permissions={permissions} />
      {permissions["person:create"] && <AddPersonForm />}
      <Box
        sx={{
          border: `1px solid ${colors.slate300}`,
          borderRadius: "4px",
          padding: { xs: "12px", sm: "20px" },
        }}
      >
        <Typography variant="h6" mb={1}>
          {t("heading")}
        </Typography>
        <PersonTable persons={persons} />
      </Box>
    </>
  );
}
