# Personal Expense Tracker

## Project Overview

A simple personal expense tracker for recording daily expenses and understanding spending habits.

## Core Features

- **Expenses:** add, edit, and delete expenses
- **Categories:** assign a category to each transaction
- **Filtering:** filter expenses by date range and category
- **Monthly summaries:** view total spending per month, broken down by category
- **Budgets:** set a monthly budget and track spending against it

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite 8, linted with oxlint (`frontend/`)
- **Backend:** Python 3.13 + FastAPI, managed with uv, tested with pytest (`backend/`)
- **Storage:** not chosen yet; to be decided in Phase 1

In development, the Vite dev server proxies `/api` requests to the backend on port 8000.

## Project Structure

```
expense-tracker/
├── frontend/          React + TypeScript app (Vite)
│   └── src/           App entry point and components
└── backend/           FastAPI app (uv)
    ├── app/main.py    API entry point, including GET /api/health
    └── tests/         pytest tests
```

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

The page should show **API status: ok** when both are running.

Run checks:

```bash
cd backend && uv run pytest
cd frontend && npm run lint && npm run build
```

## Development Roadmap

Each phase should be small, usable on its own, and build on the one before.

1. **Phase 1: Basic expense tracking (MVP).** Add, view, edit, and delete expenses (amount, date, description). Data persists between sessions.
2. **Phase 2: Categories.** Assign a category to each expense and manage the list of categories.
3. **Phase 3: Filtering.** Filter the expense list by date range and category.
4. **Phase 4: Monthly summaries.** Show monthly totals and a per-category breakdown.
5. **Phase 5: Budgets.** Set monthly budgets and show remaining or overspent amounts.

## Project Goals

- **Simple:** only the features listed above, with no unnecessary complexity
- **Practical:** useful for tracking real day-to-day spending
- **Maintainable:** clear structure, easy to read, easy to change
