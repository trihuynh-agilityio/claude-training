# Expense Tracker: UI design spec

This is the implementation guide for the frontend. The visual source of truth is the design canvas at
https://claude.ai/artifact/SdumiU3oAt8stbaR3ASLEa. It has desktop screens, mobile screens, the design
system, empty states and user flows. The Transactions, Add/Edit and Budget boards are clickable.

This spec covers design only. It doesn't choose storage or define API shapes beyond the fields the UI needs.

## 1. Principles

- Money and budget status carry the visual weight. Everything else is neutral.
- Use one primary action per view. The danger style is only for delete, and only inside a confirmation.
- Every status color comes with a text label, so color is never the only signal.
- Each empty state says what's missing and offers the one action that fixes it.

## 2. Design tokens

Define these as CSS custom properties in `src/index.css`.

### Color

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#15171C` | Primary text |
| `--ink-2` | `#4A505C` | Secondary text, nav |
| `--muted` | `#5B616E` | Labels, meta (≥ 4.5:1 on white) |
| `--line` | `#E6E6E1` | Card borders |
| `--line-soft` | `#EFEFEA` | Row dividers |
| `--control-border` | `#D9D9D3` | Inputs, secondary buttons |
| `--ground` | `#F6F6F3` | Page background |
| `--surface` | `#FFFFFF` | Cards, dialogs |
| `--primary` / `--primary-hover` | `#2445C8` / `#1C37A3` | Actions, links, focus |
| `--primary-soft` / `--focus-ring` | `#EEF1FC` / `#DCE3FB` | Selected nav/category, focus halo |
| `--danger` / `--danger-hover` | `#B42318` / `#912018` | Delete, error text and borders |

Budget status (text / bar fill / soft background):

| Status | Rule (spent ÷ budget) | Text | Fill | Soft |
|---|---|---|---|---|
| On track | < 85% | `#0B6B53` | `#13916B` | `#E3F3EC` |
| Near limit | 85–100% | `#8F4A00` | `#E08A00` | `#FDF0DC` |
| Over budget | > 100% | `#A11B12` | `#D92D20` | `#FCE8E6` |

Categories (tile background, white initial letter):

| Category | Letter | Hex |
|---|---|---|
| Food & Dining | F | `#C2541F` |
| Transport | T | `#2563EB` |
| Bills & Utilities | B | `#6D4AE0` |
| Shopping | S | `#C0368A` |
| Leisure | L | `#0D7F84` |
| Health | H | `#15803D` |
| Education | E | `#475569` |
| Other | O | `#6B7280` |

### Typography

**Be Vietnam Pro** (Google Fonts, weights 400/500/600/700) is used everywhere. It renders Vietnamese diacritics in notes cleanly.
Give every amount `font-variant-numeric: tabular-nums`.

| Role | Size / weight |
|---|---|
| Money XL (KPI) | 34 / 700, letter-spacing -0.02em |
| H1 page title | 28 / 700 |
| H2 section | 18 / 600 |
| Body | 15 / 400–500, line-height 1.5 |
| Small / meta | 13 / 400–500 |

### Spacing, radius, elevation

- Spacing scale: 4, 8, 12, 16, 24, 32, 40.
- Radius: 10 for controls, 12 for tiles and alerts, 16 for cards, 20 for dialogs and sheets, 999 for pills.
- Cards have a white background, a 1px `--line` border and no shadow. Only dialogs, sheets, toasts and the mobile FAB get a shadow.
- Touch targets are at least 44px. Primary mobile buttons are 52px tall.

## 3. Formatting rules

- **VND**: whole đồng only, with no decimals. Format as `1.250.000 ₫` (dot thousands, a no-break space, then the suffix).
  Use `new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`.
- Expenses display as plain positive amounts. Don't use a minus sign or red for normal spending.
- Remaining and over amounts read as `1.320.000 ₫ left` (status text color) or `340.000 ₫ over` (over color).
- Dates in lists use `Fri 16 Oct`. The last two days show as `Today · Fri 16 Oct` and `Yesterday · Thu 15 Oct`.
  Page headers use `Friday, 16 October 2026`. Date inputs use the native picker.

