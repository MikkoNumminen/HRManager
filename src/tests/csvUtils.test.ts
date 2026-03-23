import { parseCSV, generateCSV, validatePersonImportRows } from "../csvUtils";

describe("parseCSV", () => {
  // Returns empty array for empty input
  test("returns empty array for empty string", () => {
    expect(parseCSV("")).toEqual([]);
  });

  // Returns empty array for whitespace-only input
  test("returns empty array for whitespace-only input", () => {
    expect(parseCSV("   \n  ")).toEqual([]);
  });

  // Parses a single row with no newline
  test("parses single row without trailing newline", () => {
    expect(parseCSV("a,b,c")).toEqual([["a", "b", "c"]]);
  });

  // Parses multiple rows
  test("parses multiple rows", () => {
    const result = parseCSV("name,email\nAlice,alice@test.com\nBob,bob@test.com");
    expect(result).toEqual([
      ["name", "email"],
      ["Alice", "alice@test.com"],
      ["Bob", "bob@test.com"],
    ]);
  });

  // Handles trailing newline (should not produce extra empty row)
  test("handles trailing newline", () => {
    const result = parseCSV("a,b\nc,d\n");
    expect(result).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  // Handles Windows CRLF line endings
  test("handles CRLF line endings", () => {
    const result = parseCSV("a,b\r\nc,d\r\n");
    expect(result).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  // Handles lone CR line endings
  test("handles lone CR line endings", () => {
    const result = parseCSV("a,b\rc,d\r");
    expect(result).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  // Strips UTF-8 BOM
  test("strips UTF-8 BOM", () => {
    const bom = "\uFEFF";
    const result = parseCSV(bom + "name,email\nAlice,a@b.com");
    expect(result[0][0]).toBe("name");
  });

  // Handles quoted fields
  test("parses quoted fields", () => {
    const result = parseCSV('"Alice Johnson","alice@test.com"');
    expect(result).toEqual([["Alice Johnson", "alice@test.com"]]);
  });

  // Handles commas inside quoted fields
  test("handles commas inside quoted fields", () => {
    const result = parseCSV('"Last, First",email');
    expect(result).toEqual([["Last, First", "email"]]);
  });

  // Handles escaped double-quotes inside quoted fields
  test("handles escaped double-quotes", () => {
    const result = parseCSV('"She said ""hello""",value');
    expect(result).toEqual([['She said "hello"', "value"]]);
  });

  // Handles newlines inside quoted fields
  test("handles newlines inside quoted fields", () => {
    const result = parseCSV('"line1\nline2",value');
    expect(result).toEqual([["line1\nline2", "value"]]);
  });

  // Handles empty fields
  test("handles empty fields", () => {
    const result = parseCSV("a,,c");
    expect(result).toEqual([["a", "", "c"]]);
  });

  // Handles single field row
  test("handles single field per row", () => {
    const result = parseCSV("hello\nworld");
    expect(result).toEqual([["hello"], ["world"]]);
  });
});

describe("generateCSV", () => {
  // Generates CSV with headers only
  test("generates headers only when no data rows", () => {
    const result = generateCSV(["name", "email"], []);
    expect(result).toBe("name,email\n");
  });

  // Generates CSV with simple data
  test("generates CSV with simple data", () => {
    const result = generateCSV(["name", "email"], [["Alice", "alice@test.com"]]);
    expect(result).toBe("name,email\nAlice,alice@test.com\n");
  });

  // Escapes fields with commas
  test("escapes fields containing commas", () => {
    const result = generateCSV(["name"], [["Last, First"]]);
    expect(result).toBe('name\n"Last, First"\n');
  });

  // Escapes fields with double-quotes
  test("escapes fields containing double-quotes", () => {
    const result = generateCSV(["name"], [['She said "hello"']]);
    expect(result).toBe('name\n"She said ""hello"""\n');
  });

  // Escapes fields with newlines
  test("escapes fields containing newlines", () => {
    const result = generateCSV(["desc"], [["line1\nline2"]]);
    expect(result).toBe('desc\n"line1\nline2"\n');
  });

  // Escapes fields with carriage returns
  test("escapes fields containing carriage returns", () => {
    const result = generateCSV(["desc"], [["line1\rline2"]]);
    expect(result).toBe('desc\n"line1\rline2"\n');
  });

  // Handles empty string values
  test("handles empty string values", () => {
    const result = generateCSV(["a", "b"], [["", ""]]);
    expect(result).toBe("a,b\n,\n");
  });

  // Round-trips through parse and generate
  test("round-trips through parse → generate → parse", () => {
    const original = [
      ["name", "email", "position"],
      ["Alice Johnson", "alice@test.com", "Manager"],
      ['Bob "The Builder"', "bob@test.com", "Developer"],
      ["Carol, Jr.", "carol@test.com", ""],
    ];
    const csv = generateCSV(original[0], original.slice(1));
    const parsed = parseCSV(csv);
    expect(parsed).toEqual(original);
  });
});

describe("validatePersonImportRows", () => {
  // Returns empty result for empty input
  test("returns empty result for empty rows", () => {
    const result = validatePersonImportRows([], new Set());
    expect(result).toEqual({ valid: [], errors: [], skipped: 0 });
  });

  // Errors on missing name header
  test("errors on missing name header", () => {
    const rows = [["email", "position"]];
    const result = validatePersonImportRows(rows, new Set());
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("name");
  });

  // Errors on missing email header
  test("errors on missing email header", () => {
    const rows = [["name", "position"]];
    const result = validatePersonImportRows(rows, new Set());
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("email");
  });

  // Errors on missing both headers
  test("errors on missing both name and email headers", () => {
    const rows = [["position", "department"]];
    const result = validatePersonImportRows(rows, new Set());
    expect(result.errors).toHaveLength(2);
  });

  // Successfully validates valid rows
  test("validates valid rows", () => {
    const rows = [
      ["name", "email", "position"],
      ["Alice", "alice@test.com", "Manager"],
      ["Bob", "bob@test.com", "Developer"],
    ];
    const result = validatePersonImportRows(rows, new Set());
    expect(result.valid).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.skipped).toBe(0);
  });

  // Skips empty rows
  test("skips completely empty rows", () => {
    const rows = [
      ["name", "email"],
      ["Alice", "alice@test.com"],
      ["", ""],
      ["Bob", "bob@test.com"],
    ];
    const result = validatePersonImportRows(rows, new Set());
    expect(result.valid).toHaveLength(2);
  });

  // Errors on missing name in a row
  test("errors on empty name", () => {
    const rows = [
      ["name", "email"],
      ["", "alice@test.com"],
    ];
    const result = validatePersonImportRows(rows, new Set());
    expect(result.valid).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(2);
    expect(result.errors[0].field).toBe("name");
  });

  // Errors on invalid email format
  test("errors on invalid email format", () => {
    const rows = [
      ["name", "email"],
      ["Alice", "not-an-email"],
    ];
    const result = validatePersonImportRows(rows, new Set());
    expect(result.valid).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe("email");
  });

  // Detects duplicate emails within the CSV
  test("detects duplicate emails within CSV", () => {
    const rows = [
      ["name", "email"],
      ["Alice", "alice@test.com"],
      ["Alice Copy", "alice@test.com"],
    ];
    const result = validatePersonImportRows(rows, new Set());
    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Duplicate email");
  });

  // Duplicate email check is case-insensitive
  test("duplicate email check is case-insensitive", () => {
    const rows = [
      ["name", "email"],
      ["Alice", "Alice@Test.com"],
      ["Alice2", "alice@test.com"],
    ];
    const result = validatePersonImportRows(rows, new Set());
    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
  });

  // Skips rows whose email already exists in DB
  test("skips existing emails from database", () => {
    const rows = [
      ["name", "email"],
      ["Alice", "alice@test.com"],
      ["Bob", "bob@test.com"],
    ];
    const existing = new Set(["alice@test.com"]);
    const result = validatePersonImportRows(rows, existing);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].name).toBe("Bob");
    expect(result.skipped).toBe(1);
  });

  // Handles position as optional
  test("handles rows without position column", () => {
    const rows = [
      ["name", "email"],
      ["Alice", "alice@test.com"],
    ];
    const result = validatePersonImportRows(rows, new Set());
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].position).toBeUndefined();
  });

  // Handles position column present with value
  test("handles position column with value", () => {
    const rows = [
      ["name", "email", "position"],
      ["Alice", "alice@test.com", "Manager"],
    ];
    const result = validatePersonImportRows(rows, new Set());
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].position).toBe("Manager");
  });

  // Handles position column present but empty
  test("handles position column with empty value", () => {
    const rows = [
      ["name", "email", "position"],
      ["Alice", "alice@test.com", ""],
    ];
    const result = validatePersonImportRows(rows, new Set());
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].position).toBeUndefined();
  });

  // Headers are case-insensitive
  test("headers are case-insensitive", () => {
    const rows = [
      ["Name", "EMAIL", "Position"],
      ["Alice", "alice@test.com", "Manager"],
    ];
    const result = validatePersonImportRows(rows, new Set());
    expect(result.valid).toHaveLength(1);
  });

  // Trims whitespace from values
  test("trims whitespace from values", () => {
    const rows = [
      ["name", "email", "position"],
      ["  Alice  ", "  alice@test.com  ", "  Manager  "],
    ];
    const result = validatePersonImportRows(rows, new Set());
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].name).toBe("Alice");
    expect(result.valid[0].email).toBe("alice@test.com");
    expect(result.valid[0].position).toBe("Manager");
  });

  // Mix of valid, invalid, and skipped rows
  test("handles mix of valid, invalid, and skipped rows", () => {
    const rows = [
      ["name", "email"],
      ["Alice", "alice@test.com"],
      ["", "invalid"],
      ["Bob", "bob@test.com"],
      ["Carol", "carol@test.com"],
    ];
    const existing = new Set(["carol@test.com"]);
    const result = validatePersonImportRows(rows, existing);
    expect(result.valid).toHaveLength(2);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.skipped).toBe(1);
  });
});
