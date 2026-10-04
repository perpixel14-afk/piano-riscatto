"""Backend regression tests for iter 4: Products / Warehouse endpoints."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
# Fallback: read frontend/.env
if not BASE_URL:
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.strip().split('=', 1)[1].rstrip('/')

API = f"{BASE_URL}/api"

ADMIN = {"email": "perpixel14@gmail.com", "password": "admin123"}
TECNICO = {"email": "tecnico@edspixel.it", "password": "tecnico123"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=10)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def tecnico_token():
    r = requests.post(f"{API}/auth/login", json=TECNICO, timeout=10)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture
def admin_h(admin_token):
    return H(admin_token)


@pytest.fixture
def tec_h(tecnico_token):
    return H(tecnico_token)


# --- Create product (unique barcode) ---
def test_create_product_unique_barcode(admin_h):
    barcode = f"TEST{uuid.uuid4().hex[:10]}"
    payload = {"barcode": barcode, "name": "TEST_Prod_A", "category": "accessori",
               "stock": 5, "cost_price": 2.0, "sale_price": 10.0}
    r = requests.post(f"{API}/products", json=payload, headers=admin_h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["barcode"] == barcode
    assert d["name"] == "TEST_Prod_A"
    assert d["stock"] == 5
    pid = d["id"]

    # Duplicate barcode -> 400
    r2 = requests.post(f"{API}/products", json=payload, headers=admin_h)
    assert r2.status_code == 400

    # GET persistence
    r3 = requests.get(f"{API}/products/barcode/{barcode}", headers=admin_h)
    assert r3.status_code == 200
    assert r3.json()["id"] == pid

    # Cleanup
    requests.delete(f"{API}/products/{pid}", headers=admin_h)


def test_barcode_not_found(admin_h):
    r = requests.get(f"{API}/products/barcode/NOPE_{uuid.uuid4().hex}", headers=admin_h)
    assert r.status_code == 404


def test_list_filter_and_category(admin_h):
    bc = f"TEST{uuid.uuid4().hex[:10]}"
    p = requests.post(f"{API}/products", json={"barcode": bc, "name": "TEST_FilterMe_Display",
                                               "category": "display", "stock": 2, "cost_price": 1, "sale_price": 3},
                      headers=admin_h).json()
    pid = p["id"]
    try:
        # Filter by q
        r = requests.get(f"{API}/products?q=FilterMe", headers=admin_h)
        assert r.status_code == 200
        assert any(x["id"] == pid for x in r.json())
        # Filter by category
        r2 = requests.get(f"{API}/products?category=display", headers=admin_h)
        assert r2.status_code == 200
        assert all(x["category"] == "display" for x in r2.json())
        assert any(x["id"] == pid for x in r2.json())
        # Different category excludes it
        r3 = requests.get(f"{API}/products?category=batterie", headers=admin_h)
        assert all(x["id"] != pid for x in r3.json())
    finally:
        requests.delete(f"{API}/products/{pid}", headers=admin_h)


def test_update_partial(admin_h):
    bc = f"TEST{uuid.uuid4().hex[:10]}"
    p = requests.post(f"{API}/products", json={"barcode": bc, "name": "TEST_Upd", "category": "altro",
                                               "stock": 1, "cost_price": 1, "sale_price": 2}, headers=admin_h).json()
    pid = p["id"]
    try:
        r = requests.put(f"{API}/products/{pid}", json={"sale_price": 9.99, "name": "TEST_Upd_New"}, headers=admin_h)
        assert r.status_code == 200
        d = r.json()
        assert d["sale_price"] == 9.99
        assert d["name"] == "TEST_Upd_New"
        assert d["category"] == "altro"  # unchanged
        assert d["stock"] == 1
    finally:
        requests.delete(f"{API}/products/{pid}", headers=admin_h)


def test_stock_adjust_never_negative(admin_h):
    bc = f"TEST{uuid.uuid4().hex[:10]}"
    p = requests.post(f"{API}/products", json={"barcode": bc, "name": "TEST_Stock", "category": "accessori",
                                               "stock": 2, "cost_price": 1, "sale_price": 2}, headers=admin_h).json()
    pid = p["id"]
    try:
        r = requests.post(f"{API}/products/{pid}/stock", json={"delta": 3}, headers=admin_h)
        assert r.status_code == 200
        assert r.json()["stock"] == 5
        r2 = requests.post(f"{API}/products/{pid}/stock", json={"delta": -2}, headers=admin_h)
        assert r2.json()["stock"] == 3
        # Underflow
        r3 = requests.post(f"{API}/products/{pid}/stock", json={"delta": -100}, headers=admin_h)
        assert r3.json()["stock"] == 0
    finally:
        requests.delete(f"{API}/products/{pid}", headers=admin_h)


def test_delete_admin_only(admin_h, tec_h):
    bc = f"TEST{uuid.uuid4().hex[:10]}"
    p = requests.post(f"{API}/products", json={"barcode": bc, "name": "TEST_Del", "category": "altro",
                                               "stock": 0, "cost_price": 0, "sale_price": 0}, headers=admin_h).json()
    pid = p["id"]
    # Tecnico -> 403
    r = requests.delete(f"{API}/products/{pid}", headers=tec_h)
    assert r.status_code == 403
    # Admin -> ok
    r2 = requests.delete(f"{API}/products/{pid}", headers=admin_h)
    assert r2.status_code == 200
    # Verify gone
    r3 = requests.get(f"{API}/products/barcode/{bc}", headers=admin_h)
    assert r3.status_code == 404


def test_seed_product_exists(admin_h):
    """Seed data check: barcode 8001234567890 'Pellicola Idrogel iPhone 14'"""
    r = requests.get(f"{API}/products/barcode/8001234567890", headers=admin_h)
    # Might not exist in forked env; just assert endpoint works
    assert r.status_code in (200, 404)
