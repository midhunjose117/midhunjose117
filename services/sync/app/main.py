from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import aiohttp
from fastapi.middleware.cors import CORSMiddleware
import uuid
from icalendar import Calendar, Event as IcsEvent


class HealthResponse(BaseModel):
    status: str


app = FastAPI(title="AI Calendar Assistant - Sync")
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


@app.get("/calendars")
async def list_calendars():
    base_url = os.getenv("NEXTCLOUD_BASE_URL")
    username = os.getenv("NEXTCLOUD_USERNAME")
    password = os.getenv("NEXTCLOUD_PASSWORD")
    caldav_path = os.getenv("NEXTCLOUD_CALDAV_PATH", "/remote.php/dav/calendars/")

    if not base_url or not username or not password:
        # Return stubbed list to allow local dev without Nextcloud
        return {"calendars": [{"name": "Personal", "url": "stub://personal"}]}

    url = f"{base_url.rstrip('/')}{caldav_path}"

    async with aiohttp.ClientSession() as session:
        async with session.request("PROPFIND", url, auth=aiohttp.BasicAuth(username, password), headers={"Depth": "1"}) as resp:
            if resp.status >= 400:
                raise HTTPException(status_code=resp.status, detail="Nextcloud CalDAV error")
            # For MVP, return raw text; in future parse XML multistatus
            text = await resp.text()
            return {"raw": text}


class CreateEventRequest(BaseModel):
    title: str
    start: str  # ISO8601
    end: str    # ISO8601
    location: str | None = None
    description: str | None = None


@app.post("/events")
async def create_event(req: CreateEventRequest):
    base_url = os.getenv("NEXTCLOUD_BASE_URL")
    username = os.getenv("NEXTCLOUD_USERNAME")
    password = os.getenv("NEXTCLOUD_PASSWORD")
    caldav_path = os.getenv("NEXTCLOUD_CALDAV_PATH", "/remote.php/dav/calendars/")
    default_calendar = os.getenv("NEXTCLOUD_DEFAULT_CALENDAR", "personal/")

    if not base_url or not username or not password:
        return {"status": "stub", "id": str(uuid.uuid4())}

    event_uid = str(uuid.uuid4())

    cal = Calendar()
    cal.add('prodid', '-//AI Calendar Assistant//EN')
    cal.add('version', '2.0')

    ics_event = IcsEvent()
    ics_event.add('uid', event_uid)
    ics_event.add('summary', req.title)
    ics_event.add('dtstart', req.start)
    ics_event.add('dtend', req.end)
    if req.location:
        ics_event.add('location', req.location)
    if req.description:
        ics_event.add('description', req.description)
    cal.add_component(ics_event)

    ics_bytes = cal.to_ical()
    url = f"{base_url.rstrip('/')}{caldav_path}{default_calendar}{event_uid}.ics"

    async with aiohttp.ClientSession() as session:
        async with session.put(url, auth=aiohttp.BasicAuth(username, password), data=ics_bytes, headers={"Content-Type": "text/calendar"}) as resp:
            if resp.status >= 400:
                raise HTTPException(status_code=resp.status, detail="Failed to create event")
            return {"id": event_uid, "status": "created"}


@app.delete("/events/{event_id}")
async def delete_event(event_id: str):
    base_url = os.getenv("NEXTCLOUD_BASE_URL")
    username = os.getenv("NEXTCLOUD_USERNAME")
    password = os.getenv("NEXTCLOUD_PASSWORD")
    caldav_path = os.getenv("NEXTCLOUD_CALDAV_PATH", "/remote.php/dav/calendars/")
    default_calendar = os.getenv("NEXTCLOUD_DEFAULT_CALENDAR", "personal/")

    if not base_url or not username or not password:
        return {"status": "stub", "id": event_id}

    url = f"{base_url.rstrip('/')}{caldav_path}{default_calendar}{event_id}.ics"
    async with aiohttp.ClientSession() as session:
        async with session.delete(url, auth=aiohttp.BasicAuth(username, password)) as resp:
            if resp.status >= 400:
                raise HTTPException(status_code=resp.status, detail="Failed to delete event")
            return {"id": event_id, "status": "deleted"}