## 4. Layout and responsiveness

- **≥ 768px**: a 232px white sidebar (brand, primary "Add expense", nav: Dashboard, Transactions, Budget, Recurring) and fluid
  content with 32px/40px padding.
- **< 768px**: no sidebar. A bottom tab bar (Home, Transactions, centered + FAB, Budget, Recurring; the exact fit of a fourth tab is still to be confirmed by the product owner) with 16px gutters.
  Add/Edit opens as a full-screen sheet with a sticky bottom Save button. Confirmations are bottom sheets.
- Use `auto-fit` grids for the KPI cards (min 260px) and the dashboard's two panels (min 380px), so they stack on their own.
- Category chips scroll horizontally on mobile.

## 5. Components

| Component | Notes |
|---|---|
| `Button` | Variants `primary`, `secondary`, `danger`, `ghost-danger`. Min height 44, radius 10, weight 600. Disabled primary is `#A9B5E6`. |
| `IconButton` | 40–44px square. `aria-label` is required (e.g. "Delete Phở bò — breakfast"). |
| `MoneyInput` | Keeps digits only and shows grouped digits while typing, with a `₫` suffix. Large variant (30px) for the form's Amount. |
| `TextField`, `DateField`, `Select` | Label above, helper or error below. Error state: `--danger` border, `#FCE8E6` 3px halo, `aria-invalid`, message linked through `aria-describedby`. |
| `CategoryTile` | 36–40px rounded square, category color, white initial letter. |
| `CategoryPicker` | 4-column grid of tile and name buttons with `aria-pressed`. Selected state uses `--primary` border and `--primary-soft` background. |
| `CategoryChip` | Pill with a color dot. Active is ink-filled. Single-select, with "All categories" first. |
| `StatusBadge` | Pill: On track, Near limit or Over budget. |
| `ProgressBar` | 8–14px track `#EDEDE8` with the fill in the status color, capped at 100%. Optional black "today" tick at day ÷ days-in-month. Uses `role="progressbar"`. |
| `TransactionRow` | Tile, note (ellipsis), category, and amount on the right. Action icon buttons in order: Edit, Duplicate, Delete. Duplicate shows on mobile next to Edit; Delete is desktop only. |
| `DayGroupHeader` | `Today · Fri 16 Oct` with the daily subtotal on the right, on a `#FAFAF7` band. |
| `ConfirmDialog` | `role="alertdialog"`. Shows the expense summary (tile, note, category, date, amount). Cancel has default focus; the danger button is labelled "Delete expense". Becomes a bottom sheet on mobile. |
| `RecurringBadge` | Small neutral pill "Recurring" with a repeat icon, shown on a `TransactionRow` added by a rule. Text label always present; `--ink-2` on `--line-soft`. |
| `Toast` | Dark pill at bottom center, `role="status"`, disappears after 3.5 s. |
| `EmptyState` | Icon tile, title, one sentence and one action. |
| `Skeleton` | Shown only if loading takes longer than 300 ms. |

## 6. Screens

### Dashboard
1. A header with the date and a month switcher. "Next" is disabled on the current month.
2. Three KPI cards:
   - **Spent this month**, with a change vs. the same day last month.
   - **Remaining budget**, with a status badge, a progress bar with the today tick and "69% of 15.000.000 ₫ used".
   - **Safe to spend per day**, calculated as remaining ÷ days left, rounded down to 1.000 ₫.
3. A budget alert strip. It appears only when a category is over budget or near its limit, and links to Budget.
4. **Spending by category**: a stacked share bar, then rows sorted by amount (tile, name, share bar, amount, %).
5. **Recent transactions**: the latest 6, with a "View all" link.

### Transactions
- The header shows "N expenses · total" for the current filter.
- A filter card holds the search field, a date range select (This month, Last 7 days, Last month, Custom) and the category chips.
  Choosing Custom reveals From/To fields. If From is after To, show the error inline.
