import { z } from "zod";
import { MAX_NAME_LENGTH, MAX_EMAIL_LENGTH, MAX_POSITION_LENGTH } from "@/schemas/shared";

export const CsvPersonImportRowSchema = z.object({
  name: z.string().min(1, "Name is required").max(MAX_NAME_LENGTH),
  email: z.string().email("Invalid email format").max(MAX_EMAIL_LENGTH),
  position: z.string().max(MAX_POSITION_LENGTH).optional(),
});

export type CsvPersonImportRow = z.infer<typeof CsvPersonImportRowSchema>;

export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_FILE_SIZE = 1024 * 1024; // 1 MB
export const MAX_EXPORT_ROWS = 10000;
