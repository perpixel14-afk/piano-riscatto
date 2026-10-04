"""Backend tests for iteration 3: platform_name + theme in settings."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://pixel-workshop-pro.preview.emergentagent.com").rstrip("/")

ADMIN = {"email": "perpixel14@gmail.com", "password": "admin123"}
TECNICO = {"email": "tecnico@edspixel.it", "password": "tecnico123"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def tecnico_token():
    return _login(TECNICO)


# --- Public settings (no auth) ---
def test_public_settings_contains_platform_name_and_theme():
    r = requests.get(f"{BASE_URL}/api/public/settings", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "platform_name" in data
    assert "theme" in data
    assert "business_name" in data
    assert "phone" in data
    assert "address" in data
    assert data["theme"] in ("quantum", "emerald", "cyber")


# --- GET settings (auth) ---
def test_get_settings_has_defaults(admin_token):
    r = requests.get(f"{BASE_URL}/api/settings", headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
    assert r.status_code == 200
    s = r.json()
    assert "platform_name" in s
    assert "theme" in s
    assert s["theme"] in ("quantum", "emerald", "cyber")


# --- PUT settings persistence ---
def test_put_settings_persists_platform_and_theme(admin_token):
    hdrs = {"Authorization": f"Bearer {admin_token}"}
    # Get current
    cur = requests.get(f"{BASE_URL}/api/settings", headers=hdrs, timeout=15).json()
    # Set to emerald + custom platform name
    payload = {**cur}
    payload.pop("id", None)
    payload["platform_name"] = "Pixel Lab Pro"
    payload["theme"] = "emerald"
    r = requests.put(f"{BASE_URL}/api/settings", json=payload, headers=hdrs, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["platform_name"] == "Pixel Lab Pro"
    assert body["theme"] == "emerald"
    # Verify via GET
    r2 = requests.get(f"{BASE_URL}/api/settings", headers=hdrs, timeout=15).json()
    assert r2["platform_name"] == "Pixel Lab Pro"
    assert r2["theme"] == "emerald"
    # Verify public exposes new values
    pub = requests.get(f"{BASE_URL}/api/public/settings", timeout=15).json()
    assert pub["platform_name"] == "Pixel Lab Pro"
    assert pub["theme"] == "emerald"

    # Try each theme
    for t in ("cyber", "quantum"):
        payload["theme"] = t
        rr = requests.put(f"{BASE_URL}/api/settings", json=payload, headers=hdrs, timeout=15)
        assert rr.status_code == 200
        assert rr.json()["theme"] == t

    # Reset to defaults
    payload["platform_name"] = "Pixel Lab"
    payload["theme"] = "quantum"
    requests.put(f"{BASE_URL}/api/settings", json=payload, headers=hdrs, timeout=15)


def test_put_settings_invalid_theme_rejected(admin_token):
    hdrs = {"Authorization": f"Bearer {admin_token}"}
    cur = requests.get(f"{BASE_URL}/api/settings", headers=hdrs, timeout=15).json()
    cur.pop("id", None)
    cur["theme"] = "notatheme"
    r = requests.put(f"{BASE_URL}/api/settings", json=cur, headers=hdrs, timeout=15)
    assert r.status_code == 422


def test_put_settings_tecnico_forbidden(tecnico_token):
    hdrs = {"Authorization": f"Bearer {tecnico_token}"}
    payload = {"business_name": "x", "platform_name": "Pixel Lab", "theme": "quantum",
               "vat": "0", "address": "a", "phone": "p", "email": "e@e.it",
               "warranty_terms": "", "conditions": "", "daily_target_min": 175, "daily_target_max": 190}
    r = requests.put(f"{BASE_URL}/api/settings", json=payload, headers=hdrs, timeout=15)
    assert r.status_code == 403


# --- Regression ---
def test_admin_login_works():
    _login(ADMIN)


def test_tecnico_login_works():
    _login(TECNICO)


def test_dashboard_stats(admin_token):
    r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ("counts", "denaro_fermo", "target_min", "target_max", "daily_fixed_cost"):
        assert k in d
