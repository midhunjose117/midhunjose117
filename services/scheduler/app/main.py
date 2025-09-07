from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import os


class HealthResponse(BaseModel):
    status: str


class Event(BaseModel):
    title: str | None = None
    start: str | None = None
    end: str | None = None
    location: str | None = None


class PlanWeekRequest(BaseModel):
    preferences: Dict[str, Any] = {}
    events: List[Event] = []


app = FastAPI(title="AI Calendar Assistant - Scheduler")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz", response_model=HealthResponse)
async def healthz():
    return HealthResponse(status="ok")


@app.post("/plan-week")
async def plan_week(req: PlanWeekRequest):
    work_hours = req.preferences.get("work_hours", ["09:00", "17:00"])
    response = {
        "work_hours": work_hours,
        "input_events": [e.dict() for e in req.events],
        "proposed_events": [],
        "travel_time_provider": os.getenv("MAPS_PROVIDER", "none"),
    }
    return response

