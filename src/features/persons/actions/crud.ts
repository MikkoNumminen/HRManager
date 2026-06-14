"use server";
// Person field CRUD: create a person, rename, and update job position.
import { revalidatePath } from "next/cache";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import {
  MAX_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_POSITION_LENGTH,
  EmailSchema,
} from "@/schemas/shared";
import { validateUUID, type ActionResult } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";
import { invalidateDashboardCache } from "@/lib/cacheInvalidation";

export const createPerson: (data: FormData) => Promise<ActionResult> = guardedAction(
  "person:create",
  "createPerson",
  async (t, data: FormData) => {
    const name = data.get("name")?.valueOf();
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new ActionError("invalidName", t("invalidName"));
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const email = data.get("email")?.valueOf();
    if (typeof email !== "string" || email.trim().length === 0) {
      throw new ActionError("emailRequired", t("emailRequired"));
    }
    if (email.trim().length > MAX_EMAIL_LENGTH) {
      throw new ActionError("emailTooLong", t("emailTooLong", { max: MAX_EMAIL_LENGTH }));
    }
    if (!EmailSchema.safeParse(email).success) {
      throw new ActionError("invalidEmailFormat", t("invalidEmailFormat"));
    }
    // Store canonically (lowercase) and de-duplicate case-insensitively, matching
    // the CSV importer — "John@x.com" and "john@x.com" must not both be created.
    const normalizedEmail = email.trim().toLowerCase();

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const existingPerson = await tx.person.findFirst({
        where: {
          email: { equals: normalizedEmail, mode: "insensitive" },
          deletedAt: null,
          sessionId,
        },
      });
      if (existingPerson) {
        throw new ActionError("emailAlreadyExists", t("emailAlreadyExists"));
      }

      const person = await tx.person.create({
        data: {
          name: name.trim(),
          position: null,
          email: normalizedEmail,
          sessionId,
        },
      });
      addAudit({
        action: "create",
        entityType: "person",
        entityId: person.id,
        after: { name: person.name, email: person.email },
      });
    });
    revalidatePath("/managePersons");
    revalidatePath("/");
    invalidateDashboardCache();
  },
);

export const updatePersonName: (data: FormData) => Promise<ActionResult> = guardedAction(
  "person:update_name",
  "updatePersonName",
  async (t, data: FormData) => {
    const personID = data.get("personID")?.toString();
    if (!personID) {
      throw new ActionError("noPersonProvided", t("noPersonProvided"));
    }
    validateUUID(personID, "personID");

    const newName = data.get("name")?.toString().trim();
    if (!newName) {
      throw new ActionError("newNameRequired", t("newNameRequired"));
    }
    if (newName.length > MAX_NAME_LENGTH) {
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const personBefore = await tx.person.findFirst({
        where: { id: personID, deletedAt: null, sessionId },
      });
      if (!personBefore) {
        throw new ActionError("personNotFound", t("personNotFound"));
      }
      await tx.person.updateMany({
        where: { id: personID, deletedAt: null, sessionId },
        data: { name: newName },
      });
      addAudit({
        action: "update",
        entityType: "person",
        entityId: personID,
        before: { name: personBefore.name },
        after: { name: newName },
      });
    });
    revalidatePath("/managePersons");
    revalidatePath("/");
    invalidateDashboardCache();
  },
);

export const updatePosition: (data: FormData) => Promise<ActionResult> = guardedAction(
  "person:update_position",
  "updatePosition",
  async (t, data: FormData) => {
    const personID = data.get("personID")?.toString();
    if (!personID) {
      throw new ActionError("noPersonProvided", t("noPersonProvided"));
    }
    validateUUID(personID, "personID");

    const newPosition = (data.get("position") ?? data.get("name"))?.toString().trim();
    if (!newPosition) {
      throw new ActionError("positionRequired", t("positionRequired"));
    }
    if (newPosition.length > MAX_POSITION_LENGTH) {
      throw new ActionError("positionTooLong", t("positionTooLong", { max: MAX_POSITION_LENGTH }));
    }

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const personBefore = await tx.person.findFirst({
        where: { id: personID, deletedAt: null, sessionId },
      });
      if (!personBefore) {
        throw new ActionError("personNotFound", t("personNotFound"));
      }
      await tx.person.updateMany({
        where: { id: personID, deletedAt: null, sessionId },
        data: { position: newPosition },
      });
      // Sync position name into the catalog
      const existingPos = await tx.position.findFirst({
        where: { name: newPosition, sessionId, deletedAt: null },
      });
      if (!existingPos) {
        await tx.position.create({ data: { name: newPosition, sessionId } });
      }
      addAudit({
        action: "update",
        entityType: "person",
        entityId: personID,
        before: { position: personBefore.position },
        after: { position: newPosition },
      });
    });
    revalidatePath("/managePersons");
    revalidatePath("/positions");
    revalidatePath("/");
    invalidateDashboardCache();
  },
);
