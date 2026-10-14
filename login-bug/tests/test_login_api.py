import pytest
from app import app
from fastapi.testclient import TestClient

client = TestClient(app)


def login(username, password):
    return client.post("/api/login", json={"username": username, "password": password})


@pytest.mark.parametrize(
    ("username", "password", "display_name"),
    [
        ("demo@example.com", "Password123!", "Demo User"),
        ("alice@example.com", "Wonderland42", "Alice"),
        # The lookup normalizes the username, so case and padding must not matter.
        (" Demo@Example.com ", "Password123!", "Demo User"),
    ],
)
def test_login_succeeds_with_valid_credentials(username, password, display_name):
    # Regression test for BUG-01: valid credentials were rejected with 401.
    response = login(username, password)

    assert response.status_code == 200
    assert response.json() == {"ok": True, "message": f"Welcome back, {display_name}!"}


def test_login_rejects_wrong_password():
    response = login("demo@example.com", "wrong")

    assert response.status_code == 401
    assert response.json() == {"ok": False, "message": "Invalid username or password."}


def test_login_rejects_unknown_user():
    response = login("nobody@example.com", "Password123!")

    assert response.status_code == 401
    assert response.json() == {"ok": False, "message": "Invalid username or password."}


@pytest.mark.parametrize(
    ("username", "password"),
    [
        ("", ""),
        ("demo@example.com", ""),
        ("", "Password123!"),
    ],
)
def test_login_requires_username_and_password(username, password):
    response = login(username, password)

    assert response.status_code == 400
    assert response.json() == {
        "ok": False,
        "message": "Username and password are required.",
    }


def test_login_rejects_invalid_json():
    response = client.post(
        "/api/login", content="not json", headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 400
    assert response.json() == {"ok": False, "message": "Invalid JSON body."}


def test_login_rejects_json_that_is_not_an_object():
    response = client.post("/api/login", json=[])

    assert response.status_code == 400
    assert response.json() == {"ok": False, "message": "Invalid JSON body."}
