"""Backend API tests for Seldaesthetic — iteration 2 (JWT auth + upload + history + milestones)"""
import os
import io
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"

# 1x1 transparent PNG (~70 bytes)
PNG_BYTES = (
    b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
    b'\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf'
    b'\xc0\x00\x00\x00\x03\x00\x01\xfe\xc6\xa9\xc6\x00\x00\x00\x00IEND\xaeB`\x82'
)


# ------------- fixtures -------------
@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    return sess


@pytest.fixture(scope="module")
def token(s):
    r = s.post(f"{API}/admin/login", json={"password": "selda123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ------------- root + login -------------
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200 and r.json().get("status") == "ok"


def test_admin_login_wrong(s):
    r = s.post(f"{API}/admin/login", json={"password": "wrong"})
    assert r.status_code == 401


def test_admin_login_correct_returns_token(s):
    r = s.post(f"{API}/admin/login", json={"password": "selda123"})
    assert r.status_code == 200
    d = r.json()
    assert d.get("success") is True
    assert isinstance(d.get("token"), str) and len(d["token"]) > 20


def test_admin_verify_with_token(s, auth):
    r = s.get(f"{API}/admin/verify", headers=auth)
    assert r.status_code == 200 and r.json().get("valid") is True


# ------------- auth enforcement -------------
def test_auth_enforcement_no_token(s):
    """All admin write endpoints must return 401 without Bearer token."""
    cases = [
        ("POST", f"{API}/offers", {"title": "x", "description": "x", "price": "x", "image_url": "x"}),
        ("PUT", f"{API}/offers/dummy", {"price": "y"}),
        ("DELETE", f"{API}/offers/dummy", None),
        ("POST", f"{API}/loyalty/stamp", {"device_id": "DEV_ITER2_AUTH"}),
        ("POST", f"{API}/loyalty/reset", {"device_id": "DEV_ITER2_AUTH"}),
        ("GET", f"{API}/admin/loyalty", None),
        ("GET", f"{API}/admin/loyalty/DEV_ITER2_AUTH/history", None),
    ]
    for method, url, body in cases:
        r = s.request(method, url, json=body)
        assert r.status_code == 401, f"{method} {url} expected 401 got {r.status_code}"

    # upload (multipart)
    r = s.post(f"{API}/upload", files={"file": ("a.png", PNG_BYTES, "image/png")})
    assert r.status_code == 401


def test_auth_enforcement_invalid_token(s):
    bad = {"Authorization": "Bearer garbage.token.value"}
    r = s.post(f"{API}/offers", json={"title": "x", "description": "x", "price": "x", "image_url": "x"}, headers=bad)
    assert r.status_code == 401
    r = s.get(f"{API}/admin/loyalty", headers=bad)
    assert r.status_code == 401


# ------------- offers (with token) -------------
def test_offers_crud(s, auth):
    r = s.get(f"{API}/offers")
    assert r.status_code == 200 and isinstance(r.json(), list)

    payload = {"title": "TEST_PW_Offer_Iter2", "description": "d", "price": "kr 999",
               "before_price": "kr 1999", "image_url": "https://example.com/x.jpg", "badge": "TEST"}
    r = s.post(f"{API}/offers", json=payload, headers=auth)
    assert r.status_code == 200, r.text
    oid = r.json()["id"]
    assert r.json()["title"] == payload["title"]

    r = s.put(f"{API}/offers/{oid}", json={"price": "kr 555"}, headers=auth)
    assert r.status_code == 200 and r.json()["price"] == "kr 555"

    r = s.delete(f"{API}/offers/{oid}", headers=auth)
    assert r.status_code == 200 and r.json().get("deleted") is True

    r = s.delete(f"{API}/offers/{oid}", headers=auth)
    assert r.status_code == 404


# ------------- loyalty milestones + reset -------------
def test_loyalty_milestones_and_reset(s, auth):
    device_id = f"DEV_ITER2_{uuid.uuid4().hex[:10]}"
    expected = {3: "10%", 6: "20%", 10: "Gratis peel"}
    for i in range(1, 11):
        r = s.post(f"{API}/loyalty/stamp", json={"device_id": device_id}, headers=auth)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["stamps"] == i
        assert d.get("milestone") == expected.get(i), f"stamp {i} milestone mismatch: {d.get('milestone')}"

    # 11th should fail
    r = s.post(f"{API}/loyalty/stamp", json={"device_id": device_id}, headers=auth)
    assert r.status_code == 400
    assert "fullt" in r.json().get("detail", "").lower()

    # reset increments total_completed
    r = s.post(f"{API}/loyalty/reset", json={"device_id": device_id}, headers=auth)
    assert r.status_code == 200
    d = r.json()
    assert d["stamps"] == 0
    assert d["total_completed"] == 1


# ------------- admin loyalty list + history -------------
def test_admin_loyalty_list_and_history(s, auth):
    device_id = f"DEV_ITER2_HIST_{uuid.uuid4().hex[:8]}"
    # create 3 stamps to log events
    for _ in range(3):
        s.post(f"{API}/loyalty/stamp", json={"device_id": device_id}, headers=auth)
    # reset (no stamps>=10, but should still log reset event)
    s.post(f"{API}/loyalty/reset", json={"device_id": device_id}, headers=auth)

    # list
    r = s.get(f"{API}/admin/loyalty", headers=auth)
    assert r.status_code == 200
    lst = r.json()
    assert isinstance(lst, list)
    assert any(c.get("device_id") == device_id for c in lst)

    # history
    r = s.get(f"{API}/admin/loyalty/{device_id}/history", headers=auth)
    assert r.status_code == 200
    data = r.json()
    assert "card" in data and "events" in data
    events = data["events"]
    assert len(events) >= 4  # 3 stamps + 1 reset
    types = [e["type"] for e in events]
    assert "stamp" in types and "reset" in types
    # events ordered desc by created_at - first should be the most recent (reset)
    assert events[0]["type"] == "reset"
    # stamp at index 3 (from the end) should have milestone=10% (stamps_after=3)
    stamp_events = [e for e in events if e["type"] == "stamp"]
    milestone_3 = next((e for e in stamp_events if e["stamps_after"] == 3), None)
    assert milestone_3 and milestone_3.get("milestone") == "10%"

    # history for nonexistent
    r = s.get(f"{API}/admin/loyalty/nonexistent_xyz_123/history", headers=auth)
    assert r.status_code == 404


# ------------- upload -------------
def test_upload_rejects_non_image(s, auth):
    r = s.post(f"{API}/upload", files={"file": ("a.txt", b"hello", "text/plain")}, headers=auth)
    assert r.status_code == 400


def test_upload_image_success_and_download(s, auth):
    r = s.post(f"{API}/upload",
               files={"file": ("test.png", PNG_BYTES, "image/png")},
               headers=auth)
    # If storage init fails (no EMERGENT_LLM_KEY), it returns 503 — skip rather than fail hard
    if r.status_code == 503:
        pytest.skip(f"Object storage unavailable: {r.text}")
    assert r.status_code == 200, r.text
    d = r.json()
    assert "id" in d and "url" in d and "path" in d
    assert d["url"].startswith("/api/files/")

    # Download via public files endpoint
    dl = requests.get(f"{BASE_URL}{d['url']}")
    assert dl.status_code == 200
    assert dl.headers.get("content-type", "").startswith("image/")
    assert len(dl.content) > 0


def test_upload_too_large(s, auth):
    big = b"\x00" * (9 * 1024 * 1024)  # 9MB
    r = s.post(f"{API}/upload",
               files={"file": ("big.png", big, "image/png")},
               headers=auth)
    if r.status_code == 503:
        pytest.skip("Object storage unavailable")
    assert r.status_code == 413
