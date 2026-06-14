from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Header, Query, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import requests
import jwt
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'selda123')
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALG = "HS256"
JWT_EXP_HOURS = 12

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "seldaesthetic"

# Reusable storage key (set once at startup)
_storage_key: Optional[str] = None

app = FastAPI(title="Seldaesthetic API")
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


# ============ MODELS ============
class Offer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    price: str
    before_price: Optional[str] = ""
    image_url: str
    badge: Optional[str] = "TILBUD"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OfferCreate(BaseModel):
    title: str
    description: str
    price: str
    before_price: Optional[str] = ""
    image_url: str
    badge: Optional[str] = "TILBUD"


class OfferUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[str] = None
    before_price: Optional[str] = None
    image_url: Optional[str] = None
    badge: Optional[str] = None


class LoyaltyCard(BaseModel):
    model_config = ConfigDict(extra="ignore")
    device_id: str
    stamps: int = 0
    total_completed: int = 0
    last_stamped_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    name: Optional[str] = None
    phone: Optional[str] = None
    profile_saved_at: Optional[datetime] = None


class ProfilePayload(BaseModel):
    device_id: str
    name: str
    phone: str


class StampResponse(BaseModel):
    device_id: str
    stamps: int
    total_completed: int
    last_stamped_at: Optional[datetime] = None
    created_at: datetime
    milestone: Optional[str] = None  # "10%", "20%", "Gratis peel" or None


class LoyaltyAction(BaseModel):
    device_id: str


class AdminLogin(BaseModel):
    password: str


class LoyaltyEvent(BaseModel):
    id: str
    device_id: str
    type: str  # "stamp" | "reset"
    stamps_after: int
    milestone: Optional[str] = None
    created_at: datetime


# ============ HELPERS ============
def _ser(d: dict) -> dict:
    for k, v in list(d.items()):
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


def _clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    for k in ("created_at", "last_stamped_at"):
        if k in doc and isinstance(doc[k], str):
            try:
                doc[k] = datetime.fromisoformat(doc[k])
            except Exception:
                pass
    return doc


def _milestone_for(stamps: int) -> Optional[str]:
    return {3: "10%", 6: "20%", 10: "Gratis peel"}.get(stamps)


# ---- Auth ----
def create_token() -> str:
    payload = {
        "sub": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def require_admin(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Mangler autentisering")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("sub") != "admin":
            raise HTTPException(status_code=401, detail="Ugyldig token")
        return token
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token utløpt")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Ugyldig token")


# ---- Object Storage ----
def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY not set; storage disabled")
        return None
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": EMERGENT_KEY},
            timeout=30,
        )
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Lagring ikke tilgjengelig")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 403:
        # storage key expired - re-init once
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60,
    )
    if resp.status_code == 403:
        global _storage_key
        _storage_key = None
        key = init_storage()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key}, timeout=60,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


MIME_MAP = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp",
}


# ============ ROUTES ============
@api_router.get("/")
async def root():
    return {"message": "Seldaesthetic API", "status": "ok"}


# --- OFFERS ---
@api_router.get("/offers", response_model=List[Offer])
async def list_offers():
    docs = await db.offers.find({}).sort("created_at", -1).to_list(200)
    return [Offer(**_clean(d)) for d in docs]


@api_router.post("/offers", response_model=Offer, dependencies=[Depends(require_admin)])
async def create_offer(payload: OfferCreate):
    offer = Offer(**payload.model_dump())
    await db.offers.insert_one(_ser(offer.model_dump()))
    return offer


