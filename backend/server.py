from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Header, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import logging
import os
import requests
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

SUPABASE_URL = os.environ.get(
    "SUPABASE_URL", "https://ncujjbrsokdyicdzbxwi.supabase.co"
).rstrip("/")
SUPABASE_ANON_KEY = os.environ.get(
    "SUPABASE_ANON_KEY", "sb_publishable_y85wAjsMhUgc6yMZwMzo7w__L143onG"
)

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "seldaesthetic"
_storage_key: Optional[str] = None

app = FastAPI(title="Seldaesthetic API")
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


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
    email: Optional[str] = None
    profile_saved_at: Optional[datetime] = None


class ProfilePayload(BaseModel):
    device_id: str
    name: str
    phone: str
    email: Optional[str] = None


class StampResponse(BaseModel):
    device_id: str
    stamps: int
    total_completed: int
    last_stamped_at: Optional[datetime] = None
    created_at: datetime
    milestone: Optional[str] = None


class LoyaltyAction(BaseModel):
    device_id: str


class TransferPayload(BaseModel):
    from_device_id: str
    to_device_id: str


def _ser(data: dict) -> dict:
    for key, value in list(data.items()):
        if isinstance(value, datetime):
            data[key] = value.isoformat()
    return data


def _clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    for key in ("created_at", "last_stamped_at", "profile_saved_at"):
        if key in doc and isinstance(doc[key], str):
            try:
                doc[key] = datetime.fromisoformat(doc[key])
            except Exception:
                pass
    return doc


def _milestone_for(stamps: int) -> Optional[str]:
    return {3: "10%", 6: "20%", 10: "Gratis peel"}.get(stamps)


def require_admin(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Du må være innlogget")

    token = authorization.split(" ", 1)[1].strip()
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
    }

    try:
        user_response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user", headers=headers, timeout=10
        )
        if user_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Ugyldig eller utløpt innlogging")
        user = user_response.json()
        user_id = user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Ugyldig bruker")

        profile_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers={**headers, "Accept": "application/json"},
            params={"id": f"eq.{user_id}", "select": "id,role"},
            timeout=10,
        )
        if profile_response.status_code != 200:
            raise HTTPException(status_code=403, detail="Kunne ikke kontrollere adminrollen")
        profiles = profile_response.json()
        if not profiles or profiles[0].get("role") != "admin":
            raise HTTPException(status_code=403, detail="Kun administrator har tilgang")
        return user
    except HTTPException:
        raise
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Kunne ikke kontrollere innloggingen")


def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY not set; storage disabled")
        return None
    try:
        response = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": EMERGENT_KEY},
            timeout=30,
        )
        response.raise_for_status()
        _storage_key = response.json()["storage_key"]
        return _storage_key
    except Exception as error:
        logger.error("Storage init failed: %s", error)
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    global _storage_key
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Lagring ikke tilgjengelig")
    response = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if response.status_code == 403:
        _storage_key = None
        key = init_storage()
        response = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    response.raise_for_status()
    return response.json()


def get_object(path: str):
    global _storage_key
    key = init_storage()
    response = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    if response.status_code == 403:
        _storage_key = None
        key = init_storage()
        response = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60,
        )
    response.raise_for_status()
    return response.content, response.headers.get("Content-Type", "application/octet-stream")


MIME_MAP = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
}


@api_router.get("/")
async def root():
    return {"message": "Seldaesthetic API", "status": "ok"}


@api_router.get("/offers", response_model=List[Offer])
async def list_offers():
    docs = await db.offers.find({}).sort("created_at", -1).to_list(200)
    return [Offer(**_clean(doc)) for doc in docs]


@api_router.post("/offers", response_model=Offer, dependencies=[Depends(require_admin)])
async def create_offer(payload: OfferCreate):
    offer = Offer(**payload.model_dump())
    await db.offers.insert_one(_ser(offer.model_dump()))
    return offer


