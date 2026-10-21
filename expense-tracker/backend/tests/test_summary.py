from datetime import date

from tests.test_expenses import make_expense

TODAY = date.today()
THIS_MONTH = f"{TODAY.year:04d}-{TODAY.month:02d}"


def summary(client, month):
    response = client.get("/api/summary", params={"month": month})
    assert response.status_code == 200, response.text
    return response.json()


def test_empty_month(client):
    assert summary(client, "2026-03") == {
        "month": "2026-03",
        "total": 0,
        "count": 0,
        "same_day_last_month_total": 0,
        "categories": [],
    }


def test_defaults_to_the_current_month(client):
    make_expense(client, amount=1000)

    response = client.get("/api/summary")

    assert response.status_code == 200
    assert response.json()["month"] == THIS_MONTH
    assert response.json()["total"] == 1000


def test_totals_and_counts_per_category_sorted_by_amount(client):
    make_expense(client, amount=100, category_id="food", date="2026-03-02")
    make_expense(client, amount=200, category_id="food", date="2026-03-20")
    make_expense(client, amount=900, category_id="bills", date="2026-03-05")
    make_expense(client, amount=50, category_id="other", date="2026-03-31")

    result = summary(client, "2026-03")

    assert result["total"] == 1250
    assert result["count"] == 4
    assert result["categories"] == [
        {"category_id": "bills", "total": 900, "count": 1},
        {"category_id": "food", "total": 300, "count": 2},
        {"category_id": "other", "total": 50, "count": 1},
    ]


def test_month_boundaries_are_inclusive(client):
    make_expense(client, amount=10, date="2026-02-28")
    make_expense(client, amount=20, date="2026-03-01")
    make_expense(client, amount=30, date="2026-03-31")
    make_expense(client, amount=40, date="2026-04-01")

    assert summary(client, "2026-03")["total"] == 50


def test_past_month_compares_with_the_whole_previous_month(client):
    make_expense(client, amount=500, date="2026-02-27")
    make_expense(client, amount=700, date="2026-03-10")

    result = summary(client, "2026-03")

    assert result["same_day_last_month_total"] == 500


def test_comparison_is_clamped_when_previous_month_is_shorter(client):
    # October has 31 days, September 30: all of September is compared.
    make_expense(client, amount=300, date="2025-09-30")
    make_expense(client, amount=100, date="2025-10-31")

    assert summary(client, "2025-10")["same_day_last_month_total"] == 300


def test_comparison_crosses_the_year_boundary(client):
    make_expense(client, amount=400, date="2025-12-15")

    assert summary(client, "2026-01")["same_day_last_month_total"] == 400


def test_current_month_compares_up_to_today_only(client):
    year, month = (
        (TODAY.year - 1, 12) if TODAY.month == 1 else (TODAY.year, TODAY.month - 1)
    )
    make_expense(client, amount=111, date=date(year, month, 1).isoformat())
    # A previous-month expense after today's day-of-month is not part of the comparison.
    if TODAY.day < 28:
        make_expense(client, amount=999, date=date(year, month, 28).isoformat())

    assert summary(client, THIS_MONTH)["same_day_last_month_total"] == 111


def test_invalid_month_is_rejected(client):
    for bad in ["2026-13", "2026-00", "2026-3", "March", "2026-03-01"]:
        response = client.get("/api/summary", params={"month": bad})
        assert response.status_code == 422, bad
