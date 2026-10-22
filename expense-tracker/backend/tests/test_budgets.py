import pytest

# Budget tests pass `today` explicitly so they never depend on the real clock.
NOW = "2026-10-16"
THIS_MONTH = "2026-10"
NEXT_MONTH = "2026-11"


def put_budget(client, month=THIS_MONTH, today=NOW, **body):
    payload = {"monthly": 15_000_000, "categories": {}} | body
    return client.put(f"/api/budgets/{month}", params={"today": today}, json=payload)


def get_budget(client, month=THIS_MONTH, today=NOW):
    response = client.get("/api/budgets", params={"month": month, "today": today})
    assert response.status_code == 200, response.text
    return response.json()


def test_no_budget_is_null(client):
    assert get_budget(client) is None


@pytest.mark.parametrize("month", [THIS_MONTH, NEXT_MONTH])
def test_save_and_read_current_and_next_month(client, month):
    response = put_budget(
        client, month, categories={"food": 4_500_000, "bills": 2_500_000}
    )

    assert response.status_code == 200, response.text
    expected = {
        "month": month,
        "source_month": month,
        "is_own": True,
        "monthly": 15_000_000,
        "categories": {"food": 4_500_000, "bills": 2_500_000},
    }
    assert response.json() == expected
    assert get_budget(client, month) == expected


def test_saving_again_replaces_the_categories(client):
    put_budget(client, categories={"food": 100})
    put_budget(client, monthly=20_000_000, categories={"bills": 200})

    saved = get_budget(client)
    assert saved["monthly"] == 20_000_000
    assert saved["categories"] == {"bills": 200}


def test_month_without_a_budget_inherits_the_latest_earlier_one(client):
    put_budget(client, categories={"food": 4_500_000})

    inherited = get_budget(client, NEXT_MONTH)

    assert inherited == {
        "month": NEXT_MONTH,
        "source_month": THIS_MONTH,
        "is_own": False,
        "monthly": 15_000_000,
        "categories": {"food": 4_500_000},
    }
    assert get_budget(client, "2026-09") is None


def test_own_budget_wins_over_an_earlier_one(client):
    put_budget(client, THIS_MONTH, monthly=10_000_000)
    put_budget(client, NEXT_MONTH, monthly=12_000_000)

    assert get_budget(client, NEXT_MONTH)["monthly"] == 12_000_000
    assert get_budget(client, THIS_MONTH)["monthly"] == 10_000_000


@pytest.mark.parametrize("monthly", [0, -1, 1_000_000_001, 1.5, "15000000", None])
def test_rejects_an_invalid_monthly_amount(client, monthly):
    assert put_budget(client, monthly=monthly).status_code == 422


def test_rejects_a_missing_monthly_amount(client):
    response = client.put(f"/api/budgets/{THIS_MONTH}", params={"today": NOW}, json={})

    assert response.status_code == 422


@pytest.mark.parametrize("amount", [0, 1_000_000_001, 1.5, "100"])
def test_rejects_an_invalid_category_amount(client, amount):
    assert put_budget(client, categories={"food": amount}).status_code == 422


def test_rejects_an_unknown_category(client):
    assert put_budget(client, categories={"pets": 100}).status_code == 422


def test_rejects_categories_adding_up_to_more_than_monthly(client):
    response = put_budget(client, monthly=1000, categories={"food": 600, "bills": 401})

    assert response.status_code == 422
    assert "more than the monthly budget" in response.text


def test_accepts_categories_adding_up_to_exactly_monthly(client):
    response = put_budget(client, monthly=1000, categories={"food": 600, "bills": 400})

    assert response.status_code == 200


def test_rejected_save_stores_nothing(client):
    put_budget(client, monthly=1000, categories={"food": 2000})

    assert get_budget(client) is None


def test_rejects_changing_a_past_month_but_allows_reading_it(client):
    put_budget(client, THIS_MONTH, monthly=5_000_000)

    response = put_budget(client, "2026-09")

    assert response.status_code == 422
    assert get_budget(client, "2026-09") is None
    assert get_budget(client, THIS_MONTH)["monthly"] == 5_000_000


def test_past_month_is_judged_by_the_callers_today(client):
    assert put_budget(client, THIS_MONTH, today="2026-11-01").status_code == 422


def test_rejects_a_month_after_next(client):
    assert put_budget(client, "2026-12").status_code == 422


def test_next_month_across_the_year_end(client):
    assert put_budget(client, "2027-01", today="2026-12-20").status_code == 200


def test_rejects_a_malformed_month(client):
    assert put_budget(client, "2026-13").status_code == 422


def test_has_no_delete_route(client):
    put_budget(client)

    response = client.delete(f"/api/budgets/{THIS_MONTH}")

    assert response.status_code == 405
    assert get_budget(client) is not None
