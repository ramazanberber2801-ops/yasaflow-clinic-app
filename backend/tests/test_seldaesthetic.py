"""Backend API tests for Seldaesthetic"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://seldaesthetic-luxury.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# --- Admin ---
def test_admin_login_wrong(s):
    r = s.post(f"{API}/admin/login", json={"password": "wrong"})
    assert r.status_code == 401


def test_admin_login_correct(s):
    r = s.post(f"{API}/admin/login", json={"password": "selda123"})
    assert r.status_code == 200
    data = r.json()
    assert data.get("success") is True
    assert isinstance(data.get("token"), str) and len(data["token"]) > 0


# --- Offers CRUD ---
def test_offers_crud(s):
    # List
    r = s.get(f"{API}/offers")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

    # Create
    payload = {
        "title": "TEST_Offer",
        "description": "Test description",
        "price": "kr 999",
        "before_price": "kr 1 999",
        "image_url": "https://example.com/test.jpg",
        "badge": "TEST",
    }
    r = s.post(f"{API}/offers", json=payload)
    assert r.status_code == 200, r.text
    created = r.json()
    assert created["title"] == "TEST_Offer"
    assert "id" in created
    oid = created["id"]

    # Verify list includes
    r = s.get(f"{API}/offers")
    assert any(o["id"] == oid for o in r.json())

    # Update
    r = s.put(f"{API}/offers/{oid}", json={"price": "kr 555"})
    assert r.status_code == 200
    assert r.json()["price"] == "kr 555"
    assert r.json()["title"] == "TEST_Offer"

    # Update missing
    r = s.put(f"{API}/offers/nonexistent-id", json={"price": "x"})
    assert r.status_code == 404

    # Delete
    r = s.delete(f"{API}/offers/{oid}")
    assert r.status_code == 200
    assert r.json().get("deleted") is True

    # Delete missing
    r = s.delete(f"{API}/offers/{oid}")
    assert r.status_code == 404


# --- Loyalty ---
def test_loyalty_flow(s):
    device_id = f"TEST_{uuid.uuid4().hex[:12]}"

    # GET creates
    r = s.get(f"{API}/loyalty/{device_id}")
    assert r.status_code == 200
    card = r.json()
    assert card["device_id"] == device_id
    assert card["stamps"] == 0
    assert card["total_completed"] == 0

    # Stamp 10 times
    for i in range(1, 11):
        r = s.post(f"{API}/loyalty/stamp", json={"device_id": device_id})
        assert r.status_code == 200, r.text
        assert r.json()["stamps"] == i

    # 11th should fail
    r = s.post(f"{API}/loyalty/stamp", json={"device_id": device_id})
    assert r.status_code == 400
    assert "fullt" in r.json().get("detail", "").lower()

    # Reset
    r = s.post(f"{API}/loyalty/reset", json={"device_id": device_id})
    assert r.status_code == 200
    data = r.json()
    assert data["stamps"] == 0
    assert data["total_completed"] == 1

    # Reset nonexistent
    r = s.post(f"{API}/loyalty/reset", json={"device_id": "nonexistent_test_id_xyz"})
    assert r.status_code == 404


def test_loyalty_stamp_creates_new(s):
    device_id = f"TEST_{uuid.uuid4().hex[:12]}"
    r = s.post(f"{API}/loyalty/stamp", json={"device_id": device_id})
    assert r.status_code == 200
    assert r.json()["stamps"] == 1
