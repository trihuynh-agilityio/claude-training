from src.auth import hash_password

# In-memory user store. Passwords are never stored in plain text.
USERS = [
    {
        "username": "demo@example.com",
        "display_name": "Demo User",
        "password_hash": hash_password("demo@example.com", "Password123!"),
    },
    {
        "username": "alice@example.com",
        "display_name": "Alice",
        "password_hash": hash_password("alice@example.com", "Wonderland42"),
    },
]


def find_user(username):
    normalized = username.strip().lower()
    return next((user for user in USERS if user["username"] == normalized), None)
