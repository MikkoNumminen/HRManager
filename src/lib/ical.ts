// Generate iCalendar (RFC 5545) content for leave requests.
// No external dependencies — generates the .ics format directly.

interface CalendarEvent {
  uid: string;
  summary: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  createdAt?: Date;
}

// Format date as iCal DATE value (YYYYMMDD) for all-day events.
function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

// Format date as iCal DATETIME value (YYYYMMDDTHHMMSSZ).
function formatDateTime(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

// Escape special characters in iCal text values.
function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// Fold long lines per RFC 5545 (max 75 octets per line).
function foldLine(line: string): string {
  const maxLen = 75;
  if (line.length <= maxLen) return line;
  const parts = [line.slice(0, maxLen)];
  let pos = maxLen;
  while (pos < line.length) {
    parts.push(" " + line.slice(pos, pos + maxLen - 1));
    pos += maxLen - 1;
  }
  return parts.join("\r\n");
}

export function generateICS(
  events: CalendarEvent[],
  calendarName: string = "Leave Calendar",
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HRManager//Leave Calendar//EN",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    // Add 1 day to endDate because iCal DTEND for VALUE=DATE is exclusive
    const endDateExclusive = new Date(event.endDate);
    endDateExclusive.setUTCDate(endDateExclusive.getUTCDate() + 1);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTART;VALUE=DATE:${formatDate(event.startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${formatDate(endDateExclusive)}`);
    lines.push(`SUMMARY:${escapeText(event.summary)}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    }
    if (event.createdAt) {
      lines.push(`DTSTAMP:${formatDateTime(event.createdAt)}`);
    } else {
      lines.push(`DTSTAMP:${formatDateTime(new Date())}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
