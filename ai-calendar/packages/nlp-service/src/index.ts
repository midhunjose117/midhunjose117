import express from "express";
import OpenAI from "openai";
import { ScheduleIntentSchema } from "@ai-calendar/shared";

const app = express();
app.use(express.json());

const port = Number(process.env.PORT || 3001);
const openaiApiKey = process.env.OPENAI_API_KEY;

const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : undefined;

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/parse", async (req, res) => {
  try {
    const { text, timezone } = req.body || {};
    if (!text) return res.status(400).json({ error: "Missing text" });

    // Minimal MVP: If OPENAI_API_KEY missing, echo back a naive parse
    if (!openai) {
      const naive = { title: text, start: new Date().toISOString() };
      return res.json(naive);
    }

    const system = `You convert user scheduling requests into a JSON object with fields: title, start (ISO), optional end (ISO), optional durationMinutes (number), optional location (string), optional notes (string), optional attendees (array of emails). Respond with ONLY minified JSON.`;

    const user = `Text: ${text}\nTimezone: ${timezone || "UTC"}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const content = completion.choices?.[0]?.message?.content || "{}";
    const json = JSON.parse(content);
    const parsed = ScheduleIntentSchema.safeParse(json);
    if (!parsed.success) {
      return res.status(400).json({ error: "Bad parse", details: parsed.error.flatten() });
    }
    res.json(parsed.data);
  } catch (err: any) {
    const status = err?.response?.status || 500;
    res.status(status).json({ error: err?.message || "Server error" });
  }
});

app.listen(port, () => {
  console.log(`nlp-service listening on :${port}`);
});

