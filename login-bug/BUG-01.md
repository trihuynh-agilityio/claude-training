# BUG-01: Valid credentials are rejected at login

| Field | Value |
|---|---|
| **ID** | BUG-01 |
| **Component** | Authentication (`POST /api/login`) |
| **Severity** | Critical: no user can sign in |
| **Priority** | High |
| **Status** | Open, reproduced |
| **Reported by** | Tri Huynh |
| **Date reported** | 2026-10-14 |
| **Assigned to** | _Unassigned_ |

## Description

The sign-in form rejects correct credentials. A registered user who enters their correct email and password sees "Invalid username or password." and is not signed in. The same thing happens when calling the login API directly with `curl`, so the problem is on the server rather than in the browser.

## Expected behavior

When a registered user submits the correct email and password:

- The API responds with **HTTP 200** and `{"ok": true, "message": "Welcome back, <name>!"}`.
- The page shows the welcome message in green.
- The server logs `[login] success for "<email>"`.

## Actual behavior

When a registered user submits the correct email and password:

- The API responds with **HTTP 401** and `{"ok": false, "message": "Invalid username or password."}`.
- The page shows the error message in red.
- The server logs `[login] failed for "<email>"`.

## Environment

| Item | Value |
|---|---|
| OS | macOS 26.6.2 |
| Python version (`uv run python --version`) | 3.13.2 |
| uv version (`uv --version`) | 0.12.0 |
| FastAPI version (`uv pip show fastapi`) | 0.143.0 |
| Browser and version | Google Chrome 155.0.8059.79 |
| App URL / port | http://localhost:3000 |
| Git commit (`git rev-parse --short HEAD`) | 196d8a7 (exercise files not yet committed) |

## Steps to reproduce

**Preconditions:** dependencies installed with `uv sync` (see `README.md`).

1. In a terminal, go to the `login-bug/` folder and run `uv run app.py`.
2. Wait for the terminal to show `Login app running at http://localhost:3000`.
3. In Chrome, open <http://localhost:3000>.
4. In **Email**, enter `demo@example.com`.
5. In **Password**, enter `Password123!`.
6. Click **Sign in**.

**Result:** the form shows the red error "Invalid username or password.", the request to `POST /api/login` returns **HTTP 401**, and the terminal logs `[login] failed for "demo@example.com"`.

**Expected:** the form shows the green message "Welcome back, Demo User!" and the request returns **HTTP 200**.

## Test results

| # | Scenario | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| 1 | Valid login (browser) | `demo@example.com` / `Password123!` | Welcome message, HTTP 200 | Error message, HTTP 401  | Fail |
| 2 | Valid login (second account) | `alice@example.com` / `Wonderland42` | Welcome message, HTTP 200 | Error message, HTTP 401 | Fail |
| 3 | Valid login (`curl`) | `demo@example.com` / `Password123!` | HTTP 200 | HTTP 401 | Fail |
| 4 | Wrong password | `demo@example.com` / `wrong` | Error message, HTTP 401 | Error message, HTTP 401 | Pass |
| 5 | Unknown user | `nobody@example.com` / `Password123!` | Error message, HTTP 401 | Error message, HTTP 401 | Pass |
| 6 | Empty fields | _(blank)_ / _(blank)_ | Error message, HTTP 400 | Error message, HTTP 400 | Pass |

**Reproducible?** Always (3 of 3 valid-login attempts failed: scenarios 1–3)

## Notes / suspected area

- The browser and `curl` give the same 401, so the problem is on the server, not in the form (`public/app.js`).
- Unknown users and wrong passwords are rejected correctly (scenarios 4–5). Only correct passwords behave wrongly, which points to the password check rather than the user lookup.
- Suspected area: password hashing and checking in `src/auth.py`. The hash made when users are created (`hash_password`) may not match the hash made at login (`verify_password`).
- Not fixed here.
