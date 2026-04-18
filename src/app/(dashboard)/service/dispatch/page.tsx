import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { User, WorkOrder, SparePartRequest } from "@/models";
import { scopedFilter } from "@/server/filters";
import { UserRole } from "@/config/roles";
import { KpiCard } from "@/components/kpi-card";
import { SimpleTable } from "@/components/data-table/simple-table";
import { WorkOrderStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { HorizontalBar } from "@/components/charts/sparkline";
import { Radio, Zap, Clock, Users, Siren, CheckCircle2, TrendingUp, AlertTriangle, Star, Gauge } from "lucide-react";
import type { WorkOrderStatus } from "@/config/constants";
import { TechMap } from "@/components/charts/tech-map";
import { MAKKAH_DISTRICTS } from "@/config/constants";
import Link from "next/link";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

type TechStatus = "emergency" | "in_visit" | "idle" | "off_duty" | "all_done";

export default async function DispatchPage() {
  const session = await requireSession();
  await connectDB();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [techs, todayVisits, activeEmergencies, pendingApprovals, sevenDayAgg, thirtyDayAgg, inProgressAll] = await Promise.all([
    User.find({
      role: {
        $in: [UserRole.SERVICE_TECHNICIAN, UserRole.SENIOR_TECHNICIAN, UserRole.INSTALLATION_TECHNICIAN, UserRole.APPRENTICE_TECHNICIAN],
      },
      status: "active",
      deletedAt: null,
    })
      .sort({ firstName: 1 })
      .lean(),
    WorkOrder.find(
      scopedFilter(session, { scheduledDate: { $gte: todayStart, $lt: todayEnd }, deletedAt: null }),
    )
      .populate("customerId", "commercialName")
      .populate("unitId", "code")
      .populate("technicianId", "firstName lastName")
      .sort({ scheduledTime: 1 })
      .lean(),
    // ALL active emergencies (any day, any status indicating still open)
    WorkOrder.find(
      scopedFilter(session, {
        type: "emergency",
        status: { $in: ["scheduled", "assigned", "in_progress"] },
        deletedAt: null,
      }),
    )
      .populate("customerId", "commercialName")
      .populate("technicianId", "firstName lastName")
      .sort({ scheduledDate: -1 })
      .lean(),
    SparePartRequest.countDocuments(
      scopedFilter(session, { status: "pending_manager_approval", deletedAt: null }),
    ),
    // 7-day per-tech performance
    WorkOrder.aggregate([
      {
        $match: {
          ...scopedFilter(session, { scheduledDate: { $gte: sevenDaysAgo }, deletedAt: null }),
        },
      },
      {
        $group: {
          _id: "$technicianId",
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        },
      },
    ]),
    // 30-day KPIs per tech
    WorkOrder.aggregate([
      {
        $match: {
          ...scopedFilter(session, { status: "completed", scheduledDate: { $gte: thirtyDaysAgo }, deletedAt: null }),
        },
      },
      {
        $group: {
          _id: "$technicianId",
          visits: { $sum: 1 },
          avgRating: { $avg: "$customerFeedback.rating" },
          avgVariance: { $avg: "$durationVarianceMinutes" },
          onTime: { $sum: { $cond: [{ $lte: ["$durationVarianceMinutes", 10] }, 1, 0] } },
          totalMinutes: { $sum: "$actualDurationMinutes" },
        },
      },
    ]),
    // ALL in-progress work orders (not just today) — the real "working now" dataset
    WorkOrder.find(
      scopedFilter(session, { status: "in_progress", deletedAt: null }),
    )
      .populate("customerId", "commercialName")
      .populate("technicianId", "firstName lastName")
      .lean(),
  ]);

  // ===== Build per-tech state (single source of truth) =====
  const byTechToday = new Map<string, typeof todayVisits>();
  for (const v of todayVisits) {
    const key = String((v.technicianId as unknown as { _id?: mongoose.Types.ObjectId } | null)?._id ?? v.technicianId);
    const list = byTechToday.get(key) ?? [];
    list.push(v);
    byTechToday.set(key, list);
  }

  const activeEmergencyByTech = new Map<string, typeof activeEmergencies[number]>();
  for (const e of activeEmergencies) {
    const id = e.technicianId
      ? String((e.technicianId as unknown as { _id?: mongoose.Types.ObjectId })._id ?? e.technicianId)
      : null;
    if (id && !activeEmergencyByTech.has(id)) activeEmergencyByTech.set(id, e);
  }

  const inProgressByTech = new Map<string, typeof inProgressAll[number]>();
  for (const v of inProgressAll) {
    const id = v.technicianId
      ? String((v.technicianId as unknown as { _id?: mongoose.Types.ObjectId })._id ?? v.technicianId)
      : null;
    if (id && !inProgressByTech.has(id)) inProgressByTech.set(id, v);
  }

  const sevenDayMap = new Map<string, { total: number; completed: number }>(
    sevenDayAgg.map((a) => [String(a._id), { total: a.total, completed: a.completed }]),
  );

  const perfMap = new Map<string, { visits: number; avgRating: number | null; avgVariance: number; onTime: number; totalMinutes: number }>(
    thirtyDayAgg.map((a) => [
      String(a._id),
      { visits: a.visits, avgRating: a.avgRating, avgVariance: a.avgVariance, onTime: a.onTime, totalMinutes: a.totalMinutes ?? 0 },
    ]),
  );

  // Determine status per tech — consistent for BOTH cards and map
  type TechState = {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string | null | undefined;
    role: string;
    status: TechStatus;
    todayVisits: typeof todayVisits;
    todayCompleted: number;
    todayRemaining: number;
    activeVisit: typeof inProgressAll[number] | null;
    emergency: typeof activeEmergencies[number] | null;
    sevenDay: { total: number; completed: number };
    thirtyDay: { visits: number; avgRating: number | null | undefined; avgVariance: number | null | undefined; onTime: number; totalMinutes: number } | null;
  };

  const techStates: TechState[] = techs.map((t) => {
    const id = String(t._id);
    const visits = byTechToday.get(id) ?? [];
    const activeVisit = inProgressByTech.get(id) ?? null;
    const emergency = activeEmergencyByTech.get(id) ?? null;
    const todayCompleted = visits.filter((v) => v.status === "completed").length;

    let status: TechStatus;
    if (emergency) status = "emergency";
    else if (activeVisit) status = "in_visit";
    else if (visits.length === 0) status = "off_duty";
    else if (todayCompleted === visits.length) status = "all_done";
    else status = "idle";

    return {
      id,
      firstName: t.firstName,
      lastName: t.lastName,
      employeeId: t.employeeId,
      role: t.role,
      status,
      todayVisits: visits,
      todayCompleted,
      todayRemaining: visits.length - todayCompleted,
      activeVisit,
      emergency,
      sevenDay: sevenDayMap.get(id) ?? { total: 0, completed: 0 },
      thirtyDay: perfMap.get(id) ?? null,
    };
  });

  // Counts — single source of truth
  const inEmergency = techStates.filter((s) => s.status === "emergency").length;
  const inVisit = techStates.filter((s) => s.status === "in_visit").length;
  const allDone = techStates.filter((s) => s.status === "all_done").length;
  const idle = techStates.filter((s) => s.status === "idle").length;
  const offDuty = techStates.filter((s) => s.status === "off_duty").length;
  const workingNow = inEmergency + inVisit;

  const completedToday = todayVisits.filter((v) => v.status === "completed").length;
  const scheduledToday = todayVisits.length;

  // ===== Build map points (same status logic) =====
  const mapPoints = techStates.map((s, i) => {
    let lat: number | undefined;
    let lng: number | undefined;
    const techDoc = techs.find((t) => String(t._id) === s.id);
    if (techDoc?.currentLocation?.lat && techDoc.currentLocation.lng) {
      lat = techDoc.currentLocation.lat;
      lng = techDoc.currentLocation.lng;
    } else if (s.activeVisit?.startLocation?.lat) {
      lat = s.activeVisit.startLocation.lat ?? undefined;
      lng = s.activeVisit.startLocation.lng ?? undefined;
    } else if (s.emergency?.startLocation?.lat) {
      lat = s.emergency.startLocation.lat ?? undefined;
      lng = s.emergency.startLocation.lng ?? undefined;
    }
    if (!lat || !lng) {
      const district = MAKKAH_DISTRICTS[i % MAKKAH_DISTRICTS.length]!;
      lat = district.lat + (Math.random() - 0.5) * 0.01;
      lng = district.lng + (Math.random() - 0.5) * 0.01;
    }

    const sub =
      s.status === "emergency"
        ? `🚨 Emergency · ${((s.emergency?.customerId as unknown as { commercialName?: string } | null)?.commercialName) ?? ""}`
        : s.status === "in_visit"
          ? `In visit · ${((s.activeVisit?.customerId as unknown as { commercialName?: string } | null)?.commercialName) ?? ""}`
          : s.status === "all_done"
            ? `All ${s.todayVisits.length} visits done today`
            : s.status === "idle"
              ? `${s.todayCompleted}/${s.todayVisits.length} done · ${s.todayRemaining} remaining`
              : `No visits today`;

    return {
      id: s.id,
      lat,
      lng,
      label: `${s.firstName} ${s.lastName}`,
      sub,
      status: (s.status === "all_done" ? "idle" : s.status) as "emergency" | "in_visit" | "idle" | "off_duty",
      href: `/team/${s.id}`,
    };
  });

  // ===== Field team performance aggregate =====
  const fieldTeamVisits30 = thirtyDayAgg.reduce((a, r) => a + r.visits, 0);
  const fieldTeamOnTime = thirtyDayAgg.reduce((a, r) => a + r.onTime, 0);
  const fieldTeamOnTimeRate = fieldTeamVisits30 > 0 ? (fieldTeamOnTime / fieldTeamVisits30) * 100 : 0;
  const allRatings = thirtyDayAgg.filter((r) => r.avgRating != null);
  const fieldTeamAvgRating = allRatings.length > 0
    ? allRatings.reduce((a, r) => a + (r.avgRating ?? 0) * r.visits, 0) / allRatings.reduce((a, r) => a + r.visits, 0)
    : 0;
  const totalMinutes = thirtyDayAgg.reduce((a, r) => a + (r.totalMinutes ?? 0), 0);
  const fieldTeamHours = Math.round(totalMinutes / 60);

  // Sort for leaderboard
  const leaderboard = [...techStates]
    .filter((s) => s.thirtyDay && s.thirtyDay.visits > 0)
    .sort((a, b) => (b.thirtyDay!.visits - a.thirtyDay!.visits));

  const atRisk = [...techStates]
    .filter((s) => {
      if (!s.thirtyDay) return false;
      const onTimeRate = s.thirtyDay.visits > 0 ? (s.thirtyDay.onTime / s.thirtyDay.visits) * 100 : 100;
      const variance = s.thirtyDay.avgVariance ?? 0;
      const rating = s.thirtyDay.avgRating ?? 5;
      return onTimeRate < 80 || Math.abs(variance) > 20 || rating < 3.8;
    })
    .slice(0, 6) as Array<TechState & { thirtyDay: NonNullable<TechState["thirtyDay"]> }>;

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Radio className="size-4 text-[var(--color-brand)]" /> Dispatch command
            <span className="flex items-center gap-1 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-2 py-0.5 text-[10px] font-normal">
              <span className="size-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
              Live
            </span>
          </span>
        }
        description={`${techs.length} field technicians · ${scheduledToday} visits scheduled today · ${fieldTeamVisits30} visits completed last 30 days`}
      />

      {/* Primary KPI strip — live status */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Working now"
          value={workingNow}
          hint={`${inVisit} in visit · ${inEmergency} emergency`}
          icon={<Zap className="size-4" />}
          accent={workingNow > 0 ? "warning" : "default"}
          href={workingNow > 0 ? "/service/work-orders?status=in_progress" : undefined}
        />
        <KpiCard
          label="Completed today"
          value={`${completedToday} / ${scheduledToday}`}
          hint="Of today's scheduled visits"
          icon={<CheckCircle2 className="size-4" />}
          accent="success"
          href="/service/work-orders"
        />
        <KpiCard
          label="Idle / off duty"
          value={`${idle + allDone} / ${offDuty}`}
          hint={`${allDone} finished today · ${idle} between visits · ${offDuty} no schedule`}
          icon={<Users className="size-4" />}
          accent="info"
        />
        <KpiCard
          label="Active emergencies"
          value={activeEmergencies.length}
          hint={inEmergency > 0 ? `${inEmergency} tech${inEmergency === 1 ? "" : "s"} responding` : "None active"}
          icon={<Siren className="size-4" />}
          accent={activeEmergencies.length > 0 ? "danger" : "default"}
          href={activeEmergencies.length > 0 ? "/service/emergency" : undefined}
        />
      </div>

      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="size-4 text-[var(--color-brand)] animate-pulse" /> Live technician map
          </CardTitle>
          <CardDescription>
            {workingNow > 0
              ? `${workingNow} technician${workingNow === 1 ? "" : "s"} currently on site · hover pins for detail · click opens profile`
              : "All technicians currently idle — hover pins for schedule · click opens profile"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TechMap points={mapPoints} />
        </CardContent>
      </Card>

      {/* Active emergencies panel */}
      {activeEmergencies.length > 0 && (
        <Card className="border-[var(--color-danger)]/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--color-danger)]">
              <Siren className="size-4" /> Active emergencies ({activeEmergencies.length})
            </CardTitle>
            <CardDescription>SLA: 60 min response · click to open work order</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeEmergencies.map((e) => {
                const c = e.customerId as unknown as { commercialName?: string } | null;
                const t = e.technicianId as unknown as { firstName?: string; lastName?: string } | null;
                const minutesSinceReport = Math.floor((Date.now() - new Date(e.scheduledDate).getTime()) / 60_000);
                const slaBreached = minutesSinceReport > 60;
                return (
                  <Link
                    key={String(e._id)}
                    href={`/service/work-orders/${String(e._id)}`}
                    className="flex items-center justify-between rounded-md border border-[var(--color-border-subtle)] bg-[rgba(239,68,68,0.05)] p-3 text-xs transition-colors hover:bg-[rgba(239,68,68,0.1)]"
                  >
                    <div>
                      <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{e.code}</div>
                      <div className="font-medium">{c?.commercialName}</div>
                      <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                        Reported {minutesSinceReport} min ago {slaBreached && <Badge variant="danger">SLA breached</Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div>{t ? `${t.firstName} ${t.lastName}` : "Unassigned"}</div>
                      <WorkOrderStatusBadge status={e.status as WorkOrderStatus} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Field team performance — 30 days */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="size-4 text-[var(--color-brand)]" /> Field team performance · last 30 days
          </CardTitle>
          <CardDescription>Aggregate KPIs across all {techs.length} technicians</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TeamStat label="Total visits completed" value={fieldTeamVisits30} icon="📊" />
            <TeamStat
              label="On-time arrival rate"
              value={`${fieldTeamOnTimeRate.toFixed(1)}%`}
              status={fieldTeamOnTimeRate >= 95 ? "good" : fieldTeamOnTimeRate >= 80 ? "ok" : "bad"}
              target="≥95%"
              icon="⏱"
            />
            <TeamStat
              label="Avg customer rating"
              value={fieldTeamAvgRating ? `${fieldTeamAvgRating.toFixed(2)} ★` : "—"}
              status={fieldTeamAvgRating >= 4.5 ? "good" : fieldTeamAvgRating >= 4 ? "ok" : "bad"}
              target="≥4.5★"
              icon="⭐"
            />
            <TeamStat
              label="Field hours logged"
              value={`${fieldTeamHours.toLocaleString()}h`}
              hint={`${Math.round(totalMinutes)} min total`}
              icon="🕒"
            />
          </div>
        </CardContent>
      </Card>

      {/* Top technicians + At-risk side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-[var(--color-success)]" /> Top technicians · 30 days
            </CardTitle>
            <CardDescription>Ranked by visits completed</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBar
              data={leaderboard.slice(0, 8).map((s) => ({
                label: `${s.firstName} ${s.lastName}`,
                value: s.thirtyDay!.visits,
                accent:
                  (s.thirtyDay!.avgRating ?? 5) >= 4.5
                    ? "var(--color-success)"
                    : (s.thirtyDay!.avgRating ?? 5) >= 4
                      ? "var(--color-info)"
                      : "var(--color-warning)",
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[var(--color-warning)]" /> Technicians needing attention
            </CardTitle>
            <CardDescription>Flagged by on-time &lt;80%, variance &gt;20min, or rating &lt;3.8★</CardDescription>
          </CardHeader>
          <CardContent>
            {atRisk.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-4 text-center text-xs text-[var(--color-text-muted)]">
                All technicians performing within targets. ✓
              </div>
            ) : (
              <div className="space-y-2">
                {atRisk.map((s) => {
                  const onTimeRate = s.thirtyDay!.visits > 0 ? (s.thirtyDay!.onTime / s.thirtyDay!.visits) * 100 : 100;
                  const variance = s.thirtyDay!.avgVariance ?? 0;
                  const rating = s.thirtyDay!.avgRating ?? 5;
                  const signals: string[] = [];
                  if (onTimeRate < 80) signals.push(`On-time ${onTimeRate.toFixed(0)}%`);
                  if (Math.abs(variance) > 20) signals.push(`Δ ${variance.toFixed(0)}min`);
                  if (rating < 3.8) signals.push(`${rating.toFixed(1)}★`);
                  return (
                    <Link
                      key={s.id}
                      href={`/team/${s.id}`}
                      className="flex items-center justify-between rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-2.5 text-xs hover:border-[var(--color-warning)]/40"
                    >
                      <div>
                        <div className="font-medium">{s.firstName} {s.lastName}</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">{s.employeeId}</div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {signals.map((sig, i) => <Badge key={i} variant="warning">{sig}</Badge>)}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deep technician scorecard — today + 30d KPIs */}
      <Card>
        <CardHeader>
          <CardTitle>Technician scorecard — live status + 30-day KPIs</CardTitle>
          <CardDescription>
            {pendingApprovals > 0 ? `${pendingApprovals} spare part approvals pending` : "No pending approvals"} · click row to open full profile
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <SimpleTable
            data={techStates}
            getKey={(row) => (row as TechState).id}
            rowHref={(row) => `/team/${(row as TechState).id}`}
            columns={[
              {
                key: "name",
                header: "Technician",
                accessor: (row) => {
                  const s = row as TechState;
                  return (
                    <div>
                      <div className="text-xs font-medium">{s.firstName} {s.lastName}</div>
                      <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{s.employeeId}</div>
                    </div>
                  );
                },
              },
              {
                key: "status",
                header: "Now",
                accessor: (row) => {
                  const s = row as TechState;
                  return <StatusPill status={s.status} />;
                },
              },
              {
                key: "today",
                header: "Today",
                align: "right",
                accessor: (row) => {
                  const s = row as TechState;
                  if (s.todayVisits.length === 0) return <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                  return (
                    <span className="font-mono text-xs">
                      <span className="text-[var(--color-success)]">{s.todayCompleted}</span>
                      <span className="text-[var(--color-text-muted)]">/{s.todayVisits.length}</span>
                    </span>
                  );
                },
              },
              {
                key: "d7",
                header: "7-day",
                align: "right",
                accessor: (row) => {
                  const s = row as TechState;
                  if (s.sevenDay.total === 0) return <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                  return <span className="font-mono text-xs">{s.sevenDay.completed}/{s.sevenDay.total}</span>;
                },
              },
              {
                key: "d30",
                header: "30-day visits",
                align: "right",
                accessor: (row) => {
                  const s = row as TechState;
                  if (!s.thirtyDay) return <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                  return <span className="font-mono text-xs">{s.thirtyDay.visits}</span>;
                },
              },
              {
                key: "onTime",
                header: "On-time",
                align: "right",
                accessor: (row) => {
                  const s = row as TechState;
                  if (!s.thirtyDay || s.thirtyDay.visits === 0) return <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                  const pct = (s.thirtyDay.onTime / s.thirtyDay.visits) * 100;
                  return (
                    <span className={`font-mono text-xs ${pct >= 95 ? "text-[var(--color-success)]" : pct >= 80 ? "text-[var(--color-info)]" : "text-[var(--color-warning)]"}`}>
                      {pct.toFixed(0)}%
                    </span>
                  );
                },
              },
              {
                key: "variance",
                header: "Δ duration",
                align: "right",
                accessor: (row) => {
                  const s = row as TechState;
                  if (!s.thirtyDay || s.thirtyDay.visits === 0) return <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                  const v = s.thirtyDay.avgVariance ?? 0;
                  return (
                    <span className={`font-mono text-[11px] ${Math.abs(v) <= 10 ? "text-[var(--color-success)]" : Math.abs(v) <= 20 ? "text-[var(--color-warning)]" : "text-[var(--color-danger)]"}`}>
                      {v > 0 ? "+" : ""}{v.toFixed(0)}min
                    </span>
                  );
                },
              },
              {
                key: "rating",
                header: "Rating",
                accessor: (row) => {
                  const s = row as TechState;
                  const r = s.thirtyDay?.avgRating;
                  if (!r) return <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                  return (
                    <span className={`text-xs ${r >= 4.5 ? "text-[var(--color-accent-gold)]" : r >= 4 ? "text-[var(--color-text-primary)]" : "text-[var(--color-warning)]"}`}>
                      {r.toFixed(1)} ★
                    </span>
                  );
                },
              },
              {
                key: "next",
                header: "Next visit",
                accessor: (row) => {
                  const s = row as TechState;
                  const next = s.todayVisits.find((v) => v.status === "scheduled" || v.status === "assigned");
                  if (!next) return <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                  const c = next.customerId as unknown as { commercialName?: string } | null;
                  return (
                    <div className="text-[11px]">
                      <span className="font-mono">{next.scheduledTime}</span>
                      <span className="ml-1 text-[var(--color-text-muted)]">· {c?.commercialName ?? ""}</span>
                    </div>
                  );
                },
              },
            ]}
            emptyTitle="No technicians"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({ status }: { status: TechStatus }) {
  const map: Record<TechStatus, { color: string; bg: string; label: string; pulse?: boolean }> = {
    emergency: { color: "text-[var(--color-danger)]", bg: "bg-[rgba(239,68,68,0.15)]", label: "Emergency", pulse: true },
    in_visit: { color: "text-[var(--color-warning)]", bg: "bg-[rgba(245,158,11,0.15)]", label: "In visit", pulse: true },
    all_done: { color: "text-[var(--color-success)]", bg: "bg-[rgba(16,185,129,0.15)]", label: "All done" },
    idle: { color: "text-[var(--color-info)]", bg: "bg-[rgba(59,130,246,0.15)]", label: "Between visits" },
    off_duty: { color: "text-[var(--color-text-muted)]", bg: "bg-[var(--color-bg-elevated)]", label: "Off duty" },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${s.bg} ${s.color}`}>
      <span className={`size-1.5 rounded-full ${s.color.replace("text-", "bg-")} ${s.pulse ? "animate-pulse" : ""}`} />
      {s.label}
    </span>
  );
}

function TeamStat({
  label,
  value,
  hint,
  status,
  target,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  status?: "good" | "ok" | "bad";
  target?: string;
  icon?: string;
}) {
  const color =
    status === "good"
      ? "text-[var(--color-success)]"
      : status === "bad"
        ? "text-[var(--color-danger)]"
        : status === "ok"
          ? "text-[var(--color-warning)]"
          : "text-[var(--color-text-primary)]";

  return (
    <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-base">{icon}</span>}
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</div>
      </div>
      <div className={`mt-1 font-mono text-lg font-semibold ${color}`}>{value}</div>
      {hint && <div className="text-[10px] text-[var(--color-text-muted)]">{hint}</div>}
      {target && <div className="mt-0.5 text-[10px] text-[var(--color-text-disabled)]">target: {target}</div>}
    </div>
  );
}
