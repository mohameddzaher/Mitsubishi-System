import Link from "next/link";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Donut } from "@/components/charts/sparkline";
import { getCustomerHealthScores, getHealthBandCounts } from "@/lib/kpi/customer-health";
import { HeartPulse, AlertCircle, CheckCircle2, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomerHealthPage() {
  const session = await requireSession();
  const ctx = {
    userId: session.user.id,
    role: session.user.role,
    branchId: session.user.branchId,
    departmentId: session.user.departmentId,
  };

  const [scores, bands] = await Promise.all([
    getCustomerHealthScores(ctx, 50),
    getHealthBandCounts(ctx),
  ]);

  const atRisk = scores.filter((s) => s.band === "red");
  const watching = scores.filter((s) => s.band === "yellow");

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/customers" className="text-[var(--color-text-muted)]">← Customers</Link></div>

      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <HeartPulse className="size-4 text-[var(--color-brand)]" /> Customer health
          </span>
        }
        description="Composite score (0-100) across payment behavior, satisfaction, complaints, and risk rating"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Healthy (green)" value={bands.green} hint="Score ≥ 75" icon={<CheckCircle2 className="size-4" />} accent="success" />
        <KpiCard label="Watching (yellow)" value={bands.yellow} hint="Score 50-74" icon={<Activity className="size-4" />} accent="warning" />
        <KpiCard label="At risk (red)" value={bands.red} hint="Score < 50" icon={<AlertCircle className="size-4" />} accent="danger" />
        <KpiCard label="Total active" value={bands.total} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Band distribution</CardTitle>
            <CardDescription>Of all active customers</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Donut
              data={[
                { label: "Healthy", value: bands.green, color: "var(--color-success)" },
                { label: "Watching", value: bands.yellow, color: "var(--color-warning)" },
                { label: "At risk", value: bands.red, color: "var(--color-danger)" },
              ]}
              size={160}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>How the score is calculated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Factor label="Payment behavior" max={40} description="Fewer overdue invoices → higher score" color="var(--color-info)" />
            <Factor label="Service satisfaction" max={30} description="Average customer rating from visits" color="var(--color-accent-gold)" />
            <Factor label="Complaint volume" max={20} description="Fewer open disputes → higher score" color="var(--color-chart-5)" />
            <Factor label="Risk rating" max={10} description="Credit risk: A=10, B=7, C=4, D=1" color="var(--color-chart-2)" />
          </CardContent>
        </Card>
      </div>

      {atRisk.length > 0 && (
        <Card className="border-[var(--color-danger)]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--color-danger)]">
              <AlertCircle className="size-4" /> At-risk customers ({atRisk.length})
            </CardTitle>
            <CardDescription>Prioritize these for customer success intervention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {atRisk.map((s) => (
                <HealthCard key={s.customerId} score={s} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {watching.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-[var(--color-warning)]" /> Watching ({watching.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {watching.slice(0, 20).map((s) => (
                <HealthCard key={s.customerId} score={s} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Factor({ label, max, description, color }: { label: string; max: number; description: string; color: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-2 last:border-0 last:pb-0">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-[10px] text-[var(--color-text-muted)]">{description}</div>
      </div>
      <div className="flex items-center gap-1">
        <span className="size-2 rounded-sm" style={{ background: color }} />
        <span className="font-mono text-[10px] text-[var(--color-text-muted)]">max {max}</span>
      </div>
    </div>
  );
}

function HealthCard({ score }: { score: Awaited<ReturnType<typeof getCustomerHealthScores>>[number] }) {
  return (
    <Link href={`/customers/${score.customerId}`} className="block">
      <Card className="transition-colors hover:border-[var(--color-border-default)]">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{score.commercialName}</span>
                <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{score.code}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {score.signals.map((s, i) => (
                  <Badge key={i} variant={score.band === "red" ? "danger" : score.band === "yellow" ? "warning" : "outline"}>
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end">
              <div
                className={cn(
                  "rounded-md border px-3 py-1.5 font-mono text-lg font-bold",
                  score.band === "green" && "border-[var(--color-success)]/40 bg-[rgba(16,185,129,0.1)] text-[var(--color-success)]",
                  score.band === "yellow" && "border-[var(--color-warning)]/40 bg-[rgba(245,158,11,0.1)] text-[var(--color-warning)]",
                  score.band === "red" && "border-[var(--color-danger)]/40 bg-[rgba(239,68,68,0.1)] text-[var(--color-danger)]",
                )}
              >
                {score.score}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[9px] text-[var(--color-text-muted)]">
                <span>P:{score.factors.paymentBehavior}</span>
                <span>·</span>
                <span>S:{score.factors.serviceSatisfaction}</span>
                <span>·</span>
                <span>C:{score.factors.complaintVolume}</span>
                <span>·</span>
                <span>R:{score.factors.riskRating}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
