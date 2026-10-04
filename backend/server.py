from dotenv import load_dotenv
from pathlib import Path
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import re
import time
import secrets as pysecrets
from collections import deque
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# --- Config ---
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
ACCESS_TOKEN_HOURS = 24 * 7

ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@edspixel.it').lower()
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

# --- DB ---
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("edspixel")

# --- Lifespan (Startup & Shutdown) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db.users.create_index("email", unique=True)
    await db.tickets.create_index("code", unique=True)
    await db.tickets.create_index("status")
    await db.tickets.create_index("created_at")
    await db.products.create_index("barcode")
    await db.products.create_index("name")

    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL,
            "name": "Emilio De Leo",
            "role": "admin",
            "password_hash": hash_pw(ADMIN_PASSWORD),
            "must_change_password": True,
            "created_at": now_iso(),
        })
        logger.info(f"Seeded admin {ADMIN_EMAIL} (first-login password change required)")

    # Seed settings
    if not await db.settings.find_one({"id": "singleton"}):
        s = SettingsIn().model_dump()
        s["id"] = "singleton"
        await db.settings.insert_one(s)
        logger.info("Seeded default settings")
        
    yield
    
    # Shutdown
    client.close()

# --- App ---
app = FastAPI(title="EDS PIXEL API", lifespan=lifespan)
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)


# --- Helpers ---
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gen_ticket_code() -> str:
    return f"EDS-{datetime.now().strftime('%y%m%d')}-{pysecrets.token_hex(4).upper()}"


def gen_pin() -> str:
    return f"{pysecrets.randbelow(10000):04d}"


# ----- Rate limiting (in-memory, per-IP) for public endpoints -----
PUBLIC_RATE_LIMIT = 60  # requests per minute per IP
_rate_buckets: dict = {}


def check_public_rate(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    bucket = _rate_buckets.setdefault(ip, deque())
    while bucket and bucket[0] < now - 60:
        bucket.popleft()
    if len(bucket) >= PUBLIC_RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Troppe richieste, riprova tra un minuto")
    bucket.append(now)


# ----- Photo validation -----
_ALLOWED_IMG_RE = re.compile(r"^data:image/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$")
MAX_PHOTO_BASE64 = 6 * 1024 * 1024  # ~4.5 MB real binary
MAX_MSG_TEXT = 1000


def validate_photo_data(data: Optional[str]) -> Optional[str]:
    if data is None or data == "":
        return None
    if not isinstance(data, str) or not _ALLOWED_IMG_RE.match(data):
        raise HTTPException(status_code=400, detail="Formato immagine non supportato")
    if len(data) > MAX_PHOTO_BASE64:
        raise HTTPException(status_code=413, detail="Immagine troppo grande (max ~4.5MB)")
    return data


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Non autenticato")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessione scaduta")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    user.pop("password_hash", None)
    user.pop("_id", None)
    user["must_change_password"] = bool(user.get("must_change_password"))
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo amministratori")
    return user


# --- Models ---
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    must_change_password: Optional[bool] = False


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["admin", "tecnico"] = "tecnico"


