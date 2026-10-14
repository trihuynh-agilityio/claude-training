from src.auth import hash_password, verify_password


def make_user(username, password):
    return {"username": username, "password_hash": hash_password(password)}


def test_verify_password_accepts_correct_password():
    # Regression test for BUG-01: valid credentials were rejected.
    user = make_user("demo@example.com", "Password123!")

    assert verify_password(user, "Password123!") is True


def test_verify_password_rejects_wrong_password():
    user = make_user("demo@example.com", "Password123!")

    assert verify_password(user, "wrong") is False


def test_hash_password_uses_a_random_salt():
    # The same password must not produce the same stored hash twice.
    first = hash_password("Wonderland42")
    second = hash_password("Wonderland42")

    assert first != second
    assert first.startswith("scrypt$")


def test_verify_password_rejects_malformed_hash():
    user = {"username": "demo@example.com", "password_hash": "not-a-valid-hash"}

    assert verify_password(user, "Password123!") is False
