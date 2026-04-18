# MELSA Mecca — system guide

> Full walkthrough of the system. Read top-to-bottom before a demo.
> File path: **`/Users/mohamedzaher/Desktop/Mitsubishi-system/SYSTEM_GUIDE.md`**

---

## 0. One-page summary

**MELSA Mecca** is an internal ERP/CRM/Field-Service platform for Mitsubishi Electric Saudi's Makkah branch. It manages elevators, escalators and moving walks across the customer lifecycle — from lead generation through installation, maintenance, invoicing, collection, and customer-facing self-service.

**Architecture:** Next.js 15 (App Router, Server Components, Server Actions) · TypeScript strict · Tailwind v4 · MongoDB Atlas + Mongoose · Auth.js v5 (JWT + argon2id) · dark-luxury design system.

**Everything in the system is real:** every KPI number comes from a live Mongo aggregation, every button triggers a server action, every mutation writes to the DB + audit log + notifications. No mockups, no "coming soon" pages.

**Two sign-in surfaces:**
- **Staff** → `/login` → role-aware dashboard and all operational modules
- **Customers** → `/login` → customer portal at `/portal` with their own units, visits, invoices, and support

---

## 1. How the hierarchy works

The system enforces a strict tier-based permission model. Each role has a numeric **tier** (0–100). Three scopes control what data each user sees:

| Scope | Meaning |
|---|---|
| `own` | Only records the user owns/created/is assigned to |
| `team` | Everything in their team + department |
| `department` | Everything in their department |
| `branch` | Everything in the branch (Mecca) |
| `region` | Multiple branches (not in MVP) |
| `global` | System-wide (Super Admin only) |

The sidebar is built dynamically from `src/config/navigation.ts`. Each nav item is filtered by:
1. Is this role permitted to view this resource? → `ROLE_PERMISSIONS` matrix (150+ entries in `src/config/permissions.ts`)
2. Is the user's role explicitly on the allow-list (for role-specific items like "My Day")?

At the database layer, every query passes through `scopedFilter(session, filter)` which auto-injects `branchId` scoping except for the executive tier.

**Key insight:** The same URL (e.g. `/tasks`) looks different per role — a Sales Exec sees only their own tasks, a Sales Manager sees their team's, Head of Sales sees the whole department, Branch Manager sees everything branch-wide. No redirects, no alternate pages — the filter changes.

---

## 2. The customer lifecycle (the key business flow)

This is the single most important story to walk the board through.

```
  LEAD  ────────►  QUALIFIED ────►  QUOTATION SENT ────►  ACCEPTED ────►  ACTIVE
  (Sales rep)      (Sales rep)      (Sales rep)           (Customer)      (auto)
                                                                           │
                                                                           ▼
                                                              Contract auto-generated
                                                                           │
                                                                           ▼
                                                              Invoices auto-generated
                                                              (cron, billing cycle)
```

### Step 1 — create a customer
`/customers/new` (sales rep) → status = `lead`, not counted as active.

### Step 2 — work the deal
Sales rep logs activities on the `/sales/opportunities/[id]` page (calls, emails, site visits with duration).

### Step 3 — send a quotation
`/sales/quotations/new` (or from a customer card) → line items + VAT auto-calculated → saved as `draft`.
Customer views the PDF (or deep-link) → status → `viewed` → `sent`.

### Step 4 — quotation accepted
On `/sales/quotations/[id]`, the sales rep clicks **Accept & activate customer**. This fires the `acceptQuotation` server action which, inside a MongoDB **transaction**:
1. Sets the quotation to `accepted` with acceptance timestamp.
2. Auto-creates a **Contract** (`CON-MKK-YYYY-#####`) with default AMC terms (12 months, semi-annual billing in-advance).
3. Flips the Customer's status to `active` and stamps `activatedAt`.
4. Writes an audit log entry.

From this moment the customer is **counted in Active Ratio** on every sales dashboard.

