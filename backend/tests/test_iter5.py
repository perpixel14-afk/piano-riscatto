"""Iteration 5: tickets part_cost, status flow, messages (lab+public), accounting periods."""
import os
import pytest
import requests
from pathlib import Path

def _load_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    env = Path("/app/frontend/.env")
    for line in env.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not found")

BASE_URL = _load_url()

ADMIN = {"email": "perpixel14@gmail.com", "password": "admin123"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- Accounting ----------
class TestAccounting:
    def _assert_shape(self, data, expected_period):
        for k in ("gross_revenue", "part_cost_total", "net_margin", "sales_count", "delivered_count"):
            assert k in data, f"missing {k} in {data}"
        assert data["period"] == expected_period
        assert data["net_margin"] == pytest.approx(data["gross_revenue"] - data["part_cost_total"], abs=0.01)

    def test_accounting_today(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/reports/accounting?period=today", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        self._assert_shape(r.json(), "today")

    def test_accounting_month(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/reports/accounting?period=month", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        self._assert_shape(r.json(), "month")

    def test_accounting_all(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/reports/accounting?period=all", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        self._assert_shape(r.json(), "all")

    def test_accounting_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/reports/accounting?period=today", timeout=15)
        assert r.status_code in (401, 403)


# ---------- Tickets part_cost + status flow + messages ----------
class TestTicketsAndMessages:
    created_id = None
    created_code = None

    def test_create_ticket_with_part_cost(self, auth_headers):
        payload = {
            "customer_name": "TEST Iter5 Cliente",
            "customer_phone": "+390000000500",
            "device_brand": "TESTBRAND",
            "device_model": "TESTMODEL",
            "issue": "test iter5",
            "estimate": 100,
            "part_cost": 30,
        }
        r = requests.post(f"{BASE_URL}/api/tickets", headers=auth_headers, json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        d = r.json()
        assert d.get("part_cost") == 30
        assert "code" in d and "id" in d
        TestTicketsAndMessages.created_id = d["id"]
        TestTicketsAndMessages.created_code = d["code"]

    def test_update_part_cost(self, auth_headers):
        tid = TestTicketsAndMessages.created_id
        assert tid
        r = requests.put(f"{BASE_URL}/api/tickets/{tid}", headers=auth_headers, json={"part_cost": 45}, timeout=15)
        assert r.status_code == 200, r.text
        # verify via GET
        g = requests.get(f"{BASE_URL}/api/tickets/{tid}", headers=auth_headers, timeout=15)
        assert g.status_code == 200
        assert g.json().get("part_cost") == 45

    def test_public_track_excludes_part_cost(self):
        code = TestTicketsAndMessages.created_code
        assert code
        r = requests.get(f"{BASE_URL}/api/public/track/{code}", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "part_cost" not in d
        assert "pin" not in d

    def test_status_valutazione(self, auth_headers):
        tid = TestTicketsAndMessages.created_id
        r = requests.patch(
            f"{BASE_URL}/api/tickets/{tid}/status",
            headers=auth_headers, json={"status": "valutazione", "note": "test"}, timeout=15,
        )
        assert r.status_code == 200, r.text

    def test_status_attesa_ricambi(self, auth_headers):
        tid = TestTicketsAndMessages.created_id
        # need to go valutazione -> in_lavorazione -> attesa_ricambi (if sequential enforced)
        for s in ("in_lavorazione", "attesa_ricambi"):
            r = requests.patch(
                f"{BASE_URL}/api/tickets/{tid}/status",
                headers=auth_headers, json={"status": s}, timeout=15,
            )
            assert r.status_code == 200, f"status {s}: {r.text}"

    def test_lab_message_text_and_photo(self, auth_headers):
        tid = TestTicketsAndMessages.created_id
        payload = {"text": "TEST lab msg", "photo_data": "data:image/png;base64,AAAA"}
        r = requests.post(f"{BASE_URL}/api/tickets/{tid}/messages", headers=auth_headers, json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        d = r.json()
        assert d["role"] == "lab"
        assert d["text"] == "TEST lab msg"
        assert d["photo_data"] == "data:image/png;base64,AAAA"
        assert d.get("author")

    def test_lab_list_messages_requires_auth(self, auth_headers):
        tid = TestTicketsAndMessages.created_id
        r = requests.get(f"{BASE_URL}/api/tickets/{tid}/messages", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        msgs = r.json()
        assert any(m["role"] == "lab" for m in msgs)
        # unauth
        r2 = requests.get(f"{BASE_URL}/api/tickets/{tid}/messages", timeout=15)
        assert r2.status_code in (401, 403)

    def test_public_message_customer(self):
        code = TestTicketsAndMessages.created_code
        payload = {"text": "TEST customer msg", "photo_data": "data:image/png;base64,SHOULDBEIGNORED"}
        r = requests.post(f"{BASE_URL}/api/public/track/{code}/messages", json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        d = r.json()
        assert d["role"] == "customer"
        assert d["photo_data"] is None
        assert d["text"] == "TEST customer msg"

    def test_public_list_messages(self):
        code = TestTicketsAndMessages.created_code
        r = requests.get(f"{BASE_URL}/api/public/track/{code}/messages", timeout=15)
        assert r.status_code == 200
        msgs = r.json()
        roles = {m["role"] for m in msgs}
        assert "lab" in roles and "customer" in roles

    def test_cleanup(self, auth_headers):
        tid = TestTicketsAndMessages.created_id
        if tid:
            requests.delete(f"{BASE_URL}/api/tickets/{tid}", headers=auth_headers, timeout=15)
