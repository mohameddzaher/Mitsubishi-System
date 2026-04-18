import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { User, WorkOrder, Task, Dispute, Customer, Invoice } from "@/models";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { KpiCard } from "@/components/kpi-card";
import { SimpleTable } from "@/components/data-table/simple-table";
import { HorizontalBar, BarChart } from "@/components/charts/sparkline";
import { ROLE_LABELS, isExecutive, isTechnician, SALES_ROLES, COLLECTION_ROLES, UserRole } from "@/config/roles";
import { initials, formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { WorkOrderStatusBadge } from "@/components/status-badge";
import type { WorkOrderStatus } from "@/config/constants";
import {
  User as UserIcon,
  Phone,
  Mail,
  Shield,
  Calendar,
  Star,
  Wrench,
  CheckSquare,
  TrendingUp,
  Clock,
  Gauge,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  await connectDB();

  let user;
  try {
    user = await User.findById(id).populate("departmentId", "name").lean();
  } catch {
    notFound();
  }
  if (!user) notFound();

  const role = user.role as UserRole;
  const isTech = isTechnician(role);
  const isSales = SALES_ROLES.includes(role);
  const isCollection = COLLECTION_ROLES.includes(role);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [
    tasksAssigned,
    completedVisits30d,
    disputesOwned,
    recentVisits,
    ratingBreakdown,
    durationStats,
    onTimeCount,
    visitsByType,
    todayVisits,
    visits7dAgg,
    topCustomers,
    managedCustomers,
    invoicesCollected,
  ] = await Promise.all([
    Task.countDocuments({ assigneeIds: user._id, status: { $nin: ["done", "cancelled"] }, deletedAt: null }),
    isTech
      ? WorkOrder.countDocuments({ technicianId: user._id, status: "completed", scheduledDate: { $gte: thirtyDaysAgo }, deletedAt: null })
      : Promise.resolve(0),
    Dispute.countDocuments({ currentAssigneeId: user._id, status: { $in: ["open", "investigating", "escalated"] }, deletedAt: null }),
    isTech
      ? WorkOrder.find({ technicianId: user._id, deletedAt: null })
          .sort({ scheduledDate: -1 })
          .limit(20)
          .populate("customerId", "commercialName")
          .populate("unitId", "code model")
          .lean()
      : Promise.resolve([]),
    isTech
      ? WorkOrder.aggregate([
          { $match: { technicianId: user._id, "customerFeedback.rating": { $exists: true } } },
          { $group: { _id: "$customerFeedback.rating", count: { $sum: 1 } } },
          { $sort: { _id: -1 } },
        ])
      : Promise.resolve([]),
    isTech
      ? WorkOrder.aggregate([
          { $match: { technicianId: user._id, status: "completed", actualDurationMinutes: { $gt: 0 } } },
          {
            $group: {
              _id: null,
              avgActual: { $avg: "$actualDurationMinutes" },
              avgExpected: { $avg: "$expectedDurationMinutes" },
              avgVariance: { $avg: "$durationVarianceMinutes" },
              totalVisits: { $sum: 1 },
            },
          },
        ])
      : Promise.resolve([]),
    isTech
      ? WorkOrder.countDocuments({
          technicianId: user._id,
          status: "completed",
          durationVarianceMinutes: { $lte: 10 },
          scheduledDate: { $gte: thirtyDaysAgo },
        })
      : Promise.resolve(0),
    isTech
      ? WorkOrder.aggregate([
          { $match: { technicianId: user._id, scheduledDate: { $gte: thirtyDaysAgo } } },
          { $group: { _id: "$type", count: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
    isTech
      ? WorkOrder.find({ technicianId: user._id, scheduledDate: { $gte: todayStart, $lt: todayEnd }, deletedAt: null })
          .sort({ scheduledTime: 1 })
          .populate("customerId", "commercialName")
          .lean()
      : Promise.resolve([]),
    isTech
      ? WorkOrder.aggregate([
          { $match: { technicianId: user._id, scheduledDate: { $gte: sevenDaysAgo }, deletedAt: null } },
          {
            $group: {
              _id: { d: { $dayOfMonth: "$scheduledDate" }, m: { $month: "$scheduledDate" }, y: { $year: "$scheduledDate" } },
              total: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            },
          },
          { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
        ])
      : Promise.resolve([]),
    isTech
      ? WorkOrder.aggregate([
          { $match: { technicianId: user._id, status: "completed" } },
          { $group: { _id: "$customerId", visits: { $sum: 1 }, avgRating: { $avg: "$customerFeedback.rating" } } },
          { $sort: { visits: -1 } },
          { $limit: 5 },
          { $lookup: { from: "customers", localField: "_id", foreignField: "_id", as: "c" } },
          { $unwind: "$c" },
          { $project: { _id: 1, commercialName: "$c.commercialName", code: "$c.code", visits: 1, avgRating: 1 } },
        ])
      : Promise.resolve([]),
    isSales ? Customer.countDocuments({ assignedSalesRepId: user._id, deletedAt: null }) : Promise.resolve(0),
    isCollection
      ? Invoice.aggregate([
          { $match: { assignedCollectionOfficerId: user._id, status: "paid", paidAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: null, total: { $sum: "$total" } } },
        ])
      : Promise.resolve([]),
  ]);

  const dept = user.departmentId as unknown as { name?: string } | null;
  const dur = durationStats[0] as { avgActual: number; avgExpected: number; avgVariance: number; totalVisits: number } | undefined;
  const totalRatings = ratingBreakdown.reduce((a: number, r: { count: number }) => a + r.count, 0);
  const avgRating =
    totalRatings > 0
      ? ratingBreakdown.reduce((a: number, r: { _id: number; count: number }) => a + r._id * r.count, 0) / totalRatings
      : 0;
  const onTimeRate = completedVisits30d > 0 ? (onTimeCount / completedVisits30d) * 100 : 0;

  const days: Array<{ label: string; value: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const match = (visits7dAgg as Array<{ _id: { d: number; m: number; y: number }; total: number }>).find(
      (r) => r._id.d === d.getDate() && r._id.m === d.getMonth() + 1 && r._id.y === d.getFullYear(),
    );
    days.push({
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      value: match?.total ?? 0,
    });
  }

  let rank: number | null = null;
  if (isTech) {
    const allTechs = await WorkOrder.aggregate([
      { $match: { status: "completed", scheduledDate: { $gte: thirtyDaysAgo } } },
      { $group: { _id: "$technicianId", visits: { $sum: 1 } } },
      { $sort: { visits: -1 } },
    ]);
    const idx = allTechs.findIndex((r: { _id: unknown }) => String(r._id) === String(user._id));
    rank = idx >= 0 ? idx + 1 : null;
  }

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/settings/users" className="text-[var(--color-text-muted)]">← Team</Link></div>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback className={isExecutive(role) ? "bg-[var(--color-accent-gold-muted)] text-[var(--color-accent-gold)]" : "bg-[var(--color-brand-muted)] text-[var(--color-brand)]"}>
                {initials(`${user.firstName} ${user.lastName}`)}
              </AvatarFallback>
            </Avatar>
            <span>
              <div>{user.firstName} {user.lastName}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs font-normal text-[var(--color-text-muted)]">
                <Badge variant={isExecutive(role) ? "gold" : "outline"}>{ROLE_LABELS[role]}</Badge>
                {dept && <span>{dept.name}</span>}
                <Badge variant={user.status === "active" ? "success" : "warning"}>{user.status}</Badge>
                {rank && <Badge variant="primary">Rank #{rank}</Badge>}
              </div>
            </span>
          </span>
        }
      />

      {isTech && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Visits 30d"
              value={completedVisits30d}
              icon={<Wrench className="size-4" />}
              accent="success"
              href="/service/work-orders"
            />
            <KpiCard
              label="On-time arrival"
              value={completedVisits30d === 0 ? "—" : `${onTimeRate.toFixed(1)}%`}
              hint={`Target: 95% · ${onTimeCount} on-time`}
              icon={<Clock className="size-4" />}
              accent={onTimeRate >= 95 ? "success" : onTimeRate >= 80 ? "warning" : "danger"}
            />
            <KpiCard
              label="Avg rating"
              value={avgRating ? `${avgRating.toFixed(2)} ★` : "—"}
              hint={`${totalRatings} ratings`}
              icon={<Star className="size-4" />}
              accent={avgRating >= 4.5 ? "gold" : avgRating >= 4 ? "success" : "warning"}
            />
            <KpiCard
              label="Duration variance"
              value={dur ? `${dur.avgVariance > 0 ? "+" : ""}${dur.avgVariance.toFixed(0)} min` : "—"}
              hint={dur ? `avg ${dur.avgActual.toFixed(0)}min vs ${dur.avgExpected.toFixed(0)}min expected` : ""}
              icon={<Gauge className="size-4" />}
              accent={dur ? (Math.abs(dur.avgVariance) <= 10 ? "success" : Math.abs(dur.avgVariance) <= 20 ? "warning" : "danger") : "default"}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Today's visits" value={todayVisits.length} icon={<Calendar className="size-4" />} accent="info" />
            <KpiCard
              label="Total completed (all-time)"
              value={dur?.totalVisits ?? 0}
              hint="Career completed visits"
              icon={<Wrench className="size-4" />}
            />
            <KpiCard label="Open tasks" value={tasksAssigned} icon={<CheckSquare className="size-4" />} accent={tasksAssigned > 10 ? "warning" : "info"} />
            <KpiCard label="Open disputes" value={disputesOwned} icon={<AlertTriangle className="size-4" />} accent={disputesOwned > 0 ? "warning" : "default"} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-[var(--color-brand)]" /> Daily visits · last 7 days
                </CardTitle>
                <CardDescription>Workload distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart data={days} height={140} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rating distribution</CardTitle>
                <CardDescription>Customer feedback all-time</CardDescription>
              </CardHeader>
              <CardContent>
                {totalRatings === 0 ? (
                  <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-4 text-center text-[10px] text-[var(--color-text-muted)]">
                    No ratings yet
                  </div>
                ) : (
                  <HorizontalBar
                    data={[5, 4, 3, 2, 1].map((star) => ({
                      label: `${star}★`,
                      value: ratingBreakdown.find((r: { _id: number }) => r._id === star)?.count ?? 0,
                      accent: star >= 4 ? "var(--color-success)" : star === 3 ? "var(--color-warning)" : "var(--color-danger)",
                    }))}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Visit type mix · last 30 days</CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBar
                  data={(visitsByType as Array<{ _id: string; count: number }>).map((v) => ({
                    label: v._id.replace("_", " "),
                    value: v.count,
                    accent: v._id === "emergency" ? "var(--color-danger)" : v._id === "corrective" ? "var(--color-warning)" : "var(--color-brand)",
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top customers served (career)</CardTitle>
                <CardDescription>All-time completed visits — explains the {dur?.totalVisits ?? 0} lifetime total above</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SimpleTable
                  data={topCustomers}
                  getKey={(row) => String((row as { _id: unknown })._id)}
                  rowHref={(row) => `/customers/${String((row as { _id: unknown })._id)}`}
                  columns={[
                    { key: "name", header: "Customer", accessor: (r) => <span className="text-xs font-medium">{(r as { commercialName: string }).commercialName}</span> },
                    { key: "visits", header: "Visits", align: "right", accessor: (r) => <span className="font-mono text-xs">{(r as { visits: number }).visits}</span> },
                    {
                      key: "rating",
                      header: "Rating",
                      accessor: (r) => {
                        const v = (r as { avgRating: number | null }).avgRating;
                        return v ? <span className="text-[var(--color-accent-gold)]">{v.toFixed(1)}★</span> : <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                      },
                    },
                  ]}
                  emptyTitle="No completed visits"
                />
              </CardContent>
            </Card>
          </div>

          {todayVisits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s schedule</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <SimpleTable
                  data={todayVisits}
                  getKey={(row) => String((row as { _id: unknown })._id)}
                  rowHref={(row) => `/service/work-orders/${String((row as { _id: unknown })._id)}`}
                  columns={[
                    { key: "time", header: "Time", accessor: (r) => <span className="font-mono text-xs">{(r as { scheduledTime: string }).scheduledTime}</span> },
                    {
                      key: "customer",
                      header: "Customer",
                      accessor: (r) => {
                        const c = (r as { customerId: { commercialName?: string } | null }).customerId;
                        return <span className="text-xs">{c?.commercialName ?? "—"}</span>;
                      },
                    },
                    { key: "type", header: "Type", accessor: (r) => <Badge variant="outline">{String((r as { type: string }).type).replace("_", " ")}</Badge> },
                    { key: "status", header: "Status", accessor: (r) => <WorkOrderStatusBadge status={(r as { status: WorkOrderStatus }).status} /> },
                  ]}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent visits</CardTitle>
              <CardDescription>Last 20 visits · click to open</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <SimpleTable
                data={recentVisits}
                getKey={(row) => String((row as { _id: unknown })._id)}
                rowHref={(row) => `/service/work-orders/${String((row as { _id: unknown })._id)}`}
                columns={[
                  { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
                  { key: "date", header: "Date", accessor: (r) => <span className="text-[11px]">{formatDate((r as { scheduledDate: Date }).scheduledDate)}</span> },
                  {
                    key: "customer",
                    header: "Customer",
                    accessor: (r) => {
                      const c = (r as { customerId: { commercialName?: string } | null }).customerId;
                      return <span className="text-xs">{c?.commercialName ?? "—"}</span>;
                    },
                  },
                  { key: "type", header: "Type", accessor: (r) => <Badge variant="outline">{String((r as { type: string }).type).replace("_", " ")}</Badge> },
                  { key: "status", header: "Status", accessor: (r) => <WorkOrderStatusBadge status={(r as { status: WorkOrderStatus }).status} /> },
                  {
                    key: "var",
                    header: "Δ min",
                    align: "right",
                    accessor: (r) => {
                      const v = (r as { durationVarianceMinutes?: number }).durationVarianceMinutes;
                      if (v == null) return <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                      return (
                        <span className={`font-mono text-[11px] ${Math.abs(v) <= 10 ? "text-[var(--color-success)]" : Math.abs(v) <= 20 ? "text-[var(--color-warning)]" : "text-[var(--color-danger)]"}`}>
                          {v > 0 ? "+" : ""}{v}
                        </span>
                      );
                    },
                  },
                  {
                    key: "rating",
                    header: "Rating",
                    accessor: (r) => {
                      const fb = (r as { customerFeedback?: { rating?: number } | null }).customerFeedback;
                      return fb?.rating ? (
                        <span className="text-[var(--color-accent-gold)]">{"★".repeat(fb.rating)}</span>
                      ) : (
                        <span className="text-[11px] text-[var(--color-text-muted)]">—</span>
                      );
                    },
                  },
                ]}
                emptyTitle="No visits yet"
              />
            </CardContent>
          </Card>
        </>
      )}

      {!isTech && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Open tasks" value={tasksAssigned} icon={<CheckSquare className="size-4" />} accent={tasksAssigned > 10 ? "warning" : "info"} />
          {isSales && <KpiCard label="Customers owned" value={managedCustomers} icon={<UserIcon className="size-4" />} accent="info" />}
          {isCollection && <KpiCard label="Collected 30d" value={formatCurrency((invoicesCollected[0] as { total?: number } | undefined)?.total ?? 0)} accent="success" />}
          <KpiCard label="Open disputes" value={disputesOwned} accent={disputesOwned > 0 ? "warning" : "default"} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center gap-2"><Mail className="size-3" /> {user.email}</div>
            {user.phone && <div className="flex items-center gap-2"><Phone className="size-3" /> {user.phone}</div>}
            <div className="flex items-center gap-2"><Shield className="size-3" /> Employee ID: <span className="font-mono">{user.employeeId}</span></div>
            {user.lastLoginAt && <div className="flex items-center gap-2"><Calendar className="size-3" /> Last login: {formatDateTime(user.lastLoginAt)}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Role & scope</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>Role: <Link href={`/settings/roles/${role}`} className="text-[var(--color-brand)] hover:underline">{ROLE_LABELS[role]}</Link></div>
            <div>Department: {dept?.name ?? "—"}</div>
            <div>Status: {user.status}</div>
            <div>Language: {user.preferences?.language ?? "en"}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