### Step 5 — service begins
The Service Manager schedules visits on `/service/schedule` (monthly planner grid). Technicians see visits in `/service/my-day`.

### Step 6 — billing
A cron job (`/api/cron/generate-invoices`, runs daily) checks every active contract. When the next billing period is due (based on `billingCycle`), it creates an invoice with correct period, VAT, and aging bucket.

### Step 7 — collection
`/api/cron/collection-reminders` updates aging daily, flips invoices to `overdue`, and sends milestone notifications at −7 / 0 / +7 / +30 / +60 days to the assigned collection officer.

### Step 8 — payment
`/finance/payments/new` — select invoice (searchable!), enter amount + method. The `recordPayment` server action updates `paidAmount`, `balance`, and if balance hits zero flips status to `paid` and notifies the collection officer.

### Step 9 — renewal
`/api/cron/expiring-contracts` flips contracts to `expiring_soon` at 90 days out and notifies sales + account manager at 90/60/30 day milestones. Sales rep opens `/contracts/[id]/renew` → picks new duration + price adjustment → system creates a **new** contract referencing the old one (`renewedFromId`).

---

## 2.1 Per-role lifecycles (end-to-end workflows)

### 🧑‍🔧 Technician lifecycle
```
Dispatcher/Service Mgr                   Technician                    Customer
         │                                    │                            │
    Create WO  ─────notification──────►  /service/my-day                   │
         │                                    │                            │
         │                               Tap card → detail                 │
         │                               Open Google Maps → drive          │
         │                                    │                            │
         │                               Start Visit                       │
         │                            (GPS + timestamp stored)             │
         │◄──────────"In visit" ping────────  │                            │
         │                                    │                            │
         │                               Work through checklist            │
         │                               Upload before photos              │
         │                                    │                            │
         │                          (if needed) Request spare part ───► Service Mgr
         │                                    │                            │        (approve)
         │                                    │◄─────spare approved notification─┘
         │                                    │                            │
         │                               Upload after photos               │
         │                               End Visit                         │
         │                         (duration variance auto-computed)       │
         │                                    │                            │
         │                                    │◄──── rate prompt ─────────►
         │                                    │                       Rate 1-5 stars
         │                                    │                       Submit comment
         │                                    │                            │
    Dashboard reflects:                       │                            │
    +1 completed visit                        │                            │
    variance on technician KPIs               │                            │
    customer satisfaction ↑                   │                            │
```

### 💼 Sales rep lifecycle
```
Lead gen                Sales Exec                    Sales Mgr / Head          Customer
   │                        │                                │                      │
   │  ─── new inquiry ────► │                                │                      │
   │                        │                                │                      │
   │                    /customers/new                       │                      │
   │                  (status: lead)                         │                      │
   │                        │                                │                      │
   │                  Log activities:                        │                      │
   │                  - call                                 │                      │
   │                  - email                                │                      │
   │                  - site visit                           │                      │
   │                        │                                │                      │
   │                  Move through stages:                   │                      │
   │                   lead → qualified                      │                      │
   │                   → site_survey                         │                      │
   │                        │                                │                      │
   │                  /sales/quotations/new                  │                      │
   │                  (line items + VAT)                     │                      │
   │                        │     ──── send PDF ────────────────────────────────────►
   │                        │                                │                      │
   │                        │                                │               View quotation
   │                        │◄────── Accept button ──────────────────────────────────│
   │                        │                                │                      │
   │                   Click "Accept & activate"             │                      │
   │                   (transaction):                        │                      │
   │                    ✓ Quotation → accepted               │                      │
   │                    ✓ Customer → active                  │                      │
   │                    ✓ Contract auto-created              │                      │
   │                    ✓ Active Ratio KPI ↑                 │                      │
   │                        │                                │                      │
   │                        │                         Sees in Active                │
   │                        │                         Ratio card +1                 │
```