- The list is grouped by day, newest first, with daily subtotals.
- When no expenses match the filters, show the empty state with a "Clear filters" button.
- Delete opens the confirm dialog, then removes the row and shows a toast.
- **Export CSV** is a secondary button in the header, next to the primary "Add expense" (which stays the only primary
  action). It downloads the list as filtered on screen, newest first, as `expenses_<from>_<to>.csv` (or
  `expenses_<today>.csv` when a custom range has an open side). It is disabled while the list is loading, failed or
  empty. On success a toast reads "Exported N expenses" ("Exported 1 expense" for one). On mobile the button wraps
  under the title; the exact placement is still to be confirmed by the product owner.

### Recurring
- The header has the title and the primary "Add recurring expense" button. On desktop the sidebar's primary "Add expense"
  stays; this screen's button is the single primary action in the content area.
- Each rule is a card row: category tile, note (ellipsis), category, the amount, "Day 5 of every month", and the next due
  date as `Next: Mon 5 Nov`. A paused rule reads "Paused" and an ended one "Ended" instead of a date. Actions are icon
  buttons with an `aria-label` naming the rule: Edit, Pause or Resume, Delete.
- Delete opens the confirm dialog (rule summary, Cancel focused, danger button "Delete recurring expense") and says that
  expenses already added are kept. After deleting, a toast reads "Recurring expense deleted".
- Empty state: "No recurring expenses yet" with the sentence "Add rent, subscriptions and other monthly costs once." and
  the action "Add recurring expense".
- Pause and resume toast: "Paused" / "Resumed". A resumed rule skips the months missed while paused.

### Add / Edit recurring expense
| Field | Rules | Error copy |
|---|---|---|
| Amount, Category, Note | Same as Add / Edit expense | Same as Add / Edit expense |
| Day of month (required) | Whole number 1 to 31. Helper: "In shorter months this falls on the last day." | "Enter a day from 1 to 31." |
| Start date (required) | Defaults to today. Not more than 24 months back. Locked, with the helper "Can't change after the first expense is added.", once the rule has added an expense. | "Pick a start date." · "Start date can't be more than 24 months ago." |
| End date (optional) | Not before the start date. | "End date can't be before the start date." |

- Same validation flow, summary and focus rules as Add / Edit expense. Title "Add recurring expense" / "Edit recurring expense", buttons "Save" / "Save changes".
- Edit helper under the title: "Changes apply to future months only."
- A start date in the past shows the helper "This adds N expenses up to today." (final wording still to be confirmed by the product owner).
- Expenses added by a rule appear in Transactions with the `RecurringBadge`. They are edited and deleted like any other. Deleting
  one does not add it again.

### Add / Edit expense
| Field | Rules | Error copy |
|---|---|---|
| Amount (required) | Integer, 1 to 1.000.000.000 | "Enter an amount." · "Amount must be greater than 0 ₫." · "That's more than 1.000.000.000 ₫ — please check the amount." |
| Category (required) | One of 8 | "Choose a category." |
| Date (required) | Defaults to today. Can't be in the future. Has Today and Yesterday shortcuts. | "Pick a date." · "Date can't be in the future." |
| Note (optional) | Up to 120 characters, with a live counter | n/a |

- Validate on submit. After the first submit, re-validate each field as it changes.
- Show the summary "Fix N fields to save this expense." at the top with `role="alert"`, and move focus to the first invalid field.
- Quick amount chips: 50.000, 100.000, 200.000, 500.000.
- On success the form closes and a toast appears. If the expense pushes its category over budget, the toast says so.
- Duplicate opens this form in add mode (title "Add expense", button "Add expense", no Delete) with Amount, Category and Note copied from the original and Date set to today.
- Edit mode uses the title "Edit expense" and the button "Save changes". It has a ghost "Delete" button that asks for inline confirmation before deleting.

### Budget
- The overview card shows the monthly budget, a status badge, a progress bar with the today tick, and three stats:
  Spent, Remaining (≈ per day), and Allocated to categories (plus the unallocated amount).
- The category list has badge counts in its header. It sorts Over budget first, then Near limit, then by % used.
  Each row shows the progress bar, "spent of budget · %", and the amount left or over.