class TicketIn(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = ""
    device_brand: str
    device_model: str
    device_color: Optional[str] = ""
    imei: Optional[str] = ""
    issue: str
    accessories: Optional[str] = ""
    conditions: Optional[str] = ""
    estimate: float = 0
    deposit: float = 0
    part_cost: float = 0
    pin: Optional[str] = ""
    pattern: Optional[str] = ""
    notes: Optional[str] = ""


class TicketUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    device_brand: Optional[str] = None
    device_model: Optional[str] = None
    device_color: Optional[str] = None
    imei: Optional[str] = None
    issue: Optional[str] = None
    accessories: Optional[str] = None
    conditions: Optional[str] = None
    estimate: Optional[float] = None
    deposit: Optional[float] = None
    part_cost: Optional[float] = None
    pin: Optional[str] = None
    pattern: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class StatusChange(BaseModel):
    status: Literal["in_registro", "valutazione", "in_lavorazione", "attesa_ricambi", "pronto", "consegnato", "non_riparabile"]
    note: Optional[str] = ""


class MessageIn(BaseModel):
    text: str = ""
    photo_data: Optional[str] = None
    author: Optional[str] = None


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


class SettingsIn(BaseModel):
    business_name: str = "EDS PIXEL di Emilio De Leo"
    platform_name: str = "Pixel Lab"
    theme: Literal["quantum", "emerald", "cyber"] = "quantum"
    vat: str = "08976891211"
    address: str = "Cupa Fossa del Lupo 142 - Napoli"
    phone: str = "3349182409"
    email: str = "emilio@edspixel.it"
    warranty_terms: str = ""
    conditions: str = ""
    daily_target_min: float = 175
    daily_target_max: float = 190


class ExpenseIn(BaseModel):
    label: str
    amount: float
    period: Literal["mensile", "settimanale", "giornaliero", "annuale"] = "mensile"
    category: Optional[str] = "generale"


class ProductIn(BaseModel):
    barcode: str = ""
    name: str
    category: Literal["display", "batterie", "pellicole", "accessori", "ricambi", "altro"] = "accessori"
    stock: int = 0
    cost_price: float = 0
    sale_price: float = 0
    note: Optional[str] = ""


class ProductUpdate(BaseModel):
    barcode: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    stock: Optional[int] = None
    cost_price: Optional[float] = None
    sale_price: Optional[float] = None
    note: Optional[str] = None


class StockDelta(BaseModel):
    delta: int
    reason: Optional[str] = ""


class SaleItem(BaseModel):
    name: str
    price: float
    qty: int = 1


class SaleIn(BaseModel):
    items: List[SaleItem]
    payment_method: Literal["contanti", "pos", "transfer"] = "contanti"
    discount: float = 0
    note: Optional[str] = ""


# --- Auth routes ---
@api.post("/auth/login")
async def login(data: LoginIn):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    token = create_token(user["id"], user["email"], user["role"])
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"], "must_change_password": bool(user.get("must_change_password"))},
    }


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/change-password")
async def change_password(data: ChangePasswordIn, user: dict = Depends(get_current_user)):
    doc = await db.users.find_one({"id": user["id"]})
    if not doc or not verify_pw(data.current_password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Password attuale non valida")
    if len(data.new_password or "") < 8:
        raise HTTPException(status_code=400, detail="La nuova password deve avere almeno 8 caratteri")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_pw(data.new_password), "must_change_password": False}},
    )
    return {"ok": True}


@api.get("/auth/users")
async def list_users(_: dict = Depends(require_admin)):
    docs = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return docs


@api.post("/auth/users")
async def create_user(data: UserCreate, _: dict = Depends(require_admin)):
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email già registrata")
    if len(data.password or "") < 8:
        raise HTTPException(status_code=400, detail="Password minimo 8 caratteri")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": data.name,
        "role": data.role,
        "password_hash": hash_pw(data.password),
        "must_change_password": True,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    doc.pop("password_hash", None)
    doc.pop("_id", None)
    return doc


@api.delete("/auth/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Non puoi eliminare te stesso")
    await db.users.delete_one({"id": user_id})
    return {"ok": True}


# --- Settings ---
@api.get("/settings")
async def get_settings(_: dict = Depends(get_current_user)):
    s = await db.settings.find_one({"id": "singleton"}, {"_id": 0})
    if not s:
        default = SettingsIn().model_dump()
        default["id"] = "singleton"
        await db.settings.insert_one(default)
        default.pop("_id", None)
        s = default
    return s


@api.put("/settings")
async def put_settings(data: SettingsIn, _: dict = Depends(require_admin)):
    doc = data.model_dump()
    doc["id"] = "singleton"
    await db.settings.update_one({"id": "singleton"}, {"$set": doc}, upsert=True)
    return doc


@api.get("/public/settings")
async def public_settings(request: Request):
    check_public_rate(request)
    s = await db.settings.find_one({"id": "singleton"}, {"_id": 0}) or {}
    return {
        "business_name": s.get("business_name", "EDS PIXEL"),
        "platform_name": s.get("platform_name", "Pixel Lab"),
        "theme": s.get("theme", "quantum"),
        "phone": s.get("phone", ""),
        "address": s.get("address", ""),
    }


# --- Tickets ---
STATUS_ORDER = ["in_registro", "valutazione", "in_lavorazione", "attesa_ricambi", "pronto", "consegnato"]


def _ticket_doc_from_input(payload: dict) -> dict:
    now = now_iso()
    return {
        "id": str(uuid.uuid4()),
        "code": gen_ticket_code(),
        "status": "in_registro",
        "created_at": now,
        "updated_at": now,
        "delivered_at": None,
        "history": [{"status": "in_registro", "at": now, "note": "Creato"}],
        **payload,
    }


@api.get("/tickets")
async def list_tickets(status: Optional[str] = None, _: dict = Depends(get_current_user)):
    q = {}
    if status:
        q["status"] = status
    docs = await db.tickets.find(q, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api.post("/tickets")
async def create_ticket(data: TicketIn, user: dict = Depends(get_current_user)):
    payload = data.model_dump()
    if not payload.get("pin"):
        payload["pin"] = gen_pin()
    doc = _ticket_doc_from_input(payload)
    doc["created_by"] = user["name"]
    await db.tickets.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, _: dict = Depends(get_current_user)):
    doc = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    return doc


