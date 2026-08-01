"""
Backend regression tests for Shine AI Ranking Portal.
Covers: auth (login/me/refresh guard), feed (status/latest), catalog (1111),
categories, timeline, install scripts (bash/docker/kubernetes + 400).
"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USER = "ShineHealthCareAdmin"
ADMIN_PASS = "ShineHealthCare123"


# --------- Fixtures ---------
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def sample_tool(session):
    r = session.get(f"{API}/feed/latest", timeout=30)
    assert r.status_code == 200
    data = r.json()
    tools = data.get("tools") or []
    if not tools:
        pytest.skip("Feed is empty; snapshot not ready.")
    return tools[0]


# --------- Health / root ---------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# --------- Feed ---------
class TestFeed:
    def test_status_shape(self, session):
        r = session.get(f"{API}/feed/status", timeout=15)
        assert r.status_code == 200
        d = r.json()
        # Berlin timezone strings present
        assert "current_berlin_time" in d
        assert "next_refresh" in d and "08:44" in d["next_refresh"]
        assert d.get("total_catalog") == 1111
        assert d.get("sources_active", 0) >= 1
        assert isinstance(d.get("tools_count"), int)

    def test_latest_has_50_tools(self, session):
        r = session.get(f"{API}/feed/latest", timeout=30)
        assert r.status_code == 200
        d = r.json()
        if d.get("status") == "empty":
            pytest.skip("Snapshot still generating.")
        assert d.get("tools_count") == 50, f"Expected 50 tools, got {d.get('tools_count')}"
        tools = d.get("tools") or []
        assert len(tools) == 50
        # required fields
        t = tools[0]
        for k in ("rank", "name", "url", "category", "install_scripts"):
            assert k in t, f"missing {k} in tool"
        # install_scripts must include the three formats
        scripts = t["install_scripts"]
        for fmt in ("bash", "docker", "kubernetes"):
            assert fmt in scripts and scripts[fmt].strip(), f"missing script {fmt}"


# --------- Catalog ---------
class TestCatalog:
    def test_catalog_1111(self, session):
        r = session.get(f"{API}/sources/catalog", params={"limit": 1200}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 1111
        assert d["returned"] == 1111
        assert len(d["items"]) == 1111
        # each entry must have name/url/category
        for it in d["items"][:5]:
            assert "name" in it and "url" in it and "category" in it

    def test_catalog_active_only(self, session):
        r = session.get(f"{API}/sources/catalog", params={"limit": 1200, "active_only": "true"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 1111
        # only active items returned
        assert all(it.get("active") is True for it in d["items"])
        assert len(d["items"]) == d["active"]
        assert d["active"] >= 1


# --------- Categories ---------
class TestCategories:
    def test_categories_non_empty(self, session):
        r = session.get(f"{API}/categories", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d.get("categories"), list)
        # Feed exists (verified above) → should have categories
        assert len(d["categories"]) >= 1
        c = d["categories"][0]
        assert "name" in c and "count" in c
        assert isinstance(c["count"], int)


# --------- Timeline ---------
class TestTimeline:
    def test_timeline_history(self, session):
        r = session.get(f"{API}/timeline", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d
        assert isinstance(d["items"], list)
        if d["items"]:
            item = d["items"][0]
            for k in ("generated_at_berlin", "tools_count", "sources_active", "total_catalog"):
                assert k in item


# --------- Auth ---------
class TestAuth:
    def test_login_success(self, session):
        r = session.post(f"{API}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["token_type"] == "bearer"
        assert d["username"] == ADMIN_USER
        assert isinstance(d["access_token"], str) and len(d["access_token"]) > 20

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"username": "wrong", "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self, session, admin_token):
        r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("username") == ADMIN_USER

    def test_me_without_token(self, session):
        # Fresh request (no auth header). session may not have auth header at all.
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401


# --------- Admin refresh guard ---------
class TestAdminRefresh:
    def test_refresh_requires_auth(self):
        r = requests.post(f"{API}/admin/refresh", timeout=15)
        assert r.status_code == 401

    def test_refresh_with_token(self, admin_token):
        # This triggers full aggregator pipeline; give it plenty of time.
        r = requests.post(
            f"{API}/admin/refresh",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=180,
        )
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        d = r.json()
        assert d["status"] == "ok"
        assert d["tools_count"] == 50
        assert "generated_at_berlin" in d


# --------- Install scripts ---------
class TestInstall:
    def test_install_bash(self, session, sample_tool):
        tid = sample_tool.get("id") or sample_tool.get("name")
        r = session.get(f"{API}/tools/{tid}/install/bash", timeout=15)
        assert r.status_code == 200
        assert "attachment" in r.headers.get("content-disposition", "").lower()
        assert ".sh" in r.headers.get("content-disposition", "")
        assert r.text.startswith("#!/usr/bin/env bash") or "install" in r.text.lower()

    def test_install_docker(self, session, sample_tool):
        tid = sample_tool.get("id") or sample_tool.get("name")
        r = session.get(f"{API}/tools/{tid}/install/docker", timeout=15)
        assert r.status_code == 200
        assert "docker" in r.text.lower()
        assert "attachment" in r.headers.get("content-disposition", "").lower()

    def test_install_kubernetes(self, session, sample_tool):
        tid = sample_tool.get("id") or sample_tool.get("name")
        r = session.get(f"{API}/tools/{tid}/install/kubernetes", timeout=15)
        assert r.status_code == 200
        assert "Deployment" in r.text or "apiVersion" in r.text
        assert ".yaml" in r.headers.get("content-disposition", "").lower()

    def test_install_invalid_format(self, session, sample_tool):
        tid = sample_tool.get("id") or sample_tool.get("name")
        r = session.get(f"{API}/tools/{tid}/install/notaformat", timeout=15)
        # Route matches unknown fmt string but rejects with 400
        assert r.status_code == 400

    def test_install_tool_not_found(self, session):
        r = session.get(f"{API}/tools/does-not-exist-xyz-123/install/bash", timeout=15)
        assert r.status_code == 404