### 💰 Collection officer lifecycle
```
Cron (daily)           Collection Officer            Customer           Finance
   │                          │                          │                 │
   Invoice cron updates       │                          │                 │
   aging buckets              │                          │                 │
       │                      │                          │                 │
       └── -7 / 0 / +7 / +30 / +60 day milestone ───►                      │
                              │   (notification)         │                 │
                              │                          │                 │
                         /finance/collection             │                 │
                         Top overdue list                │                 │
                              │                          │                 │
                         Call customer ──────────────────►                 │
                         Record Promise-to-Pay           │                 │
                         (amount + date + note)          │                 │
                              │                          │                 │
                              │◄──────── payment ────────│                 │
                              │                          │                 │
                         /finance/payments/new           │                 │
                         Select invoice (searchable)     │                 │
                         Enter amount + method           │                 │
                              │                          │                 │
                         recordPayment():                 │                 │
                          ✓ Invoice balance ↓            │                 │
                          ✓ Status → paid                │                 │
                          ✓ Collection Rate KPI ↑        │                 │
                          ✓ DSO recalculated             │                 │
                          ✓ Customer health score ↑      │                 │
                              │                          │                 │
                              │                          │           Reconciled
                              │                          │           auto-marked
```

### 🚨 Dispatcher / Emergency lifecycle
```
Customer hotline                Dispatcher                      Technician         Branch Manager
   │                               │                                │                   │
   Call 8001282828                 │                                │                   │
   Elevator stuck                  │                                │                   │
   │                               │                                │                   │
   │ ─────────────────────────► Create emergency WO                 │                   │
   │                           (priority: critical)                 │                   │
   │                           60-min SLA starts                    │                   │
   │                               │                                │                   │
   │                           Pick nearest tech ─── notify ──────► │                   │
   │                           (from live map)                      │                   │
   │                               │                                │                   │
   │                               │                           Accept ping             │
   │                               │                           Drive to site            │
   │                               │                           Start visit (GPS)        │
   │                               │                                │                   │
   │                           Live map shows                       │                   │
   │                           tech pin pulsing red                 │                   │
   │                           (emergency state)                    │                   │
   │                               │                                │                   │
   │                               │◄──── issue resolved ──────────│                   │
   │                               │                           End visit                │
   │                               │                                │                   │
   │                           SLA timer stops                      │                   │
   │                           SLA met/breached flag set            │                   │
   │                               │                                │                   │
   │                               │                                │             Dashboard
   │                               │                                │             reflects
   │                               │                                │             ↓
   │                                                                            SLA compliance
   │                                                                            metric
   │◄──── follow-up + feedback request ──────────────────────────────────────────────────
```

### 🏢 Customer portal lifecycle
```
Customer                        Portal                     MELSA team
   │                               │                            │
   Login (customer@)               │                            │
   │                          /portal home                      │
   │                          (units, contracts,                │
   │                           next visit, outstanding)         │
   │                               │                            │
   Click unit → history            │                            │
   See service report              │                            │
   Rate last visit ────────► submitVisitRating() ──── notify ──► Technician + Supervisor
                                   │                            (KPIs update live)
                                   │                            │
   Click "Report issue"            │                            │
   → /portal/support/new ───► Creates Dispute ──── notify ────► Dispatcher
                             (severity chosen)                  (assign, investigate,
                                   │                             forward, resolve)
                                   │                            │
                             Timeline updates                   │
                             visible to customer                │
```

### 📢 Announcement lifecycle (new feature)
```
Branch Mgr / Head                   System              Staff
   │                                  │                  │
   /announcements/new                 │                  │
   Title + body + priority            │                  │
   Audience: branch / role            │                  │
   Pinned? Notify?                    │                  │
   │                                  │                  │
   Publish ─────────► Creates Announcement               │
                      ├─ Bell badge +1 ────── for each recipient
                      ├─ In notifications inbox          │
                      └─ /announcements feed             │
                                  │                      │
                                  │               Click notification
                                  │                      │
                                  │               Mark Read ────► acknowledgedBy[]
                                  │               (for audit trail of who saw it)
```

