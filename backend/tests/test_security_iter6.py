"""Security audit iteration 6 tests (SEC-001, 002, 003, 004) + regression."""
import os
import re
import time
import pytest
import requests
from pathlib import Path

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    (Path(__file__).parents[2] / "frontend" / ".env").read_text().split("REACT_APP_BACKEND_URL=")[1].strip().split("\n")[0],
).rstrip("/")

ADMIN_EMAIL = "perpixel14@gmail.com"
ADMIN_PASSWORD = "admin123"

PNG_1x1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="function")
def ticket(admin_headers):
    payload = {
        "customer_name": "Mario Rossi",
        "customer_phone": "3331112222",
        "customer_email": "mario@example.com",
        "device_brand": "Apple",
        "device_model": "iPhone 13",
        "issue": "Schermo rotto",
        "notes": "SECRET-NOTE",
        "pin": "1234",
        "pattern": "L",
        "imei": "123456789012345",
        "estimate": 100,
        "part_cost": 30,
    }
    r = requests.post(f"{BASE_URL}/api/tickets", json=payload, headers=admin_headers)
    assert r.status_code == 200, r.text
    return r.json()


# ---------------- SEC-001 ----------------
class TestSEC001:
    def test_ticket_code_format(self, ticket):
        # EDS-YYMMDD-XXXXXXXX (8 hex chars)
        assert re.match(r"^EDS-\d{6}-[0-9A-F]{8}$", ticket["code"]), ticket["code"]

    def test_public_track_pii_masked(self, ticket):
        r = requests.get(f"{BASE_URL}/api/public/track/{ticket['code']}")
        assert r.status_code == 200, r.text
        d = r.json()
        for leaked in ("customer_phone", "customer_email", "notes", "created_by", "part_cost", "pin", "pattern", "imei"):
            assert leaked not in d, f"PII leaked: {leaked} present in public response"
        # masked name: "Mario R."
        assert d["customer_name"] == "Mario R.", d["customer_name"]

    def test_public_rate_limit_200_then_429(self):
        # Note: via K8s ingress source IP rotates across proxy pods, so we hit the backend
        # directly to verify the rate-limit code works per-IP as specified.
        LOCAL = "http://0.0.0.0:8001"
        time.sleep(61)
        last = None
        for i in range(80):
            last = requests.get(f"{LOCAL}/api/public/settings").status_code
            if last == 429:
                break
        assert last == 429, f"Expected 429 within 80 reqs on direct backend; last={last}"
        time.sleep(61)


