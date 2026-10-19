from datetime import date, timedelta

import pytest

TODAY = date.today().isoformat()
YESTERDAY = (date.today() - timedelta(days=1)).isoformat()


def make_expense(client, **overrides):
    payload = {"amount": 65000, "date": TODAY, "note": "Phở bò — breakfast"} | overrides
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
        json={"amount": 890000, "date": YESTERDAY, "note": None},
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["id"] == expense["id"]
    assert updated["amount"] == 890000
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
        ("put", {"amount": 1000, "date": TODAY}),
        ("delete", None),
    ],
)
def test_unknown_id_returns_404(client, method, body):
    kwargs = {"json": body} if body is not None else {}

    response = getattr(client, method)("/api/expenses/999", **kwargs)

    assert response.status_code == 404
    assert response.json() == {"detail": "Expense not found"}


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param({"date": TODAY}, id="missing amount"),
        pytest.param({"amount": 0, "date": TODAY}, id="zero amount"),
        pytest.param({"amount": -5000, "date": TODAY}, id="negative amount"),
        pytest.param({"amount": 1_000_000_001, "date": TODAY}, id="amount too large"),
        pytest.param({"amount": 1.5, "date": TODAY}, id="decimal amount"),
        pytest.param({"amount": "65000", "date": TODAY}, id="string amount"),
        pytest.param({"amount": 65000}, id="missing date"),
        pytest.param({"amount": 65000, "date": "16/10/2026"}, id="bad date format"),
        pytest.param(
            {"amount": 65000, "date": (date.today() + timedelta(days=1)).isoformat()},
            id="future date",
        ),
        pytest.param({"amount": 65000, "date": TODAY, "note": "x" * 121}, id="note too long"),
    ],
)
def test_invalid_input_returns_422(client, payload):
    response = client.post("/api/expenses", json=payload)

    assert response.status_code == 422
    assert client.get("/api/expenses").json() == []


def test_update_validates_input(client):
    expense = make_expense(client)

    response = client.put(f"/api/expenses/{expense['id']}", json={"amount": 0, "date": TODAY})

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