@api.put("/tickets/{ticket_id}")
async def update_ticket(ticket_id: str, data: TicketUpdate, _: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    update["updated_at"] = now_iso()
    if update.get("status") == "consegnato":
        update["delivered_at"] = now_iso()
    res = await db.tickets.update_one({"id": ticket_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    doc = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    return doc


@api.patch("/tickets/{ticket_id}/status")
async def change_status(ticket_id: str, data: StatusChange, _: dict = Depends(get_current_user)):
    t = await db.tickets.find_one({"id": ticket_id})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    now = now_iso()
    history = t.get("history", [])
    history.append({"status": data.status, "at": now, "note": data.note or ""})
    update = {"status": data.status, "updated_at": now, "history": history}
    if data.status == "consegnato":
        update["delivered_at"] = now
    await db.tickets.update_one({"id": ticket_id}, {"$set": update})
    doc = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    return doc


@api.delete("/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str, _: dict = Depends(require_admin)):
    await db.tickets.delete_one({"id": ticket_id})
    return {"ok": True}


# --- Customers ---
@api.get("/customers")
async def list_customers(_: dict = Depends(get_current_user)):
    pipeline = [
        {"$group": {
            "_id": "$customer_phone",
            "name": {"$last": "$customer_name"},
            "email": {"$last": "$customer_email"},
            "tickets_count": {"$sum": 1},
            "total_spent": {"$sum": {"$ifNull": ["$estimate", 0]}},
            "last_visit": {"$max": "$created_at"},
            "last_device": {"$last": {"$concat": [{"$ifNull": ["$device_brand", ""]}, " ", {"$ifNull": ["$device_model", ""]}]}},
            "has_pending": {"$sum": {"$cond": [{"$in": ["$status", ["in_registro", "in_lavorazione", "pronto"]]}, 1, 0]}},
        }},
        {"$sort": {"last_visit": -1}},
    ]
    docs = await db.tickets.aggregate(pipeline).to_list(2000)
    return [{"phone": d["_id"], **{k: v for k, v in d.items() if k != "_id"}} for d in docs if d["_id"]]


@api.get("/customers/{phone}")
async def customer_detail(phone: str, _: dict = Depends(get_current_user)):
    tickets = await db.tickets.find({"customer_phone": phone}, {"_id": 0}).sort("created_at", -1).to_list(500)
    if not tickets:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    latest = tickets[0]
    total_spent = sum((t.get("estimate", 0) or 0) for t in tickets if t.get("status") == "consegnato")
    pending_value = sum((t.get("estimate", 0) or 0) for t in tickets if t.get("status") in ("in_lavorazione", "pronto"))
    return {
        "phone": phone,
        "name": latest.get("customer_name", ""),
        "email": latest.get("customer_email", ""),
        "tickets_count": len(tickets),
        "total_spent": total_spent,
        "pending_value": pending_value,
        "first_visit": tickets[-1]["created_at"],
        "last_visit": tickets[0]["created_at"],
        "tickets": tickets,
    }


# Public tracking
_PUBLIC_HIDE = {"_id": 0, "pin": 0, "pattern": 0, "imei": 0, "part_cost": 0,
                "customer_phone": 0, "customer_email": 0, "notes": 0, "created_by": 0}


def _mask_name(name: Optional[str]) -> str:
    if not name:
        return ""
    parts = name.strip().split()
    if not parts:
        return ""
    first = parts[0]
    initial = parts[-1][:1] + "." if len(parts) > 1 else ""
    return f"{first} {initial}".strip()


@api.get("/public/track/{code}")
async def track(code: str, request: Request):
    check_public_rate(request)
    doc = await db.tickets.find_one({"code": code.upper()}, _PUBLIC_HIDE)
    if not doc:
        raise HTTPException(status_code=404, detail="Codice non trovato")
    doc["customer_name"] = _mask_name(doc.get("customer_name"))
    return doc


# --- Messages ---
@api.get("/tickets/{ticket_id}/messages")
async def list_messages(ticket_id: str, _: dict = Depends(get_current_user)):
    docs = await db.messages.find({"ticket_id": ticket_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return docs


@api.post("/tickets/{ticket_id}/messages")
async def create_message(ticket_id: str, data: MessageIn, user: dict = Depends(get_current_user)):
    t = await db.tickets.find_one({"id": ticket_id})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    text = (data.text or "")[:MAX_MSG_TEXT]
    photo = validate_photo_data(data.photo_data)
    if not text and not photo:
        raise HTTPException(status_code=400, detail="Messaggio vuoto")
    doc = {
        "id": str(uuid.uuid4()),
        "ticket_id": ticket_id,
        "ticket_code": t.get("code"),
        "role": "lab",
        "author": user.get("name"),
        "text": text,
        "photo_data": photo,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/public/track/{code}/messages")
async def public_list_messages(code: str, request: Request):
    check_public_rate(request)
    t = await db.tickets.find_one({"code": code.upper()}, {"_id": 0, "id": 1})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    docs = await db.messages.find({"ticket_id": t["id"]}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return docs


@api.post("/public/track/{code}/messages")
async def public_create_message(code: str, data: MessageIn, request: Request):
    check_public_rate(request)
    t = await db.tickets.find_one({"code": code.upper()})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    text = (data.text or "").strip()[:MAX_MSG_TEXT]
    if not text:
        raise HTTPException(status_code=400, detail="Messaggio vuoto")
    author = (data.author or t.get("customer_name", "Cliente"))[:80]
    doc = {
        "id": str(uuid.uuid4()),
        "ticket_id": t["id"],
        "ticket_code": t["code"],
        "role": "customer",
        "author": author,
        "text": text,
        "photo_data": None,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(doc)
    doc.pop("_id", None)
    return doc


# --- Accounting ---
def _period_range(period: str):
    now = datetime.now(timezone.utc)
    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return start.isoformat(), (start + timedelta(days=1)).isoformat()
    if period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return start.isoformat(), (now + timedelta(days=1)).isoformat()
    return "", ""


@api.get("/reports/accounting")
async def accounting_report(period: str = "month", _: dict = Depends(get_current_user)):
    start, end = _period_range(period)
    sales_q = {}
    tickets_q = {"delivered_at": {"$ne": None}}
    if start:
        sales_q = {"created_at": {"$gte": start, "$lt": end}}
        tickets_q = {"delivered_at": {"$gte": start, "$lt": end}}

    sales = await db.sales.find(sales_q, {"_id": 0}).to_list(5000)
    delivered = await db.tickets.find(tickets_q, {"_id": 0}).to_list(5000)

    sales_total = sum(s["total"] for s in sales)
    repairs_total = sum((t.get("estimate", 0) or 0) for t in delivered)
    part_cost_total = sum((t.get("part_cost", 0) or 0) for t in delivered)
    gross_revenue = sales_total + repairs_total
    net_margin = gross_revenue - part_cost_total

    return {
        "period": period,
        "sales_total": sales_total,
        "repairs_total": repairs_total,
        "gross_revenue": gross_revenue,
        "part_cost_total": part_cost_total,
        "net_margin": net_margin,
        "sales_count": len(sales),
        "delivered_count": len(delivered),
    }


# --- Expenses ---
@api.get("/expenses")
async def list_expenses(_: dict = Depends(get_current_user)):
    docs = await db.expenses.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.post("/expenses")
async def add_expense(data: ExpenseIn, _: dict = Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": now_iso()}
    await db.expenses.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/expenses/{expense_id}")
async def del_expense(expense_id: str, _: dict = Depends(require_admin)):
    await db.expenses.delete_one({"id": expense_id})
    return {"ok": True}


# --- Products ---
@api.get("/products")
async def list_products(q: Optional[str] = None, category: Optional[str] = None, _: dict = Depends(get_current_user)):
    query = {}
    if category and category != "all":
        query["category"] = category
    docs = await db.products.find(query, {"_id": 0}).sort("name", 1).to_list(5000)
    if q:
        s = q.lower()
        docs = [d for d in docs if s in d.get("name", "").lower() or s in d.get("barcode", "").lower()]
    return docs


@api.get("/products/barcode/{barcode}")
async def get_by_barcode(barcode: str, _: dict = Depends(get_current_user)):
    doc = await db.products.find_one({"barcode": barcode}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    return doc


@api.post("/products")
async def create_product(data: ProductIn, _: dict = Depends(get_current_user)):
    if data.barcode:
        existing = await db.products.find_one({"barcode": data.barcode})
        if existing:
            raise HTTPException(status_code=400, detail="Barcode già presente")
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": now_iso(), "updated_at": now_iso()}
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/products/{product_id}")
async def update_product(product_id: str, data: ProductUpdate, _: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    update["updated_at"] = now_iso()
    res = await db.products.update_one({"id": product_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    return doc


@api.post("/products/{product_id}/stock")
async def adjust_stock(product_id: str, data: StockDelta, _: dict = Depends(get_current_user)):
    doc = await db.products.find_one({"id": product_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    new_stock = max(0, int(doc.get("stock", 0)) + int(data.delta))
    await db.products.update_one(
        {"id": product_id},
        {"$set": {"stock": new_stock, "updated_at": now_iso()}},
    )
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    return doc


@api.delete("/products/{product_id}")
async def del_product(product_id: str, _: dict = Depends(require_admin)):
    await db.products.delete_one({"id": product_id})
    return {"ok": True}


# --- Sales ---
@api.get("/sales")
async def list_sales(_: dict = Depends(get_current_user)):
    docs = await db.sales.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.post("/sales")
async def add_sale(data: SaleIn, user: dict = Depends(get_current_user)):
    items = [i.model_dump() for i in data.items]
    subtotal = sum(i["price"] * i["qty"] for i in items)
    total = max(0, subtotal - (data.discount or 0))
    doc = {
        "id": str(uuid.uuid4()),
        "code": f"POS-{datetime.now().strftime('%y%m%d')}-{pysecrets.token_hex(2).upper()}",
        "items": items,
        "subtotal": subtotal,
        "discount": data.discount,
        "total": total,
        "payment_method": data.payment_method,
        "note": data.note or "",
        "cashier": user["name"],
        "created_at": now_iso(),
    }
    await db.sales.insert_one(doc)
    doc.pop("_id", None)
    return doc


# --- Dashboard ---
@api.get("/dashboard/stats")
async def dashboard_stats(_: dict = Depends(get_current_user)):
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}, "value": {"$sum": "$estimate"}}}]
    agg = await db.tickets.aggregate(pipeline).to_list(100)
    counts = {s: 0 for s in STATUS_ORDER + ["non_riparabile"]}
    values = {s: 0 for s in STATUS_ORDER + ["non_riparabile"]}
    for r in agg:
        counts[r["_id"]] = r["count"]
        values[r["_id"]] = r.get("value", 0) or 0

    denaro_fermo = (values.get("pronto", 0) or 0) + (values.get("in_lavorazione", 0) or 0)

    start_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_sales = await db.sales.find({"created_at": {"$gte": start_day}}, {"_id": 0}).to_list(500)
    today_sales_total = sum(s["total"] for s in today_sales)

    today_delivered = await db.tickets.find({"delivered_at": {"$gte": start_day}}, {"_id": 0}).to_list(500)
    today_repairs_total = sum((t.get("estimate", 0) or 0) for t in today_delivered)

    today_total = today_sales_total + today_repairs_total

    expenses = await db.expenses.find({}, {"_id": 0}).to_list(500)
    daily_fixed = 0
    for e in expenses:
        amt = e["amount"]
        p = e["period"]
        if p == "mensile":
            daily_fixed += amt / 30
        elif p == "settimanale":
            daily_fixed += amt / 7
        elif p == "annuale":
            daily_fixed += amt / 365
        else:
            daily_fixed += amt

    settings = await db.settings.find_one({"id": "singleton"}, {"_id": 0}) or {}
    target_min = settings.get("daily_target_min", 175)
    target_max = settings.get("daily_target_max", 190)

    return {
        "counts": counts,
        "denaro_fermo": denaro_fermo,
        "today_sales_total": today_sales_total,
        "today_repairs_total": today_repairs_total,
        "today_total": today_total,
        "daily_fixed_cost": round(daily_fixed, 2),
        "target_min": target_min,
        "target_max": target_max,
        "today_sales_count": len(today_sales),
        "today_delivered_count": len(today_delivered),
    }


@api.get("/reports/daily")
async def daily_report(date: Optional[str] = None, _: dict = Depends(get_current_user)):
    if date:
        day = datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
    else:
        day = datetime.now(timezone.utc)
    start = day.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    end = (day.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).isoformat()

    sales = await db.sales.find({"created_at": {"$gte": start, "$lt": end}}, {"_id": 0}).to_list(1000)
    delivered = await db.tickets.find({"delivered_at": {"$gte": start, "$lt": end}}, {"_id": 0}).to_list(1000)
    new_tickets = await db.tickets.find({"created_at": {"$gte": start, "$lt": end}}, {"_id": 0}).to_list(1000)

    by_method = {}
    for s in sales:
        by_method[s["payment_method"]] = by_method.get(s["payment_method"], 0) + s["total"]

    return {
        "date": start[:10],
        "sales": sales,
        "sales_total": sum(s["total"] for s in sales),
        "sales_by_method": by_method,
        "delivered_tickets": delivered,
        "delivered_total": sum((t.get("estimate", 0) or 0) for t in delivered),
        "new_tickets": new_tickets,
        "new_tickets_count": len(new_tickets),
    }


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)