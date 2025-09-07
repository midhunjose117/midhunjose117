from fastapi import FastAPI, HTTPException
from fastapi.routing import APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import httpx


class HealthResponse(BaseModel):
    status: str


class ParseRequest(BaseModel):
    text: str


class PlanWeekRequest(BaseModel):
    preferences: dict
    events: list


app = FastAPI(title="AI Calendar Assistant - Gateway")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
router = APIRouter()


@router.get("/healthz", response_model=HealthResponse)
async def healthz():
    return HealthResponse(status="ok")


@router.post("/nlp/parse")
async def parse_text(req: ParseRequest):
    nlp_host = os.getenv("NLP_HOST", "nlp")
    nlp_port = os.getenv("NLP_PORT", "8001")
    url = f"http://{nlp_host}:{nlp_port}/parse"
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(url, json=req.dict())
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="NLP service error")
        return r.json()


@router.post("/scheduler/plan-week")
async def plan_week(req: PlanWeekRequest):
    scheduler_host = os.getenv("SCHEDULER_HOST", "scheduler")
    scheduler_port = os.getenv("SCHEDULER_PORT", "8002")
    url = f"http://{scheduler_host}:{scheduler_port}/plan-week"
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(url, json=req.dict())
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Scheduler service error")
        return r.json()


@router.get("/sync/calendars")
async def list_calendars():
    sync_host = os.getenv("SYNC_HOST", "sync")
    sync_port = os.getenv("SYNC_PORT", "8003")
    url = f"http://{sync_host}:{sync_port}/calendars"
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(url)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Sync service error")
        return r.json()


app.include_router(router)


class CreateEventRequest(BaseModel):
    title: str
    start: str
    end: str
    location: str | None = None
    description: str | None = None


@app.post("/sync/events")
async def create_event(req: CreateEventRequest):
    sync_host = os.getenv("SYNC_HOST", "sync")
    sync_port = os.getenv("SYNC_PORT", "8003")
    url = f"http://{sync_host}:{sync_port}/events"
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(url, json=req.dict())
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Sync service error")
        return r.json()


@app.delete("/sync/events/{event_id}")
async def delete_event(event_id: str):
    sync_host = os.getenv("SYNC_HOST", "sync")
    sync_port = os.getenv("SYNC_PORT", "8003")
    url = f"http://{sync_host}:{sync_port}/events/{event_id}"
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.delete(url)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Sync service error")
        return r.json()

