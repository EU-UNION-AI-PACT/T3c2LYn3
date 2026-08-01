"""
Shine AI Ranking Portal - Backend
Aggregates AI tools from 1111 tracked ranking sources into a single Top-50 feed.
Refreshes daily at 08:44 Europe/Berlin. AI-enriched via Claude Sonnet 4.6.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz
import os
import logging
import uuid
import jwt
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager

from aggregators import (
    fetch_all_sources,
    rank_and_dedupe,
    generate_install_scripts,
    RANKING_SOURCES_CATALOG,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Config
mongo_url = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
ADMIN_USERNAME = os.environ["ADMIN_USERNAME"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

BERLIN = pytz.timezone("Europe/Berlin")

client = AsyncIOMotorClient(mongo_url)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("shine-portal")

scheduler = AsyncIOScheduler(timezone=BERLIN)


# ---- Auth ----
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def create_access_token(subject: str) -> str:
    payload = {
        "sub": subject,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_token(token: Optional[str]) -> str:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("sub", "")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_admin(token: Optional[str] = Depends(oauth2_scheme)) -> str:
    sub = verify_token(token)
    if sub != ADMIN_USERNAME:
        raise HTTPException(status_code=403, detail="Admin required")
    return sub


# ---- Models ----
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


class Tool(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rank: int
    name: str
    description: str = ""
    ai_summary_de: str = ""
    ai_summary_en: str = ""
    url: str
    repo: Optional[str] = None
    docker_image: Optional[str] = None
    source: str
    sources: List[str] = Field(default_factory=list)
    category: str = "general"
    language: str = ""
    score: float = 0
    normalized_score: float = 0
    validated: bool = False
    install_scripts: Dict[str, str] = Field(default_factory=dict)
    created_at: str = ""


class FeedSnapshot(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    generated_at: str
    generated_at_berlin: str
    tools_count: int
    sources_scanned: int
    sources_active: int
    total_catalog: int
    tools: List[Dict[str, Any]] = Field(default_factory=list)


# ---- AI Enrichment ----
async def enrich_with_llm(tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Add short DE + EN summaries for top tools via Claude Sonnet 4.6."""
    if not EMERGENT_LLM_KEY:
        return tools
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        for t in tools[:20]:  # only top 20 to save cost
            try:
                chat = LlmChat(
                    api_key=EMERGENT_LLM_KEY,
                    session_id=f"enrich-{t.get('name','')[:40]}",
                    system_message="You are a technical writer. Reply strictly in JSON: {\"de\": \"...\", \"en\": \"...\"}. Keep each summary under 140 chars.",
                ).with_model("anthropic", "claude-sonnet-4-6")
                prompt = f"Tool: {t.get('name','')}\nDescription: {t.get('description','')}\nCategory: {t.get('category','')}\nGenerate concise value proposition in German (de) and English (en). JSON only."
                resp = await chat.send_message(UserMessage(text=prompt))
                text = resp if isinstance(resp, str) else str(resp)
                import json as _json, re as _re
                m = _re.search(r"\{.*\}", text, _re.DOTALL)
                if m:
                    data = _json.loads(m.group(0))
                    t["ai_summary_de"] = (data.get("de") or "").strip()[:200]
                    t["ai_summary_en"] = (data.get("en") or "").strip()[:200]
            except Exception as e:
                logger.warning(f"LLM enrich failed for {t.get('name')}: {e}")
    except Exception as e:
        logger.error(f"LLM module load failed: {e}")
    return tools


