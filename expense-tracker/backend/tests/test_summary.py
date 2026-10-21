from datetime import date

import pytest

from tests.test_expenses import make_expense

# Summary tests pass `today` explicitly so they never depend on the real clock.
# make_expense only accepts dates up to the real today, so all data here is in the past.
NOW = "2026-10-21"


def get_summary(client, month=None, today=NOW):
    params = {"today": today}
    if month is not None:
        params["month"] = month
    return client.get("/api/summary", params=params)


def summary(client, month=None, today=NOW):
    response = get_summary(client, month, today)
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


def test_defaults_to_the_month_of_today(client):
    make_expense(client, amount=1000, date="2026-10-05")

    result = summary(client, today="2026-10-21")

    assert result["month"] == "2026-10"
    assert result["total"] == 1000


def test_defaults_to_the_servers_date_without_today(client):
    response = client.get("/api/summary")

    assert response.status_code == 200
    assert response.json()["month"] == date.today().isoformat()[:7]


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

    assert summary(client, "2026-03")["same_day_last_month_total"] == 500


def test_comparison_is_clamped_when_previous_month_is_shorter(client):
    # October has 31 days, September 30: all of September is compared.
    make_expense(client, amount=300, date="2025-09-30")
    make_expense(client, amount=100, date="2025-10-31")

    assert summary(client, "2025-10")["same_day_last_month_total"] == 300


def test_comparison_crosses_the_year_boundary(client):
    make_expense(client, amount=400, date="2025-12-15")

    assert summary(client, "2026-01")["same_day_last_month_total"] == 400


def test_current_month_compares_up_to_and_including_today(client):
    make_expense(client, amount=1, date="2026-09-20")
    make_expense(client, amount=10, date="2026-09-21")  # the cutoff day itself
    make_expense(client, amount=100, date="2026-09-22")  # after the cutoff
    make_expense(client, amount=1000, date="2026-09-30")

    result = summary(client, "2026-10", today="2026-10-21")

    assert result["same_day_last_month_total"] == 11


def test_cutoff_follows_the_callers_date(client):
    # Near midnight a UTC server and a UTC+7 caller disagree on the day; the caller wins.
    make_expense(client, amount=1, date="2026-09-30")
    make_expense(client, amount=10, date="2026-10-01")
    make_expense(client, amount=100, date="2026-09-01")

    assert (
        summary(client, "2026-10", today="2026-10-01")["same_day_last_month_total"]
        == 100
    )
    assert (
        summary(client, "2026-09", today="2026-10-01")["same_day_last_month_total"] == 0
    )


def test_month_without_previous_data_compares_to_zero(client):
    make_expense(client, amount=700, date="2026-03-10")

    result = summary(client, "2026-03")

    assert result["total"] == 700
    assert result["same_day_last_month_total"] == 0


def test_future_month_is_empty_and_compares_to_the_month_before(client):
    make_expense(client, amount=250, date="2026-10-02")

    result = summary(client, "2027-01", today="2026-10-21")

    assert result["total"] == 0
    assert result["categories"] == []
    assert result["same_day_last_month_total"] == 0
    assert (
        summary(client, "2026-11", today="2026-10-21")["same_day_last_month_total"]
        == 250
    )


@pytest.mark.parametrize("month", ["1900-01", "2099-12"])
def test_edges_of_the_supported_years_work(client, month):
    result = summary(client, month)

    assert result["month"] == month
    assert result["total"] == 0


@pytest.mark.parametrize(
    "month",
    [
        "0000-01",
        "0001-01",
        "1899-12",
        "2100-01",
        "9999-12",
        "2026-13",
        "2026-00",
        "2026-3",
        "March",
    ],
)
def test_unsupported_or_malformed_month_is_rejected(client, month):
    assert get_summary(client, month).status_code == 422


@pytest.mark.parametrize(
    "today", ["0001-01-01", "1899-12-31", "2100-01-01", "yesterday"]
)
def test_unsupported_or_malformed_today_is_rejected(client, today):
    assert get_summary(client, today=today).status_code == 422
