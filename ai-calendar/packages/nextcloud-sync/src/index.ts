import express from "express";
import { createDAVClient } from "tsdav";

const app = express();
app.use(express.json());

const port = Number(process.env.PORT || 3002);
const baseUrl = process.env.NEXTCLOUD_URL || "";
const username = process.env.NEXTCLOUD_USERNAME || "";
const password = process.env.NEXTCLOUD_PASSWORD || "";
const calendarPath = process.env.NEXTCLOUD_CALENDAR_PATH; // optional

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/events", async (req, res) => {
  try {
    if (!baseUrl || !username || !password) {
      return res.status(500).json({ error: "Nextcloud credentials missing" });
    }

    const { title, start, end, durationMinutes, location, notes, attendees, travelMinutes } = req.body || {};
    if (!title || !start) return res.status(400).json({ error: "title and start required" });

    const dtStart = new Date(start);
    let dtEnd: Date | undefined = end ? new Date(end) : undefined;
    if (!dtEnd && durationMinutes) {
      dtEnd = new Date(dtStart.getTime() + Number(durationMinutes) * 60000);
    }

    // Add travel as an alarm relative to start (optional)
    const alarmMinutes = Number(travelMinutes) || undefined;

    const client = await createDAVClient({
      serverUrl: baseUrl,
      credentials: { username, password },
      authMethod: "Basic"
    });

    const calendars = await client.fetchCalendars();
    const calendar = calendarPath
      ? calendars.find(c => c.url?.includes(calendarPath)) || calendars[0]
      : calendars[0];
    if (!calendar) return res.status(500).json({ error: "No calendar found" });

    // Simple iCal content
    const uid = `${Date.now()}-${Math.random().toString(16).slice(2)}@ai-calendar`;
    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const dtstamp = formatDate(new Date());
    const dtstart = formatDate(dtStart);
    const dtend = dtEnd ? formatDate(dtEnd) : undefined;

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ai-calendar//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      dtend ? `DTEND:${dtend}` : undefined,
      `SUMMARY:${title}`,
      location ? `LOCATION:${location}` : undefined,
      notes ? `DESCRIPTION:${notes}` : undefined,
      ...((attendees || []) as string[]).map(a => `ATTENDEE;CN=${a}:mailto:${a}`),
      alarmMinutes ? "BEGIN:VALARM" : undefined,
      alarmMinutes ? `TRIGGER:-PT${alarmMinutes}M` : undefined,
      alarmMinutes ? "ACTION:DISPLAY" : undefined,
      alarmMinutes ? `DESCRIPTION:Travel time ${alarmMinutes}m` : undefined,
      alarmMinutes ? "END:VALARM" : undefined,
      "END:VEVENT",
      "END:VCALENDAR"
    ].filter(Boolean) as string[];

    const ical = lines.join("\r\n");

    const created = await client.createCalendarObject({
      calendar: calendar,
      filename: `${uid}.ics`,
      iCalString: ical
    });

    res.json({ ok: true, href: created.url || created.href || null, uid });
  } catch (err: any) {
    const status = err?.response?.status || 500;
    res.status(status).json({ error: err?.message || "Server error" });
  }
});

app.listen(port, () => {
  console.log(`nextcloud-sync listening on :${port}`);
});

