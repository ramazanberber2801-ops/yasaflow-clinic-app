from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Admin password (in production keep in env). Allow override via env.
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'selda123')

app = FastAPI(title="Seldaesthetic API")
api_router = APIRouter(prefix="/api")


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


class LoyaltyAction(BaseModel):
    device_id: str


class AdminLogin(BaseModel):
    password: str


# ============ HELPERS ============
def _serialize_dt(d: dict) -> dict:
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


# ============ ROUTES ============
@api_router.get("/")
async def root():
    return {"message": "Seldaesthetic API", "status": "ok"}


# --- OFFERS ---
@api_router.get("/offers", response_model=List[Offer])
async def list_offers():
    docs = await db.offers.find({}).sort("created_at", -1).to_list(200)
    return [Offer(**_clean(d)) for d in docs]


@api_router.post("/offers", response_model=Offer)
async def create_offer(payload: OfferCreate):
    offer = Offer(**payload.model_dump())
    doc = _serialize_dt(offer.model_dump())
    await db.offers.insert_one(doc)
    return offer


@api_router.put("/offers/{offer_id}", response_model=Offer)
async def update_offer(offer_id: str, payload: OfferUpdate):
    existing = await db.offers.find_one({"id": offer_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Offer not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.offers.update_one({"id": offer_id}, {"$set": updates})
    updated = await db.offers.find_one({"id": offer_id})
    return Offer(**_clean(updated))


@api_router.delete("/offers/{offer_id}")
async def delete_offer(offer_id: str):
    res = await db.offers.delete_one({"id": offer_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"deleted": True}


# --- LOYALTY ---
@api_router.get("/loyalty/{device_id}", response_model=LoyaltyCard)
async def get_loyalty(device_id: str):
    doc = await db.loyalty.find_one({"device_id": device_id})
    if not doc:
        card = LoyaltyCard(device_id=device_id)
        new_doc = _serialize_dt(card.model_dump())
        await db.loyalty.insert_one(new_doc)
        return card
    return LoyaltyCard(**_clean(doc))


@api_router.post("/loyalty/stamp", response_model=LoyaltyCard)
async def stamp_loyalty(payload: LoyaltyAction):
    doc = await db.loyalty.find_one({"device_id": payload.device_id})
    if not doc:
        card = LoyaltyCard(device_id=payload.device_id, stamps=1,
                           last_stamped_at=datetime.now(timezone.utc))
        await db.loyalty.insert_one(_serialize_dt(card.model_dump()))
        return card
    current = doc.get("stamps", 0)
    if current >= 10:
        raise HTTPException(status_code=400, detail="Kortet er fullt. Tilbakestill først.")
    new_stamps = current + 1
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.loyalty.update_one(
        {"device_id": payload.device_id},
        {"$set": {"stamps": new_stamps, "last_stamped_at": now_iso}},
    )
    updated = await db.loyalty.find_one({"device_id": payload.device_id})
    return LoyaltyCard(**_clean(updated))


@api_router.post("/loyalty/reset", response_model=LoyaltyCard)
async def reset_loyalty(payload: LoyaltyAction):
    doc = await db.loyalty.find_one({"device_id": payload.device_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Kort ikke funnet")
    new_total = doc.get("total_completed", 0) + (1 if doc.get("stamps", 0) >= 10 else 0)
    await db.loyalty.update_one(
        {"device_id": payload.device_id},
        {"$set": {"stamps": 0, "total_completed": new_total}},
    )
    updated = await db.loyalty.find_one({"device_id": payload.device_id})
    return LoyaltyCard(**_clean(updated))


# --- ADMIN ---
@api_router.post("/admin/login")
async def admin_login(payload: AdminLogin):
    if payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Feil passord")
    token = uuid.uuid4().hex
    return {"success": True, "token": token}


# Include router
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
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def seed_data():
    """Seed initial offer if collection empty."""
    count = await db.offers.count_documents({})
    if count == 0:
        seed = Offer(
            title="Hydra Skin Deluxe Behandling",
            description="Dyprensende ansiktsbehandling som eksfolierer, tilfører fukt og gir huden ny glød. Passer alle hudtyper.",
            price="kr 1 290",
            before_price="kr 2 200",
            image_url="https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNTl8MHwxfHNlYXJjaHwxfHxza2luY2FyZSUyMGJlYXV0eSUyMHRyZWF0bWVudCUyMHNwYXxlbnwwfHx8fDE3ODE0MDY0ODN8MA&ixlib=rb-4.1.0&q=85",
            badge="SOMMER KAMPANJE",
        )
        await db.offers.insert_one(_serialize_dt(seed.model_dump()))
        logger.info("Seeded default offer")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
