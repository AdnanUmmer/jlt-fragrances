from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import csv
import json
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from seed_helpers import build_product, slugify, SIZES

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="JLT Fragrances API")
api = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"


def jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_token(email: str, role: str) -> str:
    payload = {
        "sub": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_admin(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    user = await db.users.find_one({"email": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    order_number: Optional[str] = None
    message: str


class QuizRequest(BaseModel):
    scent: str
    occasion: str
    projection: str
    budget: int
    gender: str


class ReviewCreate(BaseModel):
    name: str
    rating: int = Field(ge=1, le=5)
    title: Optional[str] = None
    comment: str


class ProductUpsert(BaseModel):
    name: str
    brand_inspiration: str
    scent_family: List[str] = []
    moods: List[str] = []
    gender: str = "Unisex"
    occasions: List[str] = []
    seasons: List[str] = []
    longevity: str = "Long Lasting (6-8 hrs)"
    projection: str = "Moderate"
    notes: dict = Field(default_factory=lambda: {"top": [], "heart": [], "base": []})
    smells_like: str = ""
    best_for: str = ""
    who_should_buy: str = ""
    image_url: Optional[str] = None
    is_bestseller: bool = False
    is_new_arrival: bool = False
    in_stock: bool = True


@api.get("/")
async def root():
    return {"message": "JLT Fragrances API", "products": await db.products.count_documents({})}


@api.get("/products")
async def list_products(
    q: Optional[str] = None,
    brand: Optional[str] = None,
    scent: Optional[str] = None,
    occasion: Optional[str] = None,
    gender: Optional[str] = None,
    mood: Optional[str] = None,
    bestseller: Optional[bool] = None,
    new_arrival: Optional[bool] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    size: Optional[str] = None,
    longevity: Optional[str] = None,
    projection: Optional[str] = None,
    niche: Optional[bool] = None,
    sort: Optional[str] = "popular",
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=120),
):
    query: dict = {}
    if q:
        rx = {"$regex": q, "$options": "i"}
        query["$or"] = [
            {"name": rx},
            {"brand_inspiration": rx},
            {"notes.top": rx},
            {"notes.heart": rx},
            {"notes.base": rx},
            {"occasions": rx},
            {"scent_family": rx},
        ]
    if brand:
        query["brand_inspiration"] = {"$regex": f"^{brand}$", "$options": "i"}
    if scent:
        query["scent_family"] = {"$in": [scent]}
    if mood:
        query["moods"] = {"$in": [mood]}
    if occasion:
        query["occasions"] = {"$in": [occasion]}
    if gender:
        query["gender"] = gender
    if bestseller:
        query["is_bestseller"] = True
    if new_arrival:
        query["is_new_arrival"] = True
    if longevity:
        query["longevity"] = {"$regex": longevity, "$options": "i"}
    if projection:
        query["projection"] = projection
    if size:
        query["sizes.size"] = size
    if niche is not None:
        query["is_niche"] = niche

    sort_spec = [("is_bestseller", -1), ("rating", -1)]
    if sort == "price_asc":
        sort_spec = [("base_price", 1)]
    elif sort == "price_desc":
        sort_spec = [("base_price", -1)]
    elif sort == "rating":
        sort_spec = [("rating", -1)]
    elif sort == "new":
        sort_spec = [("is_new_arrival", -1), ("rating", -1)]

    skip = (page - 1) * limit
    total = await db.products.count_documents(query)
    cursor = db.products.find(query, {"_id": 0}).sort(sort_spec).skip(skip).limit(limit)
    items = await cursor.to_list(limit)
    return {"items": items, "total": total, "page": page, "limit": limit}


@api.get("/products/filters")
async def get_filters():
    brands = await db.products.distinct("brand_inspiration")
    niche_brands = await db.products.distinct("brand_inspiration", {"is_niche": True})
    return {
        "brands": sorted(brands),
        "niche_brands": sorted(niche_brands),
        "scent_families": ["Oud", "Floral", "Fresh", "Sweet", "Spicy", "Musky", "Clean", "Woody", "Citrus", "Leather"],
        "moods": ["Fresh", "Sweet", "Oud", "Floral", "Clean", "Spicy", "Musky"],
        "occasions": ["Office", "Date Night", "Wedding", "Daily Wear", "Gifting", "Festive Wear"],
        "genders": ["Men", "Women", "Unisex"],
        "sizes": ["20ml", "50ml", "100ml"],
        "longevity": ["Moderate (4-6 hrs)", "Long Lasting (6-8 hrs)", "Long Lasting (8-12 hrs)"],
        "projection": ["Soft", "Moderate", "Strong"],
    }


@api.get("/brands")
async def list_brands():
    """Alphabetical brand directory with product counts."""
    pipeline = [
        {"$group": {
            "_id": "$brand_inspiration",
            "count": {"$sum": 1},
            "is_niche": {"$first": "$is_niche"},
        }},
        {"$sort": {"_id": 1}},
    ]
    cursor = db.products.aggregate(pipeline)
    items = [{"brand": d["_id"], "count": d["count"], "is_niche": bool(d.get("is_niche"))} async for d in cursor]
    grouped: dict = {}
    for it in items:
        letter = (it["brand"][:1] or "#").upper()
        grouped.setdefault(letter, []).append(it)
    return {"groups": [{"letter": k, "brands": v} for k, v in sorted(grouped.items())], "total": len(items)}


@api.get("/combos")
async def list_combos():
    return {
        "tester_combos": [
            {"slug": "tester-3-8ml", "title": "Tester Combo – 3 Fragrances", "subtitle": "3 × 8ml", "price": 549, "description": "Pick any 3 fragrances at 8ml each. Perfect first-time sampler.", "items": 3, "size": "8ml"},
            {"slug": "tester-5-8ml", "title": "Tester Combo – 5 Fragrances", "subtitle": "5 × 8ml", "price": 899, "description": "Pick any 5 fragrances at 8ml. Our most popular sampler.", "items": 5, "size": "8ml", "tag": "Most Popular"},
            {"slug": "tester-10-8ml", "title": "Tester Combo – 10 Fragrances", "subtitle": "10 × 8ml", "price": 1699, "description": "Pick any 10 fragrances at 8ml. The ultimate explorer set.", "items": 10, "size": "8ml", "tag": "Best Value"},
        ],
        "special_offers": [
            {"slug": "special-5-20ml", "title": "5 × 20ml Bundle", "subtitle": "Pick 5 at 20ml each", "price": 1999, "description": "Pick any 5 full 20ml bottles at a special bundle price.", "items": 5, "size": "20ml"},
            {"slug": "special-4-30ml", "title": "4 × 30ml Bundle", "subtitle": "Pick 4 at 30ml each", "price": 2499, "description": "Pick any 4 fragrances at 30ml. Great gifting bundle.", "items": 4, "size": "30ml"},
            {"slug": "special-3-50ml", "title": "3 × 50ml Bundle", "subtitle": "Pick 3 at 50ml each", "price": 2999, "description": "Pick any 3 fragrances at 50ml. Premium signature bundle.", "items": 3, "size": "50ml", "tag": "Bestseller"},
            {"slug": "special-2-100ml", "title": "2 × 100ml Bundle", "subtitle": "Pick 2 at 100ml each", "price": 2999, "description": "Pick any 2 fragrances at 100ml. Maximum value, full-size bottles.", "items": 2, "size": "100ml", "tag": "Top Value"},
        ],
    }


@api.get("/products/bestsellers")
async def bestsellers(limit: int = 12):
    items = await db.products.find({"is_bestseller": True}, {"_id": 0}).limit(limit).to_list(limit)
    return {"items": items}


@api.get("/products/{slug}")
async def get_product(slug: str):
    p = await db.products.find_one({"slug": slug}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    related_q = {
        "slug": {"$ne": slug},
        "$or": [
            {"brand_inspiration": p["brand_inspiration"]},
            {"scent_family": {"$in": p.get("scent_family", [])}},
        ],
    }
    related = await db.products.find(related_q, {"_id": 0}).limit(6).to_list(6)
    return {"product": p, "related": related}


@api.post("/quiz/recommend")
async def quiz_recommend(body: QuizRequest):
    query = {"moods": body.scent, "projection": body.projection}
    if body.gender in {"Men", "Women", "Unisex"}:
        query["$or"] = [{"gender": body.gender}, {"gender": "Unisex"}]
    occ_map = {
        "Daily": "Daily Wear", "Office": "Office", "Date Night": "Date Night",
        "Wedding": "Wedding", "Gifting": "Gifting", "Festive": "Festive Wear",
    }
    if body.occasion in occ_map:
        query["occasions"] = occ_map[body.occasion]
    items = await db.products.find(query, {"_id": 0}).sort([("rating", -1), ("is_bestseller", -1)]).limit(5).to_list(5)
    if len(items) < 3:
        items = await db.products.find({"moods": body.scent}, {"_id": 0}).sort([("rating", -1)]).limit(5).to_list(5)
    return {"items": items[:5]}


@api.get("/discovery-sets")
async def discovery_sets():
    sets = [
        {"slug": "5-scent-discovery", "title": "The 5-Scent Discovery Set", "subtitle": "5 x 5ml samples", "price": 499, "description": "A curated mix of five bestselling premium-inspired fragrances. The perfect way to explore before committing.", "tag": "Bestseller"},
        {"slug": "oud-discovery", "title": "Oud Discovery Set", "subtitle": "5 x 5ml samples", "price": 599, "description": "Deep, smoky, and unforgettable. Five of our richest oud-inspired compositions for evenings and special occasions.", "tag": "Rich & Bold"},
        {"slug": "office-wear-discovery", "title": "Office Wear Discovery Set", "subtitle": "5 x 5ml samples", "price": 499, "description": "Clean, fresh, professional. Five subtle scents that work hard for daily wear and the workplace.", "tag": "Everyday"},
        {"slug": "date-night-discovery", "title": "Date Night Discovery Set", "subtitle": "5 x 5ml samples", "price": 549, "description": "Seductive, warm and memorable. Five intimate compositions for unforgettable evenings.", "tag": "Seductive"},
        {"slug": "wedding-festive-discovery", "title": "Wedding & Festive Discovery Set", "subtitle": "5 x 5ml samples", "price": 599, "description": "Bold, rich, festive. Five oud-and-amber compositions crafted for celebrations and milestone moments.", "tag": "Festive"},
    ]
    return {"items": sets}


@api.post("/contact")
async def contact(body: ContactRequest):
    doc = body.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["id"] = str(uuid.uuid4())
    await db.contact_messages.insert_one(doc)
    return {"ok": True, "message": "Thanks! We'll get back to you within 24 hours."}


@api.get("/reviews/{slug}")
async def get_reviews(slug: str):
    items = await db.reviews.find({"product_slug": slug}, {"_id": 0}).sort([("created_at", -1)]).to_list(50)
    return {"items": items}


@api.post("/reviews/{slug}")
async def add_review(slug: str, body: ReviewCreate):
    doc = body.model_dump()
    doc.update({"id": str(uuid.uuid4()), "product_slug": slug, "created_at": datetime.now(timezone.utc).isoformat()})
    await db.reviews.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "review": doc}


@api.post("/auth/login")
async def login(body: LoginRequest):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["email"], user.get("role", "admin"))
    return {"token": token, "user": {"email": user["email"], "name": user.get("name"), "role": user.get("role")}}


@api.get("/auth/me")
async def me(admin: dict = Depends(get_current_admin)):
    return admin


@api.post("/admin/products")
async def create_product(body: ProductUpsert, admin: dict = Depends(get_current_admin)):
    cnt = await db.products.count_documents({})
    p = body.model_dump()
    p["slug"] = slugify(f"{p['name']}-inspired-by-{p['brand_inspiration']}-{cnt + 1}")
    p["sizes"] = SIZES
    p["base_price"] = 499
    p["rating"] = 4.5
    p["review_count"] = 0
    await db.products.insert_one(p)
    p.pop("_id", None)
    return {"ok": True, "product": p}


@api.put("/admin/products/{slug}")
async def update_product(slug: str, body: ProductUpsert, admin: dict = Depends(get_current_admin)):
    existing = await db.products.find_one({"slug": slug})
    if not existing:
        raise HTTPException(404, "Product not found")
    await db.products.update_one({"slug": slug}, {"$set": body.model_dump()})
    return {"ok": True}


@api.delete("/admin/products/{slug}")
async def delete_product(slug: str, admin: dict = Depends(get_current_admin)):
    res = await db.products.delete_one({"slug": slug})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@api.post("/admin/products/import-csv")
async def import_csv(file: UploadFile = File(...), admin: dict = Depends(get_current_admin)):
    content = (await file.read()).decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(content))
    inserted = 0
    cnt = await db.products.count_documents({})
    for row in reader:
        brand = (row.get("brand_inspiration") or row.get("brand") or "").strip()
        name = (row.get("name") or row.get("product_name") or "").strip()
        if not brand or not name:
            continue
        cnt += 1
        p = build_product(cnt, brand, name)
        await db.products.update_one({"slug": p["slug"]}, {"$set": p}, upsert=True)
        inserted += 1
    return {"ok": True, "inserted": inserted}


@api.get("/admin/contacts")
async def list_contacts(admin: dict = Depends(get_current_admin)):
    items = await db.contact_messages.find({}, {"_id": 0}).sort([("created_at", -1)]).limit(200).to_list(200)
    return {"items": items}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("jlt")


@app.on_event("startup")
async def startup():
    await db.products.create_index("slug", unique=True)
    await db.products.create_index("brand_inspiration")
    await db.products.create_index("scent_family")
    await db.products.create_index("moods")
    await db.users.create_index("email", unique=True)

    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "JLT Admin", "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        log.info("Seeded admin user: %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    count = await db.products.count_documents({})
    if count == 0:
        raw_path = ROOT_DIR / "products_raw.json"
        if raw_path.exists():
            raw = json.loads(raw_path.read_text())
            docs = [build_product(p["sl"], p["brand"], p["name"]) for p in raw]
            seen = set()
            unique = []
            for d in docs:
                if d["slug"] not in seen:
                    seen.add(d["slug"])
                    unique.append(d)
            if unique:
                await db.products.insert_many(unique)
                log.info("Seeded %d products", len(unique))


@app.on_event("shutdown")
async def shutdown():
    client.close()
