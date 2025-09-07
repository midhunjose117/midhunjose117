import express from "express";
import axios from "axios";
import { ScheduleIntentSchema } from "@ai-calendar/shared";

const app = express();
app.use(express.json());

const port = Number(process.env.PORT || 8080);
const nlpUrl = process.env.NLP_SERVICE_URL || "http://localhost:3001";
const nextcloudSyncUrl = process.env.NEXTCLOUD_SYNC_URL || "http://localhost:3002";
const travelUrl = process.env.TRAVEL_SERVICE_URL || "http://localhost:3003";

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/ingest", async (req, res) => {
  try {
    const { text, timezone } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    const nlp = await axios.post(`${nlpUrl}/parse`, { text, timezone });
    const intentParse = ScheduleIntentSchema.safeParse(nlp.data);
    if (!intentParse.success) {
      return res.status(400).json({ error: "Invalid intent from NLP", details: intentParse.error.flatten() });
    }

    const intent = intentParse.data;

    // Travel estimation if location present and user has a default origin
    let travelMinutes: number | undefined = undefined;
    if (intent.location && req.body.origin) {
      const travel = await axios.post(`${travelUrl}/estimate`, {
        origin: req.body.origin,
        destination: intent.location,
        mode: req.body.mode || "driving"
      });
      travelMinutes = Number(travel.data?.minutes);
    }

    const created = await axios.post(`${nextcloudSyncUrl}/events`, {
      ...intent,
      travelMinutes
    });

    res.json({ created: created.data });
  } catch (err: any) {
    const status = err?.response?.status || 500;
    res.status(status).json({ error: err?.message || "Server error" });
  }
});

app.listen(port, () => {
  console.log(`api-gateway listening on :${port}`);
});

