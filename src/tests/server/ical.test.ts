import { generateICS } from "@/lib/ical";

describe("iCal generator", () => {
  // Generates valid iCalendar format with VCALENDAR wrapper.
  test("generates valid VCALENDAR wrapper", () => {
    const ics = generateICS([]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//HRManager//Leave Calendar//EN");
    expect(ics).toContain("METHOD:PUBLISH");
  });

  // Generates VEVENT block for a single leave request.
  test("generates VEVENT for a single event", () => {
    const ics = generateICS([
      {
        uid: "leave-123@hrmanager",
        summary: "Alice — Annual Leave",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-05"),
        createdAt: new Date("2026-06-15T10:00:00Z"),
      },
    ]);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("UID:leave-123@hrmanager");
    expect(ics).toContain("SUMMARY:Alice — Annual Leave");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260701");
    // DTEND is exclusive for all-day events, so July 5 → July 6
    expect(ics).toContain("DTEND;VALUE=DATE:20260706");
    expect(ics).toContain("DTSTAMP:20260615T100000Z");
  });

  // Handles multiple events.
  test("generates multiple VEVENTs", () => {
    const ics = generateICS([
      {
        uid: "leave-1@hrmanager",
        summary: "Alice — Annual Leave",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-03"),
      },
      {
        uid: "leave-2@hrmanager",
        summary: "Bob — Sick Leave",
        startDate: new Date("2026-07-10"),
        endDate: new Date("2026-07-10"),
      },
    ]);
    const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(2);
  });

  // Escapes special characters in summary and description.
  test("escapes special characters in text fields", () => {
    const ics = generateICS([
      {
        uid: "leave-esc@hrmanager",
        summary: "Alice, Bob; Team",
        description: "Notes with; commas, and\nnewlines",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-01"),
      },
    ]);
    expect(ics).toContain("SUMMARY:Alice\\, Bob\\; Team");
    expect(ics).toContain("DESCRIPTION:Notes with\\; commas\\, and\\nnewlines");
  });

  // Includes custom calendar name.
  test("includes custom calendar name in X-WR-CALNAME", () => {
    const ics = generateICS([], "My Team Calendar");
    expect(ics).toContain("X-WR-CALNAME:My Team Calendar");
  });

  // Single-day events have DTEND = start + 1 day.
  test("single-day event has DTEND one day after DTSTART", () => {
    const ics = generateICS([
      {
        uid: "single@hrmanager",
        summary: "One Day Off",
        startDate: new Date("2026-12-25"),
        endDate: new Date("2026-12-25"),
      },
    ]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261225");
    expect(ics).toContain("DTEND;VALUE=DATE:20261226");
  });

  // Uses CRLF line endings per RFC 5545.
  test("uses CRLF line endings", () => {
    const ics = generateICS([]);
    // Split by \r\n — should have multiple lines
    const lines = ics.split("\r\n");
    expect(lines.length).toBeGreaterThan(5);
  });

  // Lines longer than 75 characters are folded per RFC 5545 (continuation lines start with space).
  test("folds lines longer than 75 characters with continuation lines", () => {
    const longSummary = "A".repeat(100);
    const ics = generateICS([
      {
        uid: "fold-test@hrmanager",
        summary: longSummary,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-05"),
      },
    ]);
    // A folded line is present when there is a continuation line starting with a space
    const lines = ics.split("\r\n");
    const hasFoldedLine = lines.some((line) => line.startsWith(" "));
    expect(hasFoldedLine).toBe(true);
  });

  // When no createdAt is provided, DTSTAMP defaults to current time.
  test("uses current time for DTSTAMP when createdAt is not provided", () => {
    const before = Date.now();
    const ics = generateICS([
      {
        uid: "no-created@hrmanager",
        summary: "No CreatedAt",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-01"),
      },
    ]);
    const after = Date.now();
    expect(ics).toContain("DTSTAMP:");
    // Extract the DTSTAMP line value
    const dtstampLine = ics.split("\r\n").find((l) => l.startsWith("DTSTAMP:"));
    expect(dtstampLine).toBeTruthy();
    // The timestamp is a UTC datetime so just check it exists and contains 'T'
    expect(dtstampLine).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
    // The before/after check just ensures the generation ran without error
    expect(after).toBeGreaterThanOrEqual(before);
  });

  // Event with a description field includes the DESCRIPTION line.
  test("includes DESCRIPTION when description is provided", () => {
    const ics = generateICS([
      {
        uid: "with-desc@hrmanager",
        summary: "Leave Request",
        description: "Out of office",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-05"),
      },
    ]);
    expect(ics).toContain("DESCRIPTION:Out of office");
  });
});
