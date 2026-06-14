"use server";
// Person email updates: case-insensitive de-duplication against existing people.
import { revalidatePath } from "next/cache";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { MAX_EMAIL_LENGTH, EmailSchema } from "@/schemas/shared";
import { validateUUID, type ActionResult } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";

export const updateEmail: (data: FormData) => Promise<ActionResult> = guardedAction(
  "person:update_email",
  "updateEmail",
  async (t, data: FormData) => {
    const personID = data.get("personID")?.toString();
    if (!personID) {
      throw new ActionError("noPersonSelected", t("noPersonSelected"));
    }
    validateUUID(personID, "personID");

    const newEmail = (data.get("email") ?? data.get("name"))?.toString().trim().toLowerCase();
    if (!newEmail) {
      throw new ActionError("newEmailRequired", t("newEmailRequired"));
    }
    if (newEmail.length > MAX_EMAIL_LENGTH) {
      throw new ActionError("emailTooLong", t("emailTooLong", { max: MAX_EMAIL_LENGTH }));
    }
    if (!EmailSchema.safeParse(newEmail).success) {
      throw new ActionError("invalidEmailFormat", t("invalidEmailFormat"));
    }

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const existingPerson = await tx.person.findFirst({
        where: {
          email: { equals: newEmail, mode: "insensitive" },
          deletedAt: null,
          sessionId,
        },
      });
      if (existingPerson && existingPerson.id !== personID) {
        throw new ActionError("emailAlreadyExists", t("emailAlreadyExists"));
      }

      const personBefore = await tx.person.findFirst({
        where: { id: personID, deletedAt: null, sessionId },
      });
      if (!personBefore) {
        throw new ActionError("personNotFound", t("personNotFound"));
      }
      await tx.person.updateMany({
        where: { id: personID, deletedAt: null, sessionId },
        data: { email: newEmail },
      });
      addAudit({
        action: "update",
        entityType: "person",
        entityId: personID,
        before: { email: personBefore.email },
        after: { email: newEmail },
      });
    });
    revalidatePath("/managePersons");
  },
);
