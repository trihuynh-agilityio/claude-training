# Personal Expense Tracker

## Project Overview

A simple personal expense tracker for recording daily expenses and understanding spending habits.

## Core Features

- **Expenses:** add, edit, and delete expenses
- **Categories:** assign a category to each transaction
- **Filtering:** filter expenses by date range and category
- **Monthly summaries:** view total spending per month, broken down by category
- **Budgets:** set a monthly budget and track spending against it
- **CSV export:** download the filtered Transactions list as a CSV file (planned, see `intent/2026-10-23-csv-export/`)
- **Recurring expenses:** monthly rules that add expenses on their own (planned, see `intent/2026-10-23-recurring-expenses/`)

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite 8, linted with oxlint, unit-tested with Vitest (`frontend/`)
- **Backend:** Python 3.13 + FastAPI, managed with uv, tested with pytest (`backend/`)
- **Storage:** SQLite through Python's built-in `sqlite3`. The database file is `backend/data/expenses.db` (git-ignored, created on startup); set `EXPENSE_DB_PATH` to use another file.

In development, the Vite dev server proxies `/api` requests to the backend on port 8000.

## Project Structure

```
expense-tracker/
├── design/DESIGN.md   UI design spec (tokens, components, screens, validation)
├── frontend/          React + TypeScript app (Vite)
│   └── src/
│       ├── api/       Typed client for /api/expenses
│       ├── components/  Screens, dialogs and shared UI
│       └── lib/       Pure helpers (VND, dates, validation) with Vitest tests
└── backend/           FastAPI app (uv)
    ├── app/main.py    App setup and GET /api/health
    ├── app/expenses.py  /api/expenses routes
    ├── app/summary.py   /api/summary monthly totals
    ├── app/schemas.py   Request and response models with validation
    ├── app/db.py      SQLite connection and schema
    └── tests/         pytest tests
```

## API

| Method | Path | Result |
|---|---|---|
| `GET` | `/api/expenses` | All expenses, newest date first |
| `POST` | `/api/expenses` | Create an expense, returns `201` |
| `GET` | `/api/expenses/{id}` | One expense, or `404` |
| `PUT` | `/api/expenses/{id}` | Replace an expense, or `404` |
| `DELETE` | `/api/expenses/{id}` | Delete an expense, returns `204`, or `404` |
| `GET` | `/api/summary?month=YYYY-MM&today=YYYY-MM-DD` | Spending for a month (1900-01 to 2099-12): total, count, per-category totals (largest first) and the total of the month before up to the same day. `today` is the caller's date (the frontend sends its own, so both agree on "this month"); both default to the server's date |

An expense is `{id, amount, category_id, date, note, created_at}`. `amount` is a whole number of đồng from 1 to 1.000.000.000, `category_id` is required and is one of `food`, `transport`, `bills`, `shopping`, `leisure`, `health`, `education` or `other` (expenses saved before categories existed become `other`), `date` is `YYYY-MM-DD` and can't be in the future, and `note` is optional (trimmed, up to 120 characters). Invalid input returns `422`.

## Getting Started

Prerequisites: Node.js 20.19+ or 22.12+, and [uv](https://docs.astral.sh/uv/).

Start the backend (http://localhost:8000, API docs at `/docs`):

```bash
cd backend
uv sync
uv run fastapi dev app/main.py
```

Start the frontend in a second terminal (http://localhost:5173):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 to see the Dashboard (month switcher, spent total, spending by category, recent transactions); Transactions has the full list and filters. If the backend isn't running, the page shows "Couldn't load your expenses".

Run checks:

```bash
cd backend && uv run pytest
cd frontend && npm run lint && npm test && npm run build
```

## Development Roadmap

Each phase should be small, usable on its own, and build on the one before.

1. **Phase 1: Basic expense tracking (MVP).** Add, view, edit, and delete expenses (amount, date, description). Data persists between sessions.
2. **Phase 2: Categories.** Assign a category to each expense and manage the list of categories. Search and date-range filtering moved into this phase from Phase 3.
3. **Phase 3: Filtering.** Filter the expense list by category (the category chips). Search and date range already shipped in Phase 2.
4. **Phase 4: Monthly summaries.** Show monthly totals and a per-category breakdown.
5. **Phase 5: Budgets.** Set monthly budgets and show remaining or overspent amounts.
6. **Phase 6: CSV export.** Download the expenses on the Transactions screen, as filtered, as a CSV file. Frontend only. Intent, spec and plan are in `intent/2026-10-23-csv-export/`; not built yet.
7. **Phase 7: Recurring expenses.** Monthly rules (amount, category, note, day of month, start and optional end date) that add the due expenses when the app is opened, up to today, and can be paused. A new Recurring screen manages them, and added expenses carry a "Recurring" badge in Transactions. Intent, spec and plan are in `intent/2026-10-23-recurring-expenses/`; not built yet.

## Project Goals

- **Simple:** only the features listed above, with no unnecessary complexity
- **Practical:** useful for tracking real day-to-day spending
- **Maintainable:** clear structure, easy to read, easy to change
