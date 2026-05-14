import os
import io
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://jlt-fragrances.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"
ADMIN_EMAIL = "admin@jltfragrances.com"
ADMIN_PASSWORD = "Admin@123"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


# ---- Public catalog ----
def test_root_product_count(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    data = r.json()
    assert data["products"] >= 700, f"expected ~791, got {data['products']}"


def test_products_list_default(session):
    r = session.get(f"{API}/products")
    assert r.status_code == 200
    j = r.json()
    assert "items" in j and "total" in j
    assert len(j["items"]) > 0
    p = j["items"][0]
    assert "_id" not in p
    for k in ["slug", "name", "brand_inspiration", "base_price", "sizes"]:
        assert k in p


@pytest.mark.parametrize("params", [
    {"q": "oud"},
    {"gender": "Men"},
    {"bestseller": "true"},
    {"new_arrival": "true"},
    {"size": "50ml"},
    {"sort": "price_asc"},
    {"sort": "price_desc"},
    {"sort": "rating"},
    {"sort": "new"},
    {"page": 2, "limit": 10},
    {"longevity": "Long Lasting"},
    {"projection": "Strong"},
])
def test_products_filters(session, params):
    r = session.get(f"{API}/products", params=params)
    assert r.status_code == 200, f"{params} -> {r.text}"
    assert "items" in r.json()


def test_products_filter_meta(session):
    r = session.get(f"{API}/products/filters")
    assert r.status_code == 200
    j = r.json()
    for k in ["brands", "scent_families", "moods", "occasions", "genders", "sizes", "longevity", "projection"]:
        assert k in j and len(j[k]) > 0
    assert len(j["brands"]) > 5


def test_bestsellers(session):
    r = session.get(f"{API}/products/bestsellers")
    assert r.status_code == 200
    items = r.json()["items"]
    assert isinstance(items, list)
    if items:
        assert all(p.get("is_bestseller") for p in items)


def test_get_product_detail_and_related(session):
    lst = session.get(f"{API}/products", params={"limit": 1}).json()["items"]
    slug = lst[0]["slug"]
    r = session.get(f"{API}/products/{slug}")
    assert r.status_code == 200
    j = r.json()
    assert j["product"]["slug"] == slug
    assert isinstance(j["related"], list)


def test_get_product_404(session):
    r = session.get(f"{API}/products/no-such-slug-xyz")
    assert r.status_code == 404


# ---- Quiz / Discovery / Contact ----
def test_quiz_recommend(session):
    r = session.post(f"{API}/quiz/recommend", json={
        "scent": "Fresh", "occasion": "Office", "projection": "Moderate",
        "budget": 999, "gender": "Men"
    })
    assert r.status_code == 200
    items = r.json()["items"]
    assert isinstance(items, list) and len(items) <= 5


def test_discovery_sets(session):
    r = session.get(f"{API}/discovery-sets")
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 5
    slugs = {i["slug"] for i in items}
    assert "5-scent-discovery" in slugs


def test_contact(session):
    r = session.post(f"{API}/contact", json={
        "name": "TEST_User", "email": "test@example.com",
        "phone": "+911234567890", "message": "TEST_message"
    })
    assert r.status_code == 200
    assert r.json()["ok"] is True


# ---- Reviews ----
def test_reviews_get_and_post(session):
    lst = session.get(f"{API}/products", params={"limit": 1}).json()["items"]
    slug = lst[0]["slug"]
    r = session.get(f"{API}/reviews/{slug}")
    assert r.status_code == 200
    before = len(r.json()["items"])
    r2 = session.post(f"{API}/reviews/{slug}", json={
        "name": "TEST_Reviewer", "rating": 5, "title": "Nice", "comment": "TEST_great scent"
    })
    assert r2.status_code == 200
    r3 = session.get(f"{API}/reviews/{slug}")
    assert len(r3.json()["items"]) == before + 1


# ---- Auth ----
def test_login_invalid(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_login_success_and_me(session, admin_token):
    r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL
    assert r.json()["role"] == "admin"


def test_me_requires_token(session):
    r = session.get(f"{API}/auth/me")
    assert r.status_code == 401


# ---- Admin CRUD ----
def test_admin_crud_product(session, admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "name": "TEST_Inspired_Scent", "brand_inspiration": "TestBrand",
        "scent_family": ["Fresh"], "moods": ["Fresh"], "gender": "Unisex",
        "occasions": ["Office"], "seasons": ["Summer"],
        "longevity": "Long Lasting (6-8 hrs)", "projection": "Moderate",
        "notes": {"top": ["lemon"], "heart": ["jasmine"], "base": ["musk"]},
        "smells_like": "fresh", "best_for": "office", "who_should_buy": "anyone",
    }
    r = session.post(f"{API}/admin/products", json=payload, headers=h)
    assert r.status_code == 200, r.text
    slug = r.json()["product"]["slug"]
    # Verify
    g = session.get(f"{API}/products/{slug}")
    assert g.status_code == 200
    # Update
    payload["smells_like"] = "TEST_updated"
    u = session.put(f"{API}/admin/products/{slug}", json=payload, headers=h)
    assert u.status_code == 200
    g2 = session.get(f"{API}/products/{slug}").json()["product"]
    assert g2["smells_like"] == "TEST_updated"
    # Delete
    d = session.delete(f"{API}/admin/products/{slug}", headers=h)
    assert d.status_code == 200
    assert session.get(f"{API}/products/{slug}").status_code == 404


def test_admin_requires_token(session):
    r = session.delete(f"{API}/admin/products/any-slug")
    assert r.status_code == 401


def test_csv_import(session, admin_token):
    csv_data = "brand_inspiration,name\nTEST_BrandX,TEST_NameOne\nTEST_BrandX,TEST_NameTwo\n"
    files = {"file": ("test.csv", io.BytesIO(csv_data.encode()), "text/csv")}
    r = requests.post(f"{API}/admin/products/import-csv", files=files,
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200, r.text
    assert r.json()["inserted"] == 2
    # cleanup
    lst = session.get(f"{API}/products", params={"q": "TEST_BrandX", "limit": 20}).json()["items"]
    for p in lst:
        session.delete(f"{API}/admin/products/{p['slug']}", headers={"Authorization": f"Bearer {admin_token}"})
