import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, TrendingUp, Receipt, Wrench, Users, Coins, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

const REPORTS = [
  { title: "Sales performance", description: "Pipeline, win rate, forecast accuracy, quota attainment", icon: TrendingUp, href: "/reports/sales" },
  { title: "Service operations", description: "Visit completion, on-time rate, FTFR, technician KPIs", icon: Wrench, href: "/reports/service" },
  { title: "AR & collection", description: "DSO, aging, collection rate, PTP adherence", icon: Coins, href: "/reports/collection" },
  { title: "Financial", description: "Revenue by contract type, margins, VAT summary (ZATCA-ready)", icon: Receipt, href: "/reports/finance" },
  { title: "Customer health", description: "Churn risk, NPS/CSAT trends, complaint Pareto", icon: Users, href: "/reports/customers" },
  { title: "Executive briefing", description: "One-click board-ready PDF summary of all KPIs", icon: FileText, href: "/reports/executive" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Scheduled and ad-hoc reports with PDF/Excel export" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.href} href={r.href}>
              <Card className="h-full transition-colors hover:border-[var(--color-border-default)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="size-4 text-[var(--color-brand)]" />
                    {r.title}
                  </CardTitle>
                  <CardDescription>{r.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                    Open report →
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
