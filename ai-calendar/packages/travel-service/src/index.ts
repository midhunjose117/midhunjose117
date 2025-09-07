import express from "express";
import axios from "axios";
import { TravelQuerySchema } from "@ai-calendar/shared";

const app = express();
app.use(express.json());

const port = Number(process.env.PORT || 3003);
const orsApiKey = process.env.ORS_API_KEY || "";

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/estimate", async (req, res) => {
  try {
    const parse = TravelQuerySchema.safeParse(req.body || {});
    if (!parse.success) return res.status(400).json({ error: "Bad request" });
    const { origin, destination, mode } = parse.data;

    if (!orsApiKey) {
      // Fallback: naive estimate
      return res.json({ minutes: 15 });
    }

    // For simplicity we allow string addresses and delegate geocoding to ORS; for production, use proper geocoding first
    const profile = mode === "walking" ? "foot-walking" : mode === "cycling" ? "cycling-regular" : "driving-car";

    const url = `https://api.openrouteservice.org/v2/directions/${profile}`;
    const body = {
      coordinates: [origin, destination]
    };

    const r = await axios.post(url, body, {
      headers: { Authorization: orsApiKey, "Content-Type": "application/json" }
    });
    const seconds = r.data?.features?.[0]?.properties?.summary?.duration || 0;
    const minutes = Math.round(Number(seconds) / 60);
    res.json({ minutes });
  } catch (err: any) {
    const status = err?.response?.status || 500;
    res.status(status).json({ error: err?.message || "Server error" });
  }
});

app.listen(port, () => {
  console.log(`travel-service listening on :${port}`);
});

