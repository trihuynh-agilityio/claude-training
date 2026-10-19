import sqlite3
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app

TODAY = date.today().isoformat()
YESTERDAY = (date.today() - timedelta(days=1)).isoformat()


def make_expense(client, **overrides):
    payload = {
        "amount": 65000,
        "category_id": "food",
        "date": TODAY,
        "note": "Phở bò — breakfast",
    } | overrides
    response = client.post("/api/expenses", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_list_is_empty_at_first(client):
    response = client.get("/api/expenses")

    assert response.status_code == 200
    assert response.json() == []


def test_create_returns_the_saved_expense(client):
    expense = make_expense(client)

    assert isinstance(expense["id"], int)
    assert expense["amount"] == 65000
    assert expense["category_id"] == "food"
    assert expense["date"] == TODAY
    assert expense["note"] == "Phở bò — breakfast"
    assert expense["created_at"]


def test_list_orders_newest_date_first_then_newest_id(client):
    older = make_expense(client, date=YESTERDAY, note="older")
    first_today = make_expense(client, note="first today")
    second_today = make_expense(client, note="second today")

    ids = [e["id"] for e in client.get("/api/expenses").json()]

    assert ids == [second_today["id"], first_today["id"], older["id"]]


def test_get_returns_one_expense(client):
    expense = make_expense(client)

    response = client.get(f"/api/expenses/{expense['id']}")

    assert response.status_code == 200
    assert response.json() == expense


def test_update_replaces_all_fields(client):
    expense = make_expense(client)

    response = client.put(
        f"/api/expenses/{expense['id']}",
        json={
            "amount": 890000,
            "category_id": "shopping",
            "date": YESTERDAY,
            "note": None,
        },
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["id"] == expense["id"]
    assert updated["amount"] == 890000
    assert updated["category_id"] == "shopping"
    assert updated["date"] == YESTERDAY
    assert updated["note"] is None
    assert updated["created_at"] == expense["created_at"]


def test_delete_removes_the_expense(client):
    expense = make_expense(client)

    response = client.delete(f"/api/expenses/{expense['id']}")

    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/api/expenses/{expense['id']}").status_code == 404
    assert client.get("/api/expenses").json() == []


@pytest.mark.parametrize(
    ("method", "body"),
    [
        ("get", None),
        ("put", {"amount": 1000, "category_id": "food", "date": TODAY}),
        ("delete", None),
    ],
)
def test_unknown_id_returns_404(client, method, body):
    kwargs = {"json": body} if body is not None else {}

    response = getattr(client, method)("/api/expenses/999", **kwargs)

    assert response.status_code == 404
    assert response.json() == {"detail": "Expense not found"}


VALID = {"amount": 65000, "category_id": "food", "date": TODAY}


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param({"category_id": "food", "date": TODAY}, id="missing amount"),
        pytest.param(VALID | {"amount": 0}, id="zero amount"),
        pytest.param(VALID | {"amount": -5000}, id="negative amount"),
        pytest.param(VALID | {"amount": 1_000_000_001}, id="amount too large"),
        pytest.param(VALID | {"amount": 1.5}, id="decimal amount"),
        pytest.param(VALID | {"amount": "65000"}, id="string amount"),
        pytest.param({"amount": 65000, "category_id": "food"}, id="missing date"),
        pytest.param(VALID | {"date": "16/10/2026"}, id="bad date format"),
        pytest.param(
            VALID | {"date": (date.today() + timedelta(days=1)).isoformat()},
            id="future date",
        ),
        pytest.param(VALID | {"note": "x" * 121}, id="note too long"),
        pytest.param({"amount": 65000, "date": TODAY}, id="missing category"),
        pytest.param(VALID | {"category_id": "coffee"}, id="unknown category"),
    ],
)
def test_invalid_input_returns_422(client, payload):
    response = client.post("/api/expenses", json=payload)

    assert response.status_code == 422
    assert client.get("/api/expenses").json() == []


def test_update_validates_input(client):
    expense = make_expense(client)

    response = client.put(f"/api/expenses/{expense['id']}", json=VALID | {"amount": 0})

    assert response.status_code == 422
    assert client.get(f"/api/expenses/{expense['id']}").json() == expense


def test_amount_boundaries_are_accepted(client):
    assert make_expense(client, amount=1)["amount"] == 1
    assert make_expense(client, amount=1_000_000_000)["amount"] == 1_000_000_000


def test_note_is_trimmed_and_blank_note_becomes_null(client):
    assert make_expense(client, note="  Grab to office  ")["note"] == "Grab to office"
    assert make_expense(client, note="   ")["note"] is None
    assert make_expense(client, note="x" * 120)["note"] == "x" * 120


def test_expenses_persist_across_app_restarts(client):
    expense = make_expense(client)

    # Leaving and re-entering the TestClient restarts the app on the same file.
    client.__exit__(None, None, None)
    with client:
        assert client.get("/api/expenses").json() == [expense]


def test_every_category_is_accepted(client):
    categories = [
        "food",
        "transport",
        "bills",
        "shopping",
        "leisure",
        "health",
        "education",
        "other",
    ]

    for category_id in categories:
        assert (
            make_expense(client, category_id=category_id)["category_id"] == category_id
        )


def test_old_database_gets_category_column(tmp_path, monkeypatch):
    path = tmp_path / "old.db"
    with sqlite3.connect(path) as conn:
        conn.execute(
            "CREATE TABLE expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, amount INTEGER NOT NULL,"
            " date TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL)"
        )
        conn.execute(
            "INSERT INTO expenses (amount, date, note, created_at) VALUES (?, ?, ?, ?)",
            (65000, TODAY, "Phở bò", "2026-10-16T00:00:00+00:00"),
        )
    conn.close()
    monkeypatch.setenv("EXPENSE_DB_PATH", str(path))

    with TestClient(app) as client:
        [expense] = client.get("/api/expenses").json()

    assert expense["category_id"] == "other"
