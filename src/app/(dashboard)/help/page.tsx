import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP } from "@/config/constants";
import { Keyboard, BookOpen, LifeBuoy, Phone, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

const SHORTCUTS = [
  { keys: ["⌘", "K"], action: "Open command palette" },
  { keys: ["/"], action: "Focus search" },
  { keys: ["Esc"], action: "Close modal or popover" },
  { keys: ["G", "D"], action: "Go to dashboard" },
  { keys: ["G", "C"], action: "Go to customers" },
  { keys: ["G", "T"], action: "Go to tasks" },
  { keys: ["N", "T"], action: "New task" },
  { keys: ["N", "C"], action: "New customer" },
  { keys: ["?"], action: "Show shortcuts" },
];

export default function HelpPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Help & shortcuts" description={`${APP.name} user guide`} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Keyboard className="size-4" /> Keyboard shortcuts</CardTitle>
            <CardDescription>Move faster. Keep hands on the keyboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {SHORTCUTS.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-secondary)]">{s.action}</span>
                <span className="flex items-center gap-1">
                  {s.keys.map((k, j) => (
                    <kbd key={j} className="rounded-sm border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-1.5 py-0.5 font-mono text-[10px]">
                      {k}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="size-4" /> Key concepts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-[var(--color-text-secondary)]">
            <div>
              <Badge variant="primary">Active Ratio</Badge>
              <p className="mt-1 text-[11px]">% of customers in Active status vs total pipeline. Target: 40%.</p>
            </div>
            <div>
              <Badge variant="primary">DSO</Badge>
              <p className="mt-1 text-[11px]">Days Sales Outstanding — how quickly we collect. Target: 45 days.</p>
            </div>
            <div>
              <Badge variant="primary">FTFR</Badge>
              <p className="mt-1 text-[11px]">First-Time Fix Rate. Problem resolved in single visit. Target: 85%.</p>
            </div>
            <div>
              <Badge variant="primary">NRR</Badge>
              <p className="mt-1 text-[11px]">Net Revenue Retention — growth from existing customers.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LifeBuoy className="size-4" /> Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center gap-2"><Phone className="size-3" /> 24/7 hotline: <a href="tel:8001282828" className="text-[var(--color-brand)]">{APP.supportPhone}</a></div>
            <div className="flex items-center gap-2"><Mail className="size-3" /> IT helpdesk: it@melsa-mkk.com</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