@api_router.put("/offers/{offer_id}", response_model=Offer, dependencies=[Depends(require_admin)])
async def update_offer(offer_id: str, payload: OfferUpdate):
    existing = await db.offers.find_one({"id": offer_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Offer not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.offers.update_one({"id": offer_id}, {"$set": updates})
    updated = await db.offers.find_one({"id": offer_id})
    return Offer(**_clean(updated))


@api_router.delete("/offers/{offer_id}", dependencies=[Depends(require_admin)])
async def delete_offer(offer_id: str):
    res = await db.offers.delete_one({"id": offer_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"deleted": True}


# --- LOYALTY (customer) ---
@api_router.get("/loyalty/{device_id}", response_model=LoyaltyCard)
async def get_loyalty(device_id: str):
    doc = await db.loyalty.find_one({"device_id": device_id})
    if not doc:
        card = LoyaltyCard(device_id=device_id)
        await db.loyalty.insert_one(_ser(card.model_dump()))
        return card
    return LoyaltyCard(**_clean(doc))


# --- LOYALTY (admin actions) ---
@api_router.post("/loyalty/stamp", response_model=StampResponse, dependencies=[Depends(require_admin)])
async def stamp_loyalty(payload: LoyaltyAction):
    now = datetime.now(timezone.utc)
    doc = await db.loyalty.find_one({"device_id": payload.device_id})
    if not doc:
        card = LoyaltyCard(device_id=payload.device_id, stamps=1, last_stamped_at=now)
        await db.loyalty.insert_one(_ser(card.model_dump()))
        new_stamps = 1
        total_completed = 0
        created_at = card.created_at
    else:
        current = doc.get("stamps", 0)
        if current >= 10:
            raise HTTPException(status_code=400, detail="Kortet er fullt. Tilbakestill først.")
        new_stamps = current + 1
        await db.loyalty.update_one(
            {"device_id": payload.device_id},
            {"$set": {"stamps": new_stamps, "last_stamped_at": now.isoformat()}},
        )
        total_completed = doc.get("total_completed", 0)
        created_at_raw = doc.get("created_at")
        created_at = (
            datetime.fromisoformat(created_at_raw) if isinstance(created_at_raw, str) else created_at_raw or now
        )

    milestone = _milestone_for(new_stamps)
    # Log event
    await db.loyalty_events.insert_one(_ser({
        "id": str(uuid.uuid4()),
        "device_id": payload.device_id,
        "type": "stamp",
        "stamps_after": new_stamps,
        "milestone": milestone,
        "created_at": now,
    }))

    return StampResponse(
        device_id=payload.device_id,
        stamps=new_stamps,
        total_completed=total_completed,
        last_stamped_at=now,
        created_at=created_at,
        milestone=milestone,
    )


@api_router.post("/loyalty/reset", response_model=LoyaltyCard, dependencies=[Depends(require_admin)])
async def reset_loyalty(payload: LoyaltyAction):
    doc = await db.loyalty.find_one({"device_id": payload.device_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Kort ikke funnet")
    now = datetime.now(timezone.utc)
    new_total = doc.get("total_completed", 0) + (1 if doc.get("stamps", 0) >= 10 else 0)
    await db.loyalty.update_one(
        {"device_id": payload.device_id},
        {"$set": {"stamps": 0, "total_completed": new_total}},
    )
    await db.loyalty_events.insert_one(_ser({
        "id": str(uuid.uuid4()),
        "device_id": payload.device_id,
        "type": "reset",
        "stamps_after": 0,
        "milestone": None,
        "created_at": now,
    }))
    updated = await db.loyalty.find_one({"device_id": payload.device_id})
    return LoyaltyCard(**_clean(updated))


@api_router.post("/loyalty/unstamp", response_model=LoyaltyCard, dependencies=[Depends(require_admin)])
async def unstamp_loyalty(payload: LoyaltyAction):
    doc = await db.loyalty.find_one({"device_id": payload.device_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Kort ikke funnet")
    current = doc.get("stamps", 0)
    if current <= 0:
        raise HTTPException(status_code=400, detail="Kortet har ingen stempler å fjerne")
    new_stamps = current - 1
    now = datetime.now(timezone.utc)
    await db.loyalty.update_one(
        {"device_id": payload.device_id},
        {"$set": {"stamps": new_stamps, "last_stamped_at": now.isoformat()}},
    )
    await db.loyalty_events.insert_one(_ser({
        "id": str(uuid.uuid4()),
        "device_id": payload.device_id,
        "type": "unstamp",
        "stamps_after": new_stamps,
        "milestone": None,
        "created_at": now,
    }))
    updated = await db.loyalty.find_one({"device_id": payload.device_id})
    return LoyaltyCard(**_clean(updated))


# Customer-facing: save name + phone to their own device card (no auth, scoped by device_id)
@api_router.post("/loyalty/profile", response_model=LoyaltyCard)
async def save_profile(payload: ProfilePayload):
    name = payload.name.strip()
    phone = payload.phone.strip()
    if not name or len(name) < 2:
        raise HTTPException(status_code=400, detail="Vennligst skriv inn et gyldig navn")
    if not phone or len(phone.replace(" ", "")) < 6:
        raise HTTPException(status_code=400, detail="Vennligst skriv inn et gyldig mobilnummer")
    now = datetime.now(timezone.utc)
    doc = await db.loyalty.find_one({"device_id": payload.device_id})
    if not doc:
        card = LoyaltyCard(
            device_id=payload.device_id, name=name, phone=phone, profile_saved_at=now
        )
        await db.loyalty.insert_one(_ser(card.model_dump()))
        return card
    await db.loyalty.update_one(
        {"device_id": payload.device_id},
        {"$set": {"name": name, "phone": phone, "profile_saved_at": now.isoformat()}},
    )
    updated = await db.loyalty.find_one({"device_id": payload.device_id})
    return LoyaltyCard(**_clean(updated))


# --- ADMIN: customer history & list ---
@api_router.get("/admin/loyalty", dependencies=[Depends(require_admin)])
async def list_loyalty(limit: int = 100):
    docs = await db.loyalty.find({}).sort("last_stamped_at", -1).to_list(limit)
    return [LoyaltyCard(**_clean(d)).model_dump() for d in docs]


@api_router.get("/admin/loyalty/{device_id}/history", dependencies=[Depends(require_admin)])
async def loyalty_history(device_id: str, limit: int = 50):
    card_doc = await db.loyalty.find_one({"device_id": device_id})
    if not card_doc:
        raise HTTPException(status_code=404, detail="Kort ikke funnet")
    events = await db.loyalty_events.find({"device_id": device_id})\
        .sort("created_at", -1).to_list(limit)
    return {
        "card": LoyaltyCard(**_clean(card_doc)).model_dump(),
        "events": [_clean(e) for e in events],
    }


# --- ADMIN: AUTH ---
@api_router.post("/admin/login")
async def admin_login(payload: AdminLogin):
    if payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Feil passord")
    return {"success": True, "token": create_token()}


@api_router.get("/admin/verify")
async def admin_verify(_: str = Depends(require_admin)):
    return {"valid": True}


# --- UPLOADS ---
@api_router.post("/upload", dependencies=[Depends(require_admin)])
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Kun bildefiler er tillatt")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "bin"
    content_type = MIME_MAP.get(ext, file.content_type or "application/octet-stream")
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/offers/{file_id}.{ext}"
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Filen er for stor (maks 8MB)")
    result = put_object(path, data, content_type)
    actual_path = result.get("path", path)
    await db.files.insert_one(_ser({
        "id": file_id,
        "storage_path": actual_path,
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc),
    }))
    return {"id": file_id, "url": f"/api/files/{actual_path}", "path": actual_path}


# Public file serving (so <img src> works without auth headers).
# Files are obscure UUID paths so direct guessing is impractical.
@api_router.get("/files/{path:path}")
async def download(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="Fil ikke funnet")
    try:
        data, ctype = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="Fil ikke funnet")
    return Response(content=data, media_type=record.get("content_type") or ctype)


# ============ APP WIRING ============
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("startup")
async def on_startup():
    init_storage()
    # Seed default offer
    if await db.offers.count_documents({}) == 0:
        seed = Offer(
            title="Hydra Skin Deluxe Behandling",
            description="Dyprensende ansiktsbehandling som eksfolierer, tilfører fukt og gir huden ny glød. Passer alle hudtyper.",
            price="kr 1 290",
            before_price="kr 2 200",
            image_url="https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNTl8MHwxfHNlYXJjaHwxfHxza2luY2FyZSUyMGJlYXV0eSUyMHRyZWF0bWVudCUyMHNwYXxlbnwwfHx8fDE3ODE0MDY0ODN8MA&ixlib=rb-4.1.0&q=85",
            badge="SOMMER KAMPANJE",
        )
        await db.offers.insert_one(_ser(seed.model_dump()))


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
