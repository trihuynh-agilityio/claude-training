from src.auth import hash_password, verify_password


def make_user(username, password):
    return {"username": username, "password_hash": hash_password(username, password)}


def test_verify_password_accepts_correct_password():
    # Regression test for BUG-01: valid credentials were rejected.
    user = make_user("demo@example.com", "Password123!")

    assert verify_password(user, "Password123!") is True


def test_verify_password_rejects_wrong_password():
    user = make_user("demo@example.com", "Password123!")

    assert verify_password(user, "wrong") is False


def test_verify_password_rejects_password_from_another_user():
    # The username salts the hash, so the same password must not match a different user.
    alice = make_user("alice@example.com", "Wonderland42")
    other = {"username": "bob@example.com", "password_hash": alice["password_hash"]}

    assert verify_password(other, "Wonderland42") is False
