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
});