- **Edit budgets** turns every amount into a `MoneyInput`. If the category budgets add up to more than the monthly
  budget, show an error and disable Save. A monthly budget of 0 is also invalid.

## 7. Key flows

The canvas board "Key user flows" has the full step-by-step version. In short:
1. **Add**: open the form, enter the amount, pick a category, then save. Errors appear inline.
2. **Edit**: open from a row, change fields, then save changes.
3. **Delete**: trash icon (or Delete inside Edit on mobile), then the confirm dialog with Cancel focused, then delete and a toast. Delete is never one tap.
4. **Find**: search, then category chip, then date range, then grouped results. If nothing matches, show the empty state and "Clear filters".
5. **Budget**: Edit budgets, adjust amounts with a live allocated total, then save. Over-allocation blocks saving.
6. **Duplicate**: Duplicate icon on a row, then the Add expense form prefilled (date today), then save to add a new expense. The original is unchanged. Cancel adds nothing.

## 8. Accessibility checklist

- Use real `<button>`, `<a>`, `<label>` and `<input>` elements. Icon-only buttons need an `aria-label` that names the expense.
- Dialogs use `aria-modal`, trap focus, close on Esc and return focus to the element that opened them.
- Progress bars expose `aria-valuenow`. Status is always written as text, not only shown by color.
- Focus ring: a 3px `--focus-ring` halo plus a `--primary` border on inputs, and a visible outline on buttons.
- Text contrast is at least 4.5:1. All muted and status text colors above meet this on white.

## 9. Sample data (October 2026, today = 16 Oct)

Monthly budget is 15.000.000 ₫. Spent is 10.400.000 ₫ (69%) and remaining is 4.600.000 ₫, about 306.000 ₫/day for the 15 days left.

| Category | Budget | Spent | Status |
|---|---|---|---|
| Food & Dining | 4.500.000 | 3.180.000 | On track (71%) |
| Shopping | 2.000.000 | 2.340.000 | Over (117%) |
| Bills & Utilities | 2.500.000 | 2.215.000 | Near limit (89%) |
| Education | 1.500.000 | 990.000 | On track |
| Transport | 1.200.000 | 760.000 | On track |
| Leisure | 1.000.000 | 450.000 | On track |
| Health | 800.000 | 320.000 | On track |
| Other | 500.000 | 145.000 | On track |

Example expenses (from the Transactions board):

- 16 Oct: Phở bò — breakfast (Food & Dining), 65.000 ₫
- 16 Oct: Grab to office (Transport), 48.000 ₫
- 15 Oct: Electricity bill — September (Bills & Utilities), 1.120.000 ₫
- 14 Oct: Running shoes (Shopee) (Shopping), 890.000 ₫
- 14 Oct: Groceries — Bách Hóa Xanh (Food & Dining), 412.000 ₫

## 10. Mapping to the roadmap

| Phase | UI to build |
|---|---|
| 1. Expenses | Transactions list (no filters yet), Add/Edit form with validation, delete confirmation, toasts, empty state. Form fields: amount, date, note. |
| 2. Categories | Category field in the form, `CategoryTile` in rows, category colors |
| 3. Filtering | Search, category chips, date range, the "no match" empty state |
| 4. Monthly summaries | Dashboard: month switcher, Spent KPI, category breakdown, recent list |
| 5. Budgets | Budget page, Remaining and per-day KPIs, status badges, alert strip, toast warnings |
| 6. CSV export | Export CSV button on Transactions, "Exported N expenses" toast |
| 7. Recurring expenses | Recurring screen and form, `RecurringBadge` on Transactions rows, fourth navigation item |

UI fields per expense: `id`, `amount` (integer VND), `category_id`, `date` (ISO `YYYY-MM-DD`), `note` (≤ 120, optional).
Budgets: one monthly total and one optional amount per category, per month.
Recurring rules: `amount`, `category_id`, `note` (as for an expense), `day` (1 to 31), `start_date`, optional `end_date`, paused. An expense added by a rule also has `recurring_id`.
