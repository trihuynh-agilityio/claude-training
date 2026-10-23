import sqlite3
from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.recurring import occurrences

# Every test passes `today` explicitly so none depends on the real clock.
NOW = "2026-10-16"

RENT = {
    "amount": 5_000_000,
    "category_id": "bills",
    "note": "Rent",
    "day": 1,
    "start_date": "2026-08-01",
}


def make_rule(client, today=NOW, **overrides):
    response = client.post(
        "/api/recurring", params={"today": today}, json=RENT | overrides
    )
    assert response.status_code == 201, response.text
    return response.json()


def generate(client, today=NOW):
    response = client.post("/api/recurring/generate", params={"today": today})
    assert response.status_code == 200, response.text
    return response.json()["added"]


def expenses(client):
    return client.get("/api/expenses").json()


# --- the pure occurrence function (R2, R3, R6) ---


def test_day_31_is_clamped_to_the_last_day_of_short_months():
    found = list(occurrences(31, date(2027, 1, 1), None, None, date(2027, 4, 30)))

    assert found == [
        date(2027, 1, 31),
        date(2027, 2, 28),
        date(2027, 3, 31),
        date(2027, 4, 30),
    ]


def test_day_31_in_a_leap_february_is_the_29th():
    found = list(occurrences(31, date(2028, 2, 1), None, None, date(2028, 2, 29)))

    assert found == [date(2028, 2, 29)]


def test_first_occurrence_is_on_or_after_the_start_date():
    found = list(occurrences(15, date(2026, 10, 16), None, None, date(2026, 12, 31)))

    assert found == [date(2026, 11, 15), date(2026, 12, 15)]


def test_start_date_on_the_day_counts():
    found = list(occurrences(15, date(2026, 10, 15), None, None, date(2026, 10, 31)))

    assert found == [date(2026, 10, 15)]


def test_end_date_stops_the_series():
    found = list(
        occurrences(5, date(2026, 1, 1), date(2026, 3, 5), None, date(2026, 12, 31))
    )

    assert found == [date(2026, 1, 5), date(2026, 2, 5), date(2026, 3, 5)]


def test_after_excludes_handled_occurrences():
    found = list(
        occurrences(5, date(2026, 1, 1), None, date(2026, 2, 5), date(2026, 4, 30))
    )

    assert found == [date(2026, 3, 5), date(2026, 4, 5)]


# --- create and validation (R1, R6) ---


def test_create_returns_the_rule_with_next_due(client):
    rule = make_rule(client, start_date="2026-10-16", day=20)

    assert rule["id"]
    assert rule["amount"] == 5_000_000
    assert rule["paused"] is False
    assert rule["last_generated"] is None
    assert rule["next_due"] == "2026-10-20"


def test_list_is_empty_at_first(client):
    assert client.get("/api/recurring").json() == []


@pytest.mark.parametrize(
    "overrides",
    [
        pytest.param({"amount": 0}, id="zero amount"),
        pytest.param({"amount": -5}, id="negative amount"),
        pytest.param({"category_id": "coffee"}, id="unknown category"),
        pytest.param({"day": 0}, id="day 0"),
        pytest.param({"day": 32}, id="day 32"),
        pytest.param({"end_date": "2026-07-31"}, id="end before start"),
        pytest.param({"note": "x" * 121}, id="long note"),
    ],
)
def test_invalid_rule_is_rejected(client, overrides):
    response = client.post(
        "/api/recurring", params={"today": NOW}, json=RENT | overrides
    )

    assert response.status_code == 422


def test_start_date_more_than_24_months_back_is_rejected(client):
    response = client.post(
        "/api/recurring",
        params={"today": NOW},
        json=RENT | {"start_date": "2024-09-30"},
    )

    assert response.status_code == 422
    assert "24 months" in response.text


def test_start_date_exactly_24_months_back_is_allowed(client):
    make_rule(client, start_date="2024-10-16")


# --- generate (R4, R5) ---


def test_generate_backfills_and_is_idempotent(client):
    rule = make_rule(client)

    assert generate(client) == 3
    assert generate(client) == 0

    rows = expenses(client)
    assert sorted(r["date"] for r in rows) == ["2026-08-01", "2026-09-01", "2026-10-01"]
    for row in rows:
        assert row["amount"] == 5_000_000
        assert row["category_id"] == "bills"
        assert row["note"] == "Rent"
        assert row["recurring_id"] == rule["id"]
    [listed] = client.get("/api/recurring").json()
    assert listed["last_generated"] == "2026-10-01"
    assert listed["next_due"] == "2026-11-01"


def test_generate_never_adds_future_dates(client):
    make_rule(client, day=20, start_date="2026-10-01")

    assert generate(client, today="2026-10-16") == 0
    assert generate(client, today="2026-10-20") == 1
    assert expenses(client)[0]["date"] == "2026-10-20"


