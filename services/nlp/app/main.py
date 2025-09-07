from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os


class HealthResponse(BaseModel):
    status: str


class ParseRequest(BaseModel):
    text: str


app = FastAPI(title="AI Calendar Assistant - NLP")
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


@app.post("/parse")
async def parse(req: ParseRequest):
    text = req.text.lower()
    # Very simple rule-based extraction to be replaced by LLM in future
    intent = "unknown"
    if any(k in text for k in ["schedule", "create", "add"]):
        intent = "create_event"
    elif any(k in text for k in ["reschedule", "move", "shift"]):
        intent = "reschedule_event"

    return {
        "intent": intent,
        "entities": {
            "raw_text": req.text
        },
        "provider": "rule-based",
        "model": os.getenv("OPENAI_MODEL", "none")
    }

