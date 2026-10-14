import hashlib


def hash_password(username, password):
    """Hashes a password, using the username as a per-user salt."""
    return hashlib.sha256(f"{username}:{password}".encode("utf-8")).hexdigest()


def verify_password(user, password):
    """Returns True when the given password matches the stored hash."""
    candidate = hash_password(user["username"], password)
    return candidate == user["password_hash"]