def test_deleted_expense_is_not_recreated(client):
    make_rule(client)
    generate(client)
    [sept] = [r for r in expenses(client) if r["date"] == "2026-09-01"]
    assert client.delete(f"/api/expenses/{sept['id']}").status_code == 204

    assert generate(client) == 0
    assert "2026-09-01" not in [r["date"] for r in expenses(client)]


def test_next_month_is_added_later(client):
    make_rule(client)
    generate(client)

    assert generate(client, today="2026-11-02") == 1


def test_expenses_added_by_a_rule_count_in_the_summary(client):
    make_rule(client)
    generate(client)

    summary = client.get(
        "/api/summary", params={"month": "2026-09", "today": NOW}
    ).json()

    assert summary["total"] == 5_000_000


def test_ended_rule_stops_and_reports_no_next_due(client):
    make_rule(client, end_date="2026-09-15")

    assert generate(client) == 2
    [listed] = client.get("/api/recurring").json()
    assert listed["next_due"] is None


# --- edit (R8) ---


def test_edit_changes_future_occurrences_only(client):
    rule = make_rule(client)
    generate(client)

    response = client.put(
        f"/api/recurring/{rule['id']}",
        params={"today": NOW},
        json=RENT | {"amount": 6_000_000},
    )
    assert response.status_code == 200
    assert {r["amount"] for r in expenses(client)} == {5_000_000}

    assert generate(client, today="2026-11-02") == 1
    assert expenses(client)[0]["amount"] == 6_000_000


def test_start_date_is_locked_after_the_first_expense(client):
    rule = make_rule(client)
    generate(client)

    response = client.put(
        f"/api/recurring/{rule['id']}",
        params={"today": NOW},
        json=RENT | {"start_date": "2026-09-01"},
    )

    assert response.status_code == 422


def test_start_date_can_change_before_anything_is_added(client):
    rule = make_rule(client, start_date="2026-12-01")

    response = client.put(
        f"/api/recurring/{rule['id']}",
        params={"today": NOW},
        json=RENT | {"start_date": "2026-11-01"},
    )

    assert response.status_code == 200
    assert response.json()["start_date"] == "2026-11-01"


def test_edit_unknown_rule_is_404(client):
    response = client.put("/api/recurring/99", params={"today": NOW}, json=RENT)

    assert response.status_code == 404


# --- delete (R9) ---


def test_delete_keeps_expenses_and_clears_the_link(client):
    rule = make_rule(client)
    generate(client)

    assert client.delete(f"/api/recurring/{rule['id']}").status_code == 204

    rows = expenses(client)
    assert len(rows) == 3
    assert all(r["recurring_id"] is None for r in rows)
    assert client.get("/api/recurring").json() == []


def test_delete_unknown_rule_is_404(client):
    assert client.delete("/api/recurring/99").status_code == 404


# --- pause and resume (R10) ---


def test_paused_rule_adds_nothing_and_resume_skips_missed_months(client):
    rule = make_rule(client, start_date="2026-10-01")
    generate(client, today="2026-10-16")
    patch = client.patch(f"/api/recurring/{rule['id']}", json={"paused": True})
    assert patch.json()["paused"] is True

    assert generate(client, today="2027-01-16") == 0

    resumed = client.patch(
        f"/api/recurring/{rule['id']}",
        params={"today": "2027-01-16"},
        json={"paused": False},
    )
    assert resumed.json()["paused"] is False
    assert generate(client, today="2027-01-16") == 0
    assert generate(client, today="2027-02-02") == 1
    assert sorted(r["date"] for r in expenses(client)) == ["2026-10-01", "2027-02-01"]


def test_patch_unknown_rule_is_404(client):
    response = client.patch("/api/recurring/99", json={"paused": True})

    assert response.status_code == 404


# --- storage (R7) ---


def test_old_database_without_recurring_id_still_opens(tmp_path, monkeypatch):
    path = tmp_path / "old.db"
    with sqlite3.connect(path) as conn:
        conn.execute(
            "CREATE TABLE expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, amount INTEGER NOT NULL,"
            " date TEXT NOT NULL, note TEXT, category_id TEXT NOT NULL DEFAULT 'other',"
            " created_at TEXT NOT NULL)"
        )
        conn.execute(
            "INSERT INTO expenses (amount, date, note, created_at) VALUES (?, ?, ?, ?)",
            (65000, "2026-10-01", "Phở bò", "2026-10-16T00:00:00+00:00"),
        )
    conn.close()
    monkeypatch.setenv("EXPENSE_DB_PATH", str(path))

    with TestClient(app) as client:
        [expense] = client.get("/api/expenses").json()

    assert expense["recurring_id"] is None


def test_plain_expenses_have_no_recurring_id(client):
    response = client.post(
        "/api/expenses",
        json={"amount": 1000, "category_id": "food", "date": "2020-01-01"},
    )

    assert response.json()["recurring_id"] is None