async def validate_repos(tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Ping repo URLs and set validated flag."""
    import httpx
    async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as c:
        for t in tools:
            url = t.get("repo") or t.get("url") or ""
            try:
                r = await c.head(url)
                t["validated"] = r.status_code < 400
            except Exception:
                t["validated"] = False
    return tools


# ---- Refresh pipeline ----
async def refresh_feed() -> Dict[str, Any]:
    logger.info(">> Refresh feed pipeline started")
    raw = await fetch_all_sources()
    ranked = rank_and_dedupe(raw, top_n=50)
    for i, t in enumerate(ranked):
        t["rank"] = i + 1
        t["install_scripts"] = generate_install_scripts(t)
    ranked = await validate_repos(ranked)
    ranked = await enrich_with_llm(ranked)

    now_utc = datetime.now(timezone.utc)
    now_berlin = now_utc.astimezone(BERLIN)
    snapshot = {
        "id": str(uuid.uuid4()),
        "generated_at": now_utc.isoformat(),
        "generated_at_berlin": now_berlin.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "tools_count": len(ranked),
        "sources_scanned": sum(1 for s in RANKING_SOURCES_CATALOG if s.get("active")),
        "sources_active": sum(1 for s in RANKING_SOURCES_CATALOG if s.get("active")),
        "total_catalog": len(RANKING_SOURCES_CATALOG),
        "tools": ranked,
    }
    await db.snapshots.insert_one({**snapshot, "_snapshot_time": now_utc.isoformat()})
    # Keep only last 30 snapshots
    old = await db.snapshots.find({}, {"_id": 1}).sort("_snapshot_time", -1).skip(30).to_list(1000)
    if old:
        await db.snapshots.delete_many({"_id": {"$in": [o["_id"] for o in old]}})
    logger.info(f">> Refresh done: {len(ranked)} tools stored")
    return snapshot


async def get_latest_snapshot() -> Optional[Dict[str, Any]]:
    doc = await db.snapshots.find_one({}, sort=[("_snapshot_time", -1)])
    if not doc:
        return None
    doc.pop("_id", None)
    return doc


# ---- Lifespan ----
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    existing = await db.snapshots.count_documents({})
    if existing == 0:
        logger.info(">> No snapshot found — running initial refresh (background)")
        import asyncio as _a
        _a.create_task(refresh_feed())
    scheduler.add_job(
        refresh_feed,
        CronTrigger(hour=8, minute=44, timezone=BERLIN),
        id="daily_844_berlin",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(">> Scheduler started (daily 08:44 Europe/Berlin)")
    yield
    scheduler.shutdown(wait=False)
    client.close()


app = FastAPI(title="Shine AI Ranking Portal", lifespan=lifespan)
api = APIRouter(prefix="/api")


# ---- Routes ----
@api.get("/")
async def root():
    return {"service": "Shine AI Ranking Portal", "status": "ok"}


@api.post("/auth/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    if body.username != ADMIN_USERNAME or body.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(body.username)
    return TokenResponse(access_token=token, username=body.username)


@api.get("/auth/me")
async def me(user: str = Depends(require_admin)):
    return {"username": user}


@api.get("/feed/latest")
async def feed_latest():
    """Public — returns the latest Top-50 snapshot."""
    snap = await get_latest_snapshot()
    if not snap:
        return {"status": "empty", "message": "Feed is being generated. Please retry in ~30s."}
    return snap


@api.get("/feed/status")
async def feed_status():
    snap = await get_latest_snapshot()
    now_berlin = datetime.now(timezone.utc).astimezone(BERLIN)
    next_run = now_berlin.replace(hour=8, minute=44, second=0, microsecond=0)
    if now_berlin >= next_run:
        next_run = next_run + timedelta(days=1)
    return {
        "current_berlin_time": now_berlin.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "next_refresh": next_run.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "next_refresh_iso": next_run.isoformat(),
        "last_generated_berlin": snap.get("generated_at_berlin") if snap else None,
        "last_generated_iso": snap.get("generated_at") if snap else None,
        "tools_count": snap.get("tools_count", 0) if snap else 0,
        "total_catalog": len(RANKING_SOURCES_CATALOG),
        "sources_active": sum(1 for s in RANKING_SOURCES_CATALOG if s.get("active")),
    }


@api.get("/sources/catalog")
async def sources_catalog(limit: int = 1111, offset: int = 0, active_only: bool = False):
    items = RANKING_SOURCES_CATALOG
    if active_only:
        items = [s for s in items if s.get("active")]
    return {
        "total": len(RANKING_SOURCES_CATALOG),
        "active": sum(1 for s in RANKING_SOURCES_CATALOG if s.get("active")),
        "returned": len(items[offset : offset + limit]),
        "items": items[offset : offset + limit],
    }


@api.get("/tools/{tool_id}")
async def tool_detail(tool_id: str):
    snap = await get_latest_snapshot()
    if not snap:
        raise HTTPException(status_code=404, detail="No feed")
    for t in snap.get("tools", []):
        if t.get("id") == tool_id or t.get("name") == tool_id:
            return t
    raise HTTPException(status_code=404, detail="Tool not found")


@api.get("/tools/{tool_id}/install/{fmt}")
async def tool_install(tool_id: str, fmt: str):
    """Return raw install script (bash|docker|kubernetes) with proper content-type."""
    from fastapi.responses import PlainTextResponse
    snap = await get_latest_snapshot()
    if not snap:
        raise HTTPException(status_code=404, detail="No feed")
    for t in snap.get("tools", []):
        if t.get("id") == tool_id or t.get("name") == tool_id:
            scripts = t.get("install_scripts", {})
            if fmt not in scripts:
                raise HTTPException(status_code=400, detail="Unknown format")
            filename = {
                "bash": f"install-{scripts.get('slug','tool')}.sh",
                "docker": f"docker-{scripts.get('slug','tool')}.sh",
                "kubernetes": f"{scripts.get('slug','tool')}-k8s.yaml",
            }[fmt]
            return PlainTextResponse(
                content=scripts[fmt],
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
    raise HTTPException(status_code=404, detail="Tool not found")


@api.post("/admin/refresh")
async def admin_refresh(user: str = Depends(require_admin)):
    snap = await refresh_feed()
    return {"status": "ok", "tools_count": snap["tools_count"], "generated_at_berlin": snap["generated_at_berlin"]}


@api.get("/timeline")
async def timeline(limit: int = 30):
    docs = await db.snapshots.find({}, {"_id": 0, "tools": 0}).sort("_snapshot_time", -1).limit(limit).to_list(limit)
    return {"items": docs}


@api.get("/categories")
async def categories():
    snap = await get_latest_snapshot()
    if not snap:
        return {"categories": []}
    counts: Dict[str, int] = {}
    for t in snap.get("tools", []):
        c = t.get("category", "general")
        counts[c] = counts.get(c, 0) + 1
    return {"categories": [{"name": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])]}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