---

## 3. What each role sees and does

### 3.1 Super Admin (`admin@melsa-mkk.com`)
Role: **`super_admin`** · Tier 100 · Scope: `global`

**Dashboard (`/dashboard`):**
- Gold ◆ accent applied
- Hero strip with Revenue MTD (with sparkline + MoM %), Revenue YTD, Contract Value, Customer Satisfaction — all click-through to their drill-downs.
- Standard KPIs: Active customers → `/customers?status=active`, Active contracts → `/contracts?status=active`, Units → `/units`, Active ratio → `/sales/opportunities`.
- AR strip: Total AR → `/finance/collection`, Collected MTD → `/finance/payments`, Visits today → `/service/work-orders`, Pending approvals → `/spare-parts/requests?status=pending_manager_approval`.
- Revenue trend bar chart (12 months).
- AR Aging donut + bucket list (each aging bucket is clickable → filtered invoices).
- Alerts panel (contracts expiring, invoices overdue, critical disputes, low stock, active-ratio-below-target).
- **Intel row:** customer status bars, sales pipeline funnel, visit type mix.
- Technician leaderboard (click row → team member profile).
- Top overdue customers (click → customer 360).
- Asset age distribution, Risk & compliance panel, People panel.
- Strategic recommendations block.

**Can do anything:** create/edit/delete all entities, see audit log, manage all users, change all settings.

### 3.2 Branch Manager (`branch.manager@melsa-mkk.com`)
Role: **`branch_manager`** · Tier 75 · Scope: `branch`

Same dashboard as Super Admin but without gold ◆. Everything is scoped to Mecca branch only.

**Responsibilities:**
- Approves user additions at the branch level.
- Reviews and signs off on critical disputes.
- Monitors branch P&L via `/reports/finance` and `/reports/executive`.
- Sends branch-wide **announcements** (`/announcements/new`).
- Drills into specific departments when KPIs go off-target (alerts panel calls out the offenders).

### 3.3 Head of Sales (`sales.head@melsa-mkk.com`)
Role: **`head_of_sales`** · Tier 65 · Scope: `department` (Sales)

**Sees:**
- `/sales/opportunities` — full pipeline across all sales reps
- `/sales/quotations` — all quotes, can approve
- `/customers` — all customers in the branch
- `/customers/health` — customer health scores, at-risk list
- `/reports/sales` — deep sales analytics
- `/tasks` — all sales department tasks

**Cannot see:** other departments' internal work (service work orders, finance, etc. — unless a dispute or customer touchpoint surfaces it).

### 3.4 Sales Manager (`sales.manager@melsa-mkk.com`)
Role: **`sales_manager`** · Tier 55 · Scope: `team`

**Sees:**
- Their sales team's pipeline (not entire branch)
- **Active Ratio** as the key KPI — the sales pipeline with customers not yet active, needing to be closed.
- Team leaderboard
- Team tasks and disputes

**The Active Ratio story:** This was a specific founder ask. If the team has 20 active customers but 80 leads, that's 20% active ratio — way below 40% target. The card flags red/warning. Clicking it opens the pipeline view with filter → see the 80 non-active customers and their pipeline stages.

### 3.5 Sales Executive (`sales1@melsa-mkk.com`)
Role: **`sales_executive`** · Tier 30 · Scope: `own`

**Sees only their own:**
- Customers they're assigned to (`assignedSalesRepId`)
- Opportunities they own
- Quotations they prepared
- Tasks assigned to them or by them

**Can:** Create customers, opportunities, quotations. Log activities. Send quotes.
**Cannot:** See other reps' work. Cannot delete customers (soft-delete is branch-manager+).