@api_router.put("/offers/{offer_id}", response_model=Offer, dependencies=[Depends(require_admin)])
async def update_offer(offer_id: str, payload: OfferUpdate):
    existing = await db.offers.find_one({"id": offer_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Tilbudet ble ikke funnet")
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    if updates:
        await db.offers.update_one({"id": offer_id}, {"$set": updates})
    return Offer(**_clean(await db.offers.find_one({"id": offer_id})))


@api_router.delete("/offers/{offer_id}", dependencies=[Depends(require_admin)])
async def delete_offer(offer_id: str):
    result = await db.offers.delete_one({"id": offer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tilbudet ble ikke funnet")
    return {"deleted": True}


@api_router.get("/loyalty/{device_id}", response_model=LoyaltyCard)
async def get_loyalty(device_id: str):
    doc = await db.loyalty.find_one({"device_id": device_id})
    if not doc:
        card = LoyaltyCard(device_id=device_id)
        await db.loyalty.insert_one(_ser(card.model_dump()))
        return card
    return LoyaltyCard(**_clean(doc))


@api_router.post("/loyalty/stamp", response_model=StampResponse, dependencies=[Depends(require_admin)])
async def stamp_loyalty(payload: LoyaltyAction):
    now = datetime.now(timezone.utc)
    doc = await db.loyalty.find_one({"device_id": payload.device_id})
    if not doc:
        card = LoyaltyCard(device_id=payload.device_id, stamps=1, last_stamped_at=now)
        await db.loyalty.insert_one(_ser(card.model_dump()))
        new_stamps, total_completed, created_at = 1, 0, card.created_at
    else:
        current = int(doc.get("stamps", 0))
        if current >= 10:
            raise HTTPException(status_code=400, detail="Kortet er fullt. Tilbakestill først.")
        new_stamps = current + 1
        await db.loyalty.update_one(
            {"device_id": payload.device_id},
            {"$set": {"stamps": new_stamps, "last_stamped_at": now.isoformat()}},
        )
        total_completed = int(doc.get("total_completed", 0))
        raw_created = doc.get("created_at")
        created_at = datetime.fromisoformat(raw_created) if isinstance(raw_created, str) else raw_created or now

    milestone = _milestone_for(new_stamps)
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
    new_total = int(doc.get("total_completed", 0)) + (1 if int(doc.get("stamps", 0)) >= 10 else 0)
    await db.loyalty.update_one(
        {"device_id": payload.device_id},
        {"$set": {"stamps": 0, "total_completed": new_total}},
    )
    await db.loyalty_events.insert_one(_ser({
        "id": str(uuid.uuid4()), "device_id": payload.device_id,
        "type": "reset", "stamps_after": 0, "milestone": None, "created_at": now,
    }))
    return LoyaltyCard(**_clean(await db.loyalty.find_one({"device_id": payload.device_id})))


@api_router.post("/loyalty/unstamp", response_model=LoyaltyCard, dependencies=[Depends(require_admin)])
async def unstamp_loyalty(payload: LoyaltyAction):
    doc = await db.loyalty.find_one({"device_id": payload.device_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Kort ikke funnet")
    current = int(doc.get("stamps", 0))
    if current <= 0:
        raise HTTPException(status_code=400, detail="Kortet har ingen stempler å fjerne")
    now = datetime.now(timezone.utc)
    new_stamps = current - 1
    await db.loyalty.update_one(
        {"device_id": payload.device_id},
        {"$set": {"stamps": new_stamps, "last_stamped_at": now.isoformat()}},
    )
    await db.loyalty_events.insert_one(_ser({
        "id": str(uuid.uuid4()), "device_id": payload.device_id,
        "type": "unstamp", "stamps_after": new_stamps, "milestone": None, "created_at": now,
    }))
    return LoyaltyCard(**_clean(await db.loyalty.find_one({"device_id": payload.device_id})))


@api_router.post("/loyalty/profile", response_model=LoyaltyCard)
async def save_profile(payload: ProfilePayload):
    name = payload.name.strip()
    phone = payload.phone.strip()
    email = (payload.email or "").strip().lower() or None
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Vennligst skriv inn et gyldig navn")
    if len(phone.replace(" ", "")) < 6:
        raise HTTPException(status_code=400, detail="Vennligst skriv inn et gyldig mobilnummer")
    now = datetime.now(timezone.utc)
    values = {"name": name, "phone": phone, "email": email, "profile_saved_at": now.isoformat()}
    doc = await db.loyalty.find_one({"device_id": payload.device_id})
    if not doc:
        card = LoyaltyCard(device_id=payload.device_id, **values)
        await db.loyalty.insert_one(_ser(card.model_dump()))
        return card
    await db.loyalty.update_one({"device_id": payload.device_id}, {"$set": values})
    return LoyaltyCard(**_clean(await db.loyalty.find_one({"device_id": payload.device_id})))


@api_router.get("/admin/loyalty", dependencies=[Depends(require_admin)])
async def list_loyalty(limit: int = 100):
    docs = await db.loyalty.find({}).sort("last_stamped_at", -1).to_list(limit)
    return [LoyaltyCard(**_clean(doc)).model_dump() for doc in docs]


@api_router.get("/admin/loyalty/{device_id}/history", dependencies=[Depends(require_admin)])
async def loyalty_history(device_id: str, limit: int = 50):
    card_doc = await db.loyalty.find_one({"device_id": device_id})
    if not card_doc:
        raise HTTPException(status_code=404, detail="Kort ikke funnet")
    events = await db.loyalty_events.find({"device_id": device_id}).sort("created_at", -1).to_list(limit)
    return {
        "card": LoyaltyCard(**_clean(card_doc)).model_dump(),
        "events": [_clean(event) for event in events],
    }


@api_router.delete("/admin/loyalty/{device_id}", dependencies=[Depends(require_admin)])
async def delete_loyalty(device_id: str):
    result = await db.loyalty.delete_one({"device_id": device_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kort ikke funnet")
    await db.loyalty_events.delete_many({"device_id": device_id})
    return {"deleted": True}


@api_router.post("/admin/loyalty/transfer", dependencies=[Depends(require_admin)])
async def transfer_loyalty(payload: TransferPayload):
    if payload.from_device_id == payload.to_device_id:
        raise HTTPException(status_code=400, detail="Kilde og mål er samme kort")
    source = await db.loyalty.find_one({"device_id": payload.from_device_id})
    target = await db.loyalty.find_one({"device_id": payload.to_device_id})
    if not source or not target:
        raise HTTPException(status_code=404, detail="Kort ikke funnet")
    now = datetime.now(timezone.utc)
    merged = min(10, int(source.get("stamps", 0)) + int(target.get("stamps", 0)))
    update = {
        "stamps": merged,
        "total_completed": int(target.get("total_completed", 0)) + int(source.get("total_completed", 0)),
        "last_stamped_at": now.isoformat(),
    }
    for field in ("name", "phone", "email"):
        if not target.get(field) and source.get(field):
            update[field] = source[field]
    await db.loyalty.update_one({"device_id": payload.to_device_id}, {"$set": update})
    await db.loyalty.delete_one({"device_id": payload.from_device_id})
    await db.loyalty_events.update_many(
        {"device_id": payload.from_device_id}, {"$set": {"device_id": payload.to_device_id}}
    )
    await db.loyalty_events.insert_one(_ser({
        "id": str(uuid.uuid4()), "device_id": payload.to_device_id,
        "type": "transfer", "stamps_after": merged, "milestone": None, "created_at": now,
    }))
    card = LoyaltyCard(**_clean(await db.loyalty.find_one({"device_id": payload.to_device_id})))
    return {"merged_stamps": merged, "card": card.model_dump()}


@api_router.get("/admin/verify")
async def admin_verify(user: dict = Depends(require_admin)):
    return {"valid": True, "user_id": user.get("id")}


@api_router.post("/upload", dependencies=[Depends(require_admin)])
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Kun bildefiler er tillatt")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "bin"
    content_type = MIME_MAP.get(ext, file.content_type or "application/octet-stream")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Filen er for stor (maks 8MB)")
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/offers/{file_id}.{ext}"
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


@api_router.get("/files/{path:path}")
async def download(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="Fil ikke funnet")
    try:
        data, content_type = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="Fil ikke funnet")
    return Response(content=data, media_type=record.get("content_type") or content_type)


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


@app.on_event("startup")
async def on_startup():
    init_storage()
    if await db.offers.count_documents({}) == 0:
        seed = Offer(
            title="Hydra Skin Deluxe Behandling",
            description="Dyprensende ansiktsbehandling som eksfolierer, tilfører fukt og gir huden ny glød. Passer alle hudtyper.",
            price="kr 1 290",
            before_price="kr 2 200",
            image_url="https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
            badge="SOMMER KAMPANJE",
        )
        await db.offers.insert_one(_ser(seed.model_dump()))


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
