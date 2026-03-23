import { CsvPersonImportRowSchema, CsvPersonImportRow } from "@/schemas";

export interface CsvValidationError {
  row: number;
  field: string;
  message: string;
}

export interface CsvValidationResult {
  valid: CsvPersonImportRow[];
  errors: CsvValidationError[];
  skipped: number;
}

/**
 * RFC 4180 CSV parser. Handles quoted fields, escaped double-quotes,
 * embedded commas/newlines, BOM stripping, and Windows line endings.
 */
export function parseCSV(text: string): string[][] {
  // Strip UTF-8 BOM if present
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (input.trim().length === 0) return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped double-quote
        if (i + 1 < input.length && input[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        field += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ",") {
        row.push(field);
        field = "";
        i++;
      } else if (char === "\r") {
        // Handle \r\n or lone \r
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i++;
        if (i < input.length && input[i] === "\n") i++;
      } else if (char === "\n") {
        row.push(field);
        field = "";
        rows.push(row);
        row = [];
        i++;
      } else {
        field += char;
        i++;
      }
    }
  }

  // Push last field and row (if there's content)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Generate RFC 4180 CSV string from headers and rows.
 * Escapes fields containing commas, quotes, or newlines.
 */
export function generateCSV(headers: string[], rows: string[][]): string {
  const escapeField = (value: string): string => {
    if (
      value.includes(",") ||
      value.includes('"') ||
      value.includes("\n") ||
      value.includes("\r")
    ) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  };

  const lines = [headers.map(escapeField).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeField).join(","));
  }
  return lines.join("\n") + "\n";
}

/**
 * Validate parsed CSV rows against the Person import schema.
 * Checks for duplicate emails within the file and against existing DB emails.
 */
export function validatePersonImportRows(
  rows: string[][],
  existingEmails: Set<string>,
): CsvValidationResult {
  if (rows.length === 0) return { valid: [], errors: [], skipped: 0 };

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf("name");
  const emailIdx = headers.indexOf("email");
  const positionIdx = headers.indexOf("position");

  const errors: CsvValidationError[] = [];

  if (nameIdx === -1) {
    errors.push({ row: 1, field: "header", message: "Missing required 'name' column" });
  }
  if (emailIdx === -1) {
    errors.push({ row: 1, field: "header", message: "Missing required 'email' column" });
  }
  if (errors.length > 0) return { valid: [], errors, skipped: 0 };

  const valid: CsvPersonImportRow[] = [];
  const seenEmails = new Set<string>();
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1; // 1-indexed, header is row 1

    // Skip empty rows
    if (row.every((cell) => cell.trim() === "")) continue;

    const name = row[nameIdx]?.trim() ?? "";
    const email = row[emailIdx]?.trim() ?? "";
    const position = positionIdx !== -1 ? row[positionIdx]?.trim() || undefined : undefined;

    const result = CsvPersonImportRowSchema.safeParse({ name, email, position });

    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          row: rowNum,
          field: issue.path[0]?.toString() ?? "unknown",
          message: issue.message,
        });
      }
      continue;
    }

    const emailLower = email.toLowerCase();

    // Check for duplicates within the CSV
    if (seenEmails.has(emailLower)) {
      errors.push({
        row: rowNum,
        field: "email",
        message: `Duplicate email in CSV: ${email}`,
      });
      continue;
    }

    // Check for existing emails in DB — skip, don't error
    if (existingEmails.has(emailLower)) {
      skipped++;
      continue;
    }

    seenEmails.add(emailLower);
    valid.push(result.data);
  }

  return { valid, errors, skipped };
}