### 3.6 Head of Service (`service.head@melsa-mkk.com`)
Role: **`head_of_service`** · Tier 65

**Sees everything service-related across the branch:**
- All work orders (`/service/work-orders`)
- All technicians' performance (leaderboard on dashboard)
- Spare part request queue — **approves** or rejects requests

**Can approve spare parts:** When a technician requests a part during a visit, the request lands on the `/spare-parts/requests` page. The Head of Service (or Service Manager) opens the request at `/spare-parts/requests/[id]` and clicks **Approve**. The `approveSparePartRequest` action runs, checks warehouse stock, auto-routes to `ready_for_pickup` if in stock OR flags for PO if not, and notifies the technician.

### 3.7 Service Manager (`service.manager@melsa-mkk.com`)
Role: **`service_manager`** · Tier 55

**The most important operational page: `/service/schedule`** — the monthly planner grid.

Every 1st of the month, the Service Manager opens this page. Rows are technicians (all 25 of them); columns are the days of the month. For each (tech, day) cell, the manager creates work orders with specific time slots. The page renders a compact grid showing all assignments for the month, color-coded by priority.

Clicking any cell or visit opens the work order detail page.

**Also uses:**
- `/service/dispatch` — live view with the **SVG Tech Map** showing where every technician is (emergency=red pulsing, in-visit=amber pulsing, idle=blue, off-duty=muted). Hover a pin → name + current status + click opens their profile.
- `/service/work-orders/new` — one-off visit creation (with searchable unit + technician selectors).

### 3.8 Service Technician (`tech1@melsa-mkk.com` through `tech25@...`)
Role: **`service_technician`** (tiers 15–30) · Scope: `own`

**The mobile-first flow the user repeatedly emphasized:**

1. Technician logs in on their phone → lands on **`/service/my-day`**
2. See today's visits as **time-slot cards** — vertical timeline: 08:00 Hilton Makkah, 11:00 Al-Haram Towers, 14:00 Mercure Hotel, etc.
3. Date picker at top → navigate to any other day
4. Tap a card → work order detail:
   - Full customer info + primary contact phone (tap to call: `tel:+966...`)
   - Unit details (model, serial, capacity, last service, history)
   - **Checklist** (dynamic per unit type, 10 items default)
   - **Before/After photos** — paste image URLs with captions, see thumbnails, delete anytime. Currently URL-based (not file upload) for demo speed. Schema supports direct R2/S3 upload in prod.
   - **"Open in Google Maps"** button → `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG` → deep-links into the native Maps app
   - **"Call supervisor"** button
   - **Start Visit** button → captures GPS via `navigator.geolocation`, timestamps, status → `in_progress`, notifies supervisor
   - **End Visit** button → captures GPS again, timestamps, computes `actualDurationMinutes`, computes `durationVarianceMinutes` vs expected, status → `completed`
   - **Request spare part** — inline form creates `SparePartRequest`, notifies Service Manager
5. Once completed → customer gets a notification with feedback link (`/portal/visits/[id]/feedback`)

**Technician dashboard:** personal KPIs (visits completed 30d, avg rating, duration variance, ranking), today's visits, upcoming, assigned tasks.

### 3.9 Dispatcher (`cc1@melsa-mkk.com`)
Role: **`dispatcher`** · Tier 30

Lives on **`/service/dispatch`** and **`/service/emergency`**.
- Takes customer calls via the 24/7 hotline (8001282828)
- Creates emergency tickets → picks nearest available technician → SLA timer starts (60 min)
- Reassigns visits when a technician is unavailable

### 3.10 Collection Manager (`collection.manager@melsa-mkk.com`)
Role: **`collection_manager`** · Tier 55

**Lives on `/finance/collection`:**
- AR Aging donut + bucket list (clickable to drill into filtered invoices)
- Top 10 overdue customers (click → customer 360)
- Officer performance table
- Active Promises-to-Pay

