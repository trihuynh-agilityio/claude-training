# Bug Reproduction Exercise: Login Rejects Valid Credentials

A small web app with a sign-in form, built with Python and [FastAPI](https://fastapi.tiangolo.com/). It contains **one intentional bug**: signing in with valid credentials fails with "Invalid username or password."

Your job in this exercise is to **reproduce** the bug and write down what you see in [`BUG-01.md`](BUG-01.md). Don't fix it yet. Fixing comes later in the program.

## Requirements

- [uv](https://docs.astral.sh/uv/getting-started/installation/) (check with `uv --version`)

uv installs a suitable Python (3.10 or newer) for you if you don't already have one. The dependencies, FastAPI and Uvicorn, are listed in `pyproject.toml`, and exact versions are pinned in `uv.lock`.

## Setup

From the repository root:

```bash
cd login-bug
uv sync
```

This creates a `.venv/` folder inside `login-bug/` and installs the dependencies into it. You only need to do this once. The `.venv/` folder is ignored by Git.

## Run

From inside `login-bug/`:

```bash
uv run app.py
```

You don't need to activate the virtual environment first. `uv run` uses it automatically (and runs `uv sync` for you if you skipped setup).

You should see:

```
Login app running at http://localhost:3000
```

Uvicorn, the server FastAPI runs on, also prints a few lines of its own. That's expected.

Open <http://localhost:3000> in your browser.

To use a different port:

```bash
PORT=4000 uv run app.py
```

Stop the server with `Ctrl+C`.

## Test accounts

| Email | Password |
|---|---|
| `demo@example.com` | `Password123!` |
| `alice@example.com` | `Wonderland42` |

These are the correct credentials. Signing in with them **should** work.

## Calling the API directly

You can also send a login request without the browser:

```bash
curl -i -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo@example.com","password":"Password123!"}'
```

The server logs every login attempt in the terminal where `uv run app.py` is running.

## Project layout

```
login-bug/
├── BUG-01.md          Bug report to fill in
├── README.md          This file
├── pyproject.toml     Project settings and dependencies (FastAPI, Uvicorn)
├── uv.lock            Exact dependency versions, managed by uv
├── .gitignore         Ignores .venv/ and Python caches
├── app.py             FastAPI app: static files, POST /api/login
├── src/
│   ├── __init__.py
│   ├── auth.py        Password hashing and checking
│   └── users.py       In-memory user store
└── public/
    ├── index.html     Sign-in page
    ├── app.js         Form submit logic (runs in the browser)
    └── styles.css     Styles
```

## Exercise steps

1. Start the app and confirm the sign-in page loads.
2. Try to sign in with a test account above.
3. Try the same login with `curl` and compare the result.
4. Try a wrong password too, and compare the two responses.
5. Fill in the **Steps to reproduce** and **Test results** sections of [`BUG-01.md`](BUG-01.md) with what you actually saw.
6. Optional: read through `app.py` and `src/` and note where you think the problem might be. Don't change the code.
