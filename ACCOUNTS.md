# MELSA Mecca — demo accounts

> Open this file at: **`/Users/mohamedzaher/Desktop/Mitsubishi-system/ACCOUNTS.md`**

All accounts use the same password unless marked otherwise. Log in at **http://localhost:3000/login**.

Default password for staff: **`Melsa@2026!`**
Default password for customer portal: **`Customer@2026!`**

---

## Executive & Branch Leadership

| Role | Email | Lands on |
|---|---|---|
| Super Admin / Founder | `admin@melsa-mkk.com` | `/dashboard` — God view, all 12 exec sections, gold accents |
| Branch Manager | `branch.manager@melsa-mkk.com` | `/dashboard` — Mecca-scoped exec dashboard |

## Department Heads

| Role | Email | Focus |
|---|---|---|
| Head of Sales | `sales.head@melsa-mkk.com` | Sales pipeline, active ratio, team leaderboard |
| Head of Service | `service.head@melsa-mkk.com` | Visits, FTFR, technician KPIs, spare part approvals |
| Head of Finance | `finance.head@melsa-mkk.com` | Revenue, AR, invoices, payments, VAT |
| Head of Collection | `collection.head@melsa-mkk.com` | AR aging, DSO, officer performance, PTPs |
| Head of Procurement | `procurement.head@melsa-mkk.com` | Purchase orders, vendors, spare parts |

## Managers

| Role | Email |
|---|---|
| Sales Manager | `sales.manager@melsa-mkk.com` |
| Service Manager | `service.manager@melsa-mkk.com` |
| Dispatch Manager | `dispatch.manager@melsa-mkk.com` |
| Installation Manager | `install.manager@melsa-mkk.com` |
| Finance Manager | `finance.manager@melsa-mkk.com` |
| Collection Manager | `collection.manager@melsa-mkk.com` |
| Procurement Manager | `procurement.manager@melsa-mkk.com` |
| Warehouse Manager | `warehouse.manager@melsa-mkk.com` |
| Customer Care Manager | `cc.manager@melsa-mkk.com` |
| HR Manager | `hr.manager@melsa-mkk.com` |

## Supervisors

| Role | Email |
|---|---|
| Service Supervisor #1 | `service.super1@melsa-mkk.com` |
| Service Supervisor #2 | `service.super2@melsa-mkk.com` |
| Sales Team Leader | `sales.leader1@melsa-mkk.com` |
| Collection Supervisor | `collection.super@melsa-mkk.com` |

## Field Technicians (25 accounts)

Emails: `tech1@melsa-mkk.com` through `tech25@melsa-mkk.com`

- `tech1` – `tech3` — Senior Technicians
- `tech4` – `tech21` — Service Technicians
- `tech22` – `tech25` — Apprentice Technicians

**Technician default page:** `/service/my-day` — shows today's visits with Start/End buttons, Google Maps link, checklist, and photo upload options.

## Sales team (8)

Emails: `sales1@melsa-mkk.com` through `sales8@melsa-mkk.com`
- `sales1`–`sales2` — Sales Engineers
- `sales3`–`sales8` — Sales Executives

## Collection officers (4)

Emails: `collection1@melsa-mkk.com` through `collection4@melsa-mkk.com`

## Customer care (3)

- `cc1@melsa-mkk.com` — Dispatcher (runs `/service/dispatch`)
- `cc2@melsa-mkk.com` — Customer Care Agent
- `cc3@melsa-mkk.com` — Customer Care Agent

## Accounting & warehouse

| Role | Email |
|---|---|
| Accountant #1 | `accountant1@melsa-mkk.com` |
| Accountant #2 | `accountant2@melsa-mkk.com` |
| Warehouse Officer | `warehouse.officer@melsa-mkk.com` |
| Procurement Officer | `procurement.officer@melsa-mkk.com` |

## Customer portal (external user)

| Email | Password | Linked to |
|---|---|---|
| `customer@melsa-mkk.com` | `Customer@2026!` | Al-Falah Residential (MELSA-MKK-2026-0008) |

Lands on `/portal`. Sees only their own units, visits, invoices, and contracts. Can raise support tickets, report emergencies, and rate completed visits.

---

## Quick demo flow for the board

1. **Login as `admin@melsa-mkk.com`** → Super Admin dashboard with revenue trend, customer intelligence, sales pipeline funnel, technician leaderboard, top overdue, asset-age distribution, risk panel.
2. **Click Reports → Sales** → `/reports/sales` shows pipeline funnel, win rate, top reps, loss reasons, quota attainment.
3. **Switch to `sales.manager@melsa-mkk.com`** → Sees Active Ratio card prominently, team pipeline.
4. **Switch to `tech1@melsa-mkk.com`** → Lands on `/service/my-day` showing today's visits. Click a visit → full detail with checklist, Start Visit button, Google Maps deep link.
5. **Back to `service.manager@melsa-mkk.com`** → `/service/schedule` monthly planner (techs × days grid), `/service/dispatch` live technician status.
6. **Switch to `collection.manager@melsa-mkk.com`** → `/finance/collection` AR aging donut, top overdue customers, officer performance.
7. **Switch to `customer@melsa-mkk.com`** → Customer portal. See units, last visits, rate a completed visit with stars, open a support ticket.

---

## New modules added (round 2)

- **`/customers/health`** — Customer Health Score (0-100, green/yellow/red) from payment behavior + satisfaction + complaints + risk rating. At-risk list for proactive intervention.
- **`/units/warranty`** — Warranty tracker grouped by status (in warranty / expiring 90d / expired).
- **`/units/modernization`** — Modernization opportunities: 15+ year units or units with 3+ failures.
- **`/announcements`** + **`/announcements/new`** — Broadcast module. Branch Manager / Heads send to all staff or specific roles with in-app notifications + ack tracking.
- **Live technician map** on `/service/dispatch` — SVG map with animated pins (emergency pulsing red, in-visit pulsing amber, idle blue, off-duty muted), hover tooltips.
- **Photo upload UI** on work order detail — technicians paste before/after photo URLs with captions.
- **3 cron routes** (protected by `CRON_SECRET`):
  - `GET /api/cron/generate-invoices` — auto-generates invoices from contract billing cycles
  - `GET /api/cron/collection-reminders` — updates aging buckets, flips status to overdue, sends reminders at -7/0/+7/+30/+60 day milestones
  - `GET /api/cron/expiring-contracts` — flips contracts to `expiring_soon`, notifies sales rep at 90/60/30 days
  - Call: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/generate-invoices`

## Re-seeding

If you need to wipe and re-create all data:

```bash
cd /Users/mohamedzaher/Desktop/Mitsubishi-system
npm run seed:reset          # seeds staff + seed data
npx tsx src/scripts/add-customer-user.ts    # re-create customer user
```

## Notes

- All staff accounts have **`mustChangePassword: false`** for demo. In production, first login forces a password reset.
- Each role only sees resources within its scope (enforced server-side via `scopedFilter`).
- The sidebar is dynamically built from `/src/config/navigation.ts` — items are filtered by role + permission before rendering.