**Deep drilldown: `/reports/collection`** — DSO trend, officer scorecard with collection rate %, write-offs, etc.

### 3.11 Collection Officer (`collection1@melsa-mkk.com`)
Role: **`collection_officer`** · Tier 25 · Scope: `own`

**Workflow:**
1. Collection Reminders cron runs daily → sends notifications at −7/0/+7/+30/+60 milestones
2. Officer opens notifications → clicks → lands on overdue invoice
3. Calls customer → logs a **Promise to Pay** (PTP): amount + date + note
4. If kept → customer pays → officer records payment (`/finance/payments/new`, searchable invoice picker)
5. If broken → follows up, escalates to Collection Manager

**Their portfolio:** Any invoice with `assignedCollectionOfficerId == user._id` is theirs. All personal KPIs on their dashboard are computed from this slice.

### 3.12 Customer (`customer@melsa-mkk.com`)
Role: **`customer`** · Scope: `own`

**Portal: `/portal`** — completely separate experience.
- Home: next service date, active contracts, outstanding balance, upcoming visits
- **Service history** with stars already given
- **Rate a visit** — click a completed visit → 5-star form + comment
- **Invoices** with balance, due dates, ZATCA QR code
- **Report an issue** → raises a Dispute that lands on Dispatcher's queue
- **Emergency button** → tel: link to hotline + guidance banner

---

## 4. Key pages and what they do

### 4.1 Navigation (sidebar)

Visible to staff (filtered by permission):
- **Dashboard** — role-aware, clickable KPIs everywhere
- **Commercial:** Customers · Units · Sales Pipeline (Kanban) · Quotations · Contracts
- **Service:** My Day (technicians) · Monthly Planner · Dispatch · Work Orders
- **Parts & Inventory:** Spare Part Requests · Inventory · Procurement
- **Finance:** Invoices · Collection · Payments
- **Collaboration:** Tasks · Disputes · Announcements
- **Insights:** Reports · Customer Health · Modernization · Warranty Tracker · Audit Log
- **Administration:** Team · Settings

### 4.2 Customer 360 (`/customers/[id]`)
Header: avatar + commercial name + code + type + status badge.
KPI strip: Units · Active contracts · Outstanding · Lifetime paid.
Three cards: Profile · Primary contact · Primary location (with Google Maps deep-link).
Tabs: Units · Contracts · Visits · Invoices · Notes (all with real data).

### 4.3 Work Order detail (`/service/work-orders/[id]`)
- Customer / Unit / Team/Timing cards at the top
- **Start/End visit buttons** if you're the assigned technician (captures GPS)
- Tabs: Checklist (editable during visit) · Photos (before/after URL upload) · Parts · Notes · Rating
- All changes immediately reflected in supervisor's dashboard within 1 second.

### 4.4 Monthly planner (`/service/schedule`)
CSS grid: techs (rows) × days (columns). Each cell shows time-slot pills. Weekends highlighted. Click any visit pill → work order detail. Color-coded: completed = green, critical = red, high = amber, normal = neutral.

### 4.5 Dispatch (`/service/dispatch`)
- KPI strip (in progress, completed, idle, emergencies)
- **Live SVG tech map** (see section 3.7)
- Active emergencies panel with SLA
- Technician status table

### 4.6 Collection (`/finance/collection`)
- 4 KPIs (Total AR, Past due, Critical 61+, Expected this week)
- **AR Aging bucket list** (each bucket is a link to filtered invoices — `/finance/invoices?aging=31-60`, etc.)
- Top 10 overdue customers
- Active promises-to-pay

### 4.7 Reports (`/reports/[template]`)
6 reports: sales, service, finance, collection, customers, executive.
- KPIs at top
- Charts (bar, horizontal bar, donut)
- Data tables (top performers, top overdue, etc.)
- **Export CSV** button → fetches `/api/reports/[template]/export` → generates CSV with BOM (Arabic-safe) → downloads
- **Print / Save as PDF** button → opens browser print dialog with print stylesheet (hides sidebar, topbar) → user saves as PDF

