import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CustomerStatus, InvoiceStatus, UnitStatus, WorkOrderStatus, Priority } from "@/config/constants";

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  const map: Record<CustomerStatus, { variant: "default" | "success" | "warning" | "info" | "danger" | "outline"; label: string }> = {
    lead: { variant: "info", label: "Lead" },
    qualified: { variant: "info", label: "Qualified" },
    quotation_sent: { variant: "warning", label: "Quotation sent" },
    negotiating: { variant: "warning", label: "Negotiating" },
    active: { variant: "success", label: "Active" },
    on_hold: { variant: "outline", label: "On hold" },
    churned: { variant: "danger", label: "Churned" },
  };
  const c = map[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, { variant: "default" | "success" | "warning" | "info" | "danger" | "outline"; label: string }> = {
    draft: { variant: "outline", label: "Draft" },
    issued: { variant: "info", label: "Issued" },
    sent: { variant: "info", label: "Sent" },
    viewed: { variant: "info", label: "Viewed" },
    partially_paid: { variant: "warning", label: "Partial" },
    paid: { variant: "success", label: "Paid" },
    overdue: { variant: "danger", label: "Overdue" },
    voided: { variant: "outline", label: "Voided" },
    written_off: { variant: "outline", label: "Written off" },
  };
  const c = map[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export function UnitStatusDot({ status }: { status: UnitStatus }) {
  const color: Record<UnitStatus, string> = {
    operational: "bg-[var(--color-success)]",
    under_maintenance: "bg-[var(--color-warning)]",
    breakdown: "bg-[var(--color-danger)]",
    decommissioned: "bg-[var(--color-text-muted)]",
    modernization: "bg-[var(--color-info)]",
  };
  const label: Record<UnitStatus, string> = {
    operational: "Operational",
    under_maintenance: "Under maintenance",
    breakdown: "Breakdown",
    decommissioned: "Decommissioned",
    modernization: "Modernization",
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={cn("size-1.5 rounded-full", color[status])} />
      <span className="text-[var(--color-text-secondary)]">{label[status]}</span>
    </span>
  );
}

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const map: Record<WorkOrderStatus, { variant: "default" | "success" | "warning" | "info" | "danger" | "outline"; label: string }> = {
    scheduled: { variant: "info", label: "Scheduled" },
    assigned: { variant: "info", label: "Assigned" },
    in_progress: { variant: "warning", label: "In progress" },
    completed: { variant: "success", label: "Completed" },
    cancelled: { variant: "outline", label: "Cancelled" },
    rescheduled: { variant: "outline", label: "Rescheduled" },
  };
  const c = map[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, { variant: "default" | "success" | "warning" | "info" | "danger" | "outline"; label: string }> = {
    critical: { variant: "danger", label: "Critical" },
    high: { variant: "warning", label: "High" },
    medium: { variant: "info", label: "Medium" },
    low: { variant: "outline", label: "Low" },
  };
  const c = map[priority];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
