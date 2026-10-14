import hashlib
import hmac
import secrets

# scrypt cost parameters (CPU/memory cost, block size, parallelism).
SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1


def _scrypt(password, salt):
    return hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P
    )


def hash_password(password):
    """Hashes a password with scrypt and a random salt.

    Returns "scrypt$<salt hex>$<hash hex>", so the salt is stored with the hash.
    """
    salt = secrets.token_bytes(16)
    return f"scrypt${salt.hex()}${_scrypt(password, salt).hex()}"


def verify_password(user, password):
    """Returns True when the given password matches the stored hash."""
    try:
        scheme, salt_hex, hash_hex = user["password_hash"].split("$")
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
    except ValueError:
        return False
    if scheme != "scrypt":
        return False
    return hmac.compare_digest(_scrypt(password, salt), expected)