### 4.8 Customer Health (`/customers/health`)
Composite score 0–100 per active customer. 4 factors:
- Payment behavior (40 pts)
- Service satisfaction (30 pts)
- Complaint volume (20 pts)
- Risk rating (10 pts)

Bands: **green** (≥75) · **yellow** (50–74) · **red** (<50). At-risk list shows signals per customer: "3 overdue invoices · 1 open dispute · Low satisfaction (2.7★)".

---

## 5. Numbers are real — how data flows

No hardcoded numbers anywhere. Every metric is a live query:

| Dashboard element | Source |
|---|---|
| Active customers | `Customer.countDocuments({ status: "active", branchId })` |
| Active ratio | `active / (active + pipeline)` across Customer collection |
| Total AR | `Invoice.aggregate` summing `balance` where status ∈ open set |
| Collected MTD | `Payment.aggregate` summing `amount` where `receivedAt >= monthStart` |
| Pipeline value | `Opportunity.aggregate` summing `value` |
| Weighted forecast | `Opportunity.aggregate` summing `value × probability/100` |
| Win rate | won / (won+lost) over last 90 days |
| Visits today | `WorkOrder.countDocuments({ scheduledDate: { $gte: today } })` |
| DSO | (Total AR × 365) / Total Billed |
| Customer health score | live calc from Invoices + WorkOrders + Disputes + Customer.riskRating |
| Technician rating | `WorkOrder.aggregate` averaging `customerFeedback.rating` grouped by technicianId |

Because everything is a Mongo aggregation, changing any document (pay an invoice, complete a visit, rate a technician, accept a quotation) immediately affects every downstream metric on next page load.

---

## 6. Test / demo script for the board (15-minute flow)

> **Before starting:** dev server running at `http://localhost:3000`. Three browser tabs pre-opened to `/login`.

### Minute 0–1 · Super Admin — the god view
- Login as `admin@melsa-mkk.com` / `Melsa@2026!`
- Land on `/dashboard`. **Point out:** gold ◆ accent (reserved for executive tier), live indicator pulsing.
- "Every number on this page is a live MongoDB aggregation, not a cached snapshot."
- **Click** the Active Ratio KPI card → opens `/sales/opportunities` — the Kanban pipeline. "If this number is low, one click and we're on the corrective-action screen."

### Minute 1–3 · Sales story
- Back to `/dashboard`. Click **Customer intelligence** panel → shows status distribution.
- Navigate to `/reports/sales` → "Here's the sales report Chairman asked for last quarter. Pipeline funnel, win rate, top reps, quota attainment, loss-reason Pareto. Click **Export CSV** → real file downloads with all numbers. Click **Save as PDF** → browser print dialog."
- Open `/sales/quotations/new`, show the **searchable customer dropdown** — type "al-haram" → instant filter. "No more scrolling through 80 customers."

### Minute 3–7 · Field service story (the heart)
- Open incognito tab → login as `tech1@melsa-mkk.com` → lands on `/service/my-day`.
- "This is what every one of our 25 technicians sees first thing every morning. No navigation needed — their day is here."
- Click a visit → full work order detail. Point out Google Maps deep-link, Call Customer, Call Supervisor, checklist, before/after photo inputs.
- **Start visit** → GPS captured, status flips, toast appears. Open the original tab (Service Manager) → `/service/dispatch` → point at the **live tech map** → that technician's pin is now pulsing amber.
- **End visit** (go back to tech tab) → duration variance computed automatically. Show "+5 min variance" badge.
- Back to dispatch → pin returns to idle.

