from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch) -> Iterator[TestClient]:
    """A client backed by a fresh SQLite file for each test."""
    monkeypatch.setenv("EXPENSE_DB_PATH", str(tmp_path / "test.db"))
    # The context manager runs the lifespan, which creates the table.
    with TestClient(app) as test_client:
        yield test_client