# ---------------- SEC-002 ----------------
class TestSEC002:
    def test_no_tecnico_seed_in_code(self):
        src = Path("/app/backend/server.py").read_text()
        # No seeded tecnico@edspixel.it insert in startup
        assert "tecnico@edspixel.it" not in src, "tecnico seed email still present in server.py"

    def test_change_password_flow(self, admin_headers):
        # wrong current -> 401
        r = requests.post(f"{BASE_URL}/api/auth/change-password",
                          json={"current_password": "WRONGxx", "new_password": "newpass123"},
                          headers=admin_headers)
        assert r.status_code == 401

        # short new -> 400
        r = requests.post(f"{BASE_URL}/api/auth/change-password",
                          json={"current_password": ADMIN_PASSWORD, "new_password": "short"},
                          headers=admin_headers)
        assert r.status_code == 400

        # valid -> 200
        new_pw = "tempPass123!"
        r = requests.post(f"{BASE_URL}/api/auth/change-password",
                          json={"current_password": ADMIN_PASSWORD, "new_password": new_pw},
                          headers=admin_headers)
        assert r.status_code == 200

        # old password no longer works
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 401

        # new works, and must_change_password now False
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": new_pw})
        assert r.status_code == 200
        assert r.json()["user"]["must_change_password"] is False
        new_token = r.json()["token"]

        # Restore original password
        r = requests.post(f"{BASE_URL}/api/auth/change-password",
                          json={"current_password": new_pw, "new_password": ADMIN_PASSWORD},
                          headers={"Authorization": f"Bearer {new_token}"})
        assert r.status_code == 200

        # Verify restore
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200

    def test_create_user_password_min_length(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/auth/users",
                          json={"email": f"test_{int(time.time())}@x.it", "password": "short", "name": "T", "role": "tecnico"},
                          headers=admin_headers)
        assert r.status_code == 400

        email = f"test_{int(time.time())}_ok@x.it"
        r = requests.post(f"{BASE_URL}/api/auth/users",
                          json={"email": email, "password": "longpass123", "name": "T", "role": "tecnico"},
                          headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["must_change_password"] is True
        # cleanup
        uid = r.json()["id"]
        requests.delete(f"{BASE_URL}/api/auth/users/{uid}", headers=admin_headers)


# ---------------- SEC-003 ----------------
class TestSEC003:
    def test_public_chat_text_cap_and_empty(self, ticket):
        # empty text -> 400
        r = requests.post(f"{BASE_URL}/api/public/track/{ticket['code']}/messages",
                          json={"text": "", "author": "Cliente"})
        assert r.status_code == 400

        # long text truncated to 1000
        long = "a" * 2000
        r = requests.post(f"{BASE_URL}/api/public/track/{ticket['code']}/messages",
                          json={"text": long, "author": "Cliente"})
        assert r.status_code == 200, r.text
        assert len(r.json()["text"]) == 1000

    def test_public_chat_rate_limit(self, ticket):
        LOCAL = "http://0.0.0.0:8001"
        time.sleep(61)
        code = ticket["code"]
        last = None
        for i in range(80):
            last = requests.post(f"{LOCAL}/api/public/track/{code}/messages",
                                 json={"text": f"m{i}", "author": "C"}).status_code
            if last == 429:
                break
        assert last == 429, f"Expected 429 within 80 posts; last={last}"
        time.sleep(61)


# ---------------- SEC-004 ----------------
class TestSEC004:
    def test_photo_html_rejected(self, ticket, admin_headers):
        r = requests.post(f"{BASE_URL}/api/tickets/{ticket['id']}/messages",
                          json={"text": "x", "photo_data": "data:text/html;base64,PHNjcmlwdD4="},
                          headers=admin_headers)
        assert r.status_code == 400

    def test_photo_valid_png(self, ticket, admin_headers):
        r = requests.post(f"{BASE_URL}/api/tickets/{ticket['id']}/messages",
                          json={"text": "ok", "photo_data": PNG_1x1},
                          headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["photo_data"] == PNG_1x1

    def test_photo_too_large(self, ticket, admin_headers):
        huge = "data:image/png;base64," + ("A" * (6 * 1024 * 1024 + 10))
        r = requests.post(f"{BASE_URL}/api/tickets/{ticket['id']}/messages",
                          json={"text": "big", "photo_data": huge},
                          headers=admin_headers)
        assert r.status_code == 413

    def test_public_chat_strips_photo(self, ticket):
        r = requests.post(f"{BASE_URL}/api/public/track/{ticket['code']}/messages",
                          json={"text": "with photo", "photo_data": PNG_1x1, "author": "C"})
        assert r.status_code == 200
        assert r.json()["photo_data"] is None


# ---------------- Regression ----------------
class TestRegression:
    def test_tickets_list(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/tickets", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_dashboard_stats(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        assert "counts" in d and "today_total" in d

    def test_customers(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/customers", headers=admin_headers)
        assert r.status_code == 200

    def test_products(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/products", headers=admin_headers)
        assert r.status_code == 200

    def test_update_delete_ticket(self, admin_headers, ticket):
        r = requests.put(f"{BASE_URL}/api/tickets/{ticket['id']}",
                         json={"notes": "updated"}, headers=admin_headers)
        assert r.status_code == 200
        r = requests.delete(f"{BASE_URL}/api/tickets/{ticket['id']}", headers=admin_headers)
        assert r.status_code == 200