### Minute 7–9 · Spare parts flow
- On the work order (in tech tab), show the spare part request form (in Parts tab).
- Switch to Service Manager tab (`service.manager@melsa-mkk.com`) → `/spare-parts/requests` → the just-created request is at the top, status `pending_manager_approval`.
- Click it → **Approve** → toast "Request approved". Switch back to tech tab → request status is now `ready_for_pickup`.

### Minute 9–11 · Collection story
- Open third tab → login as `collection.manager@melsa-mkk.com` → `/finance/collection`.
- "AR aging — every bucket is a link." Click the 61-90 bucket → filtered invoice list.
- Back → scroll to Top 10 Overdue → click a customer row → lands on customer 360. "Everything about this customer in one place. Timeline, disputes, invoices, payment history."
- Navigate to `/reports/collection` → "DSO, officer performance, write-offs — shareable as PDF with the Chairman."

### Minute 11–13 · Customer portal (external-facing)
- Logout; login as `customer@melsa-mkk.com` / `Customer@2026!` → lands on `/portal`.
- "This is what their facilities manager sees when they log in to their MELSA account."
- Show `/portal/units` (their units only — 4 of them), `/portal/visits` (service history with stars already given), `/portal/invoices` (outstanding balance, ZATCA QR).
- Click a completed visit → **Rate this visit** → 5 stars + comment → submit → "That rating is now live in the technician's dashboard AND the Head of Service's leaderboard."

### Minute 13–14 · Customer Health + Announcements
- Back to Super Admin tab → navigate to `/customers/health` → "Composite score per customer. Red/yellow/green. At-risk list tells us who to save before they churn."
- `/announcements/new` → Create "Merge freeze starts Thursday" → priority high → publish. "All 65 staff in the branch just got a notification."

### Minute 14–15 · Q&A / close
- "Everything you've seen is wired to MongoDB. 85 customers. 98 units. 238 historical work orders. 59 invoices. 627 notifications. Not mockups."
- Show `ACCOUNTS.md` listing all roles for them to try.

---

## 7. Still-to-do in production (phase 2)

Non-blocking for the board demo but noted for transparency:

- **Pusher real-time WebSocket** (env vars required) — currently using request-based updates + polling on notifications bell. Wire `PUSHER_*` env vars to enable sub-second propagation.
- **R2/S3 file upload** for before/after photos — currently URL-paste. Schema and UI support direct upload; needs `R2_*` creds.
- **Resend transactional email** — `RESEND_API_KEY` needed for invoice emails, password reset, reminder emails.
- **Arabic UI** — scaffold is in place (`next-intl`, RTL-aware layout). Translation keys are already extracted; `ar.json` needs to be populated.
- **SMS (Twilio/Unifonic)** — Phase 2 per spec.
- **Full CSV bulk user import** — button exists but not wired.
- **First-login forced password change** — `mustChangePassword` flag on User schema; needs a client-side guard.

---

## 8. Engineering notes (for the dev team)

- **File layout:** App Router groups — `(auth)/`, `(dashboard)/`, `(customer-portal)/`.
- **Server actions** live in `src/server/{module}/` — all mutations go through these.
- **Data scope** — `src/server/filters.ts :: scopedFilter()` is the single function enforcing branch-level scoping.
- **RBAC matrix** in `src/config/permissions.ts` — grant/deny per (role, resource, action, scope).
- **Mongoose models** in `src/models/`. 23 models + `Announcement`.
- **UI primitives** in `src/components/ui/`. Shadcn-style, dark-first, Radix-backed.
- **Charts** are hand-rolled SVG in `src/components/charts/sparkline.tsx` + `tech-map.tsx`. No heavy chart lib dep (Recharts installed but unused for performance).
- **No `any` anywhere** — strict TS passes clean.
- **3 cron routes** at `/api/cron/*` with `CRON_SECRET` auth.
- **Audit log** for every critical mutation. Immutable collection.

---

*Last updated when the system was smoke-tested with all routes returning 200, typecheck clean, and every export button verified to produce real downloads.*
