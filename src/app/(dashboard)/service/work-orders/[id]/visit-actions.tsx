"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Play, Square, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { startVisit, endVisit, type SparePartRequestInput } from "@/server/work-orders/actions";
import type { WorkOrderStatus } from "@/config/constants";

export type SparePartOption = {
  id: string;
  partNumber: string;
  name: string;
  category: string;
  stockLevel: number;
};

type PartRow = {
  uid: string;
  partId: string;
  qty: number;
  priority: "urgent" | "normal" | "scheduled";
  reason: string;
};

export function VisitActions({
  workOrderId,
  status,
  spareParts,
}: {
  workOrderId: string;
  status: WorkOrderStatus;
  spareParts: SparePartOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [needsParts, setNeedsParts] = React.useState<"yes" | "no" | null>(null);
  const [rows, setRows] = React.useState<PartRow[]>([]);
  const [notes, setNotes] = React.useState("");

  function resetDialog() {
    setNeedsParts(null);
    setRows([]);
    setNotes("");
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { uid: Math.random().toString(36).slice(2), partId: "", qty: 1, priority: "normal", reason: "" },
    ]);
  }

  function updateRow(uid: string, patch: Partial<PartRow>) {
    setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  }

  function removeRow(uid: string) {
    setRows((prev) => prev.filter((r) => r.uid !== uid));
  }

  async function handleStart() {
    setLoading(true);
    try {
      const coords = await captureLocation();
      await startVisit(workOrderId, coords?.lat, coords?.lng);
      toast.success("Visit started · GPS recorded");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start visit");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmEnd() {
    if (needsParts === "yes") {
      if (rows.length === 0) {
        toast.error("Add at least one spare part, or choose No");
        return;
      }
      for (const r of rows) {
        if (!r.partId) {
          toast.error("Pick a part for every row");
          return;
        }
        if (r.qty < 1) {
          toast.error("Quantity must be at least 1");
          return;
        }
      }
    }

    setLoading(true);
    try {
      const coords = await captureLocation();
      const sparePartRequests: SparePartRequestInput[] =
        needsParts === "yes"
          ? rows.map((r) => ({
              partId: r.partId,
              qty: r.qty,
              priority: r.priority,
              reason: r.reason.trim(),
            }))
          : [];

      const result = await endVisit(workOrderId, {
        notes: notes.trim() || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
        sparePartRequests,
      });

      if (result.sparePartRequestsCreated > 0) {
        toast.success(
          `Visit completed · ${result.sparePartRequestsCreated} spare part request${result.sparePartRequestsCreated > 1 ? "s" : ""} sent for manager approval`,
        );
      } else {
        toast.success("Visit completed · variance computed");
      }
      setDialogOpen(false);
      resetDialog();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to end visit");
    } finally {
      setLoading(false);
    }
  }

  if (status === "scheduled" || status === "assigned") {
    return (
      <Button onClick={handleStart} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <Play />}
        Start visit
      </Button>
    );
  }

  if (status !== "in_progress") return null;

  return (
    <>
      <Button variant="danger" onClick={() => setDialogOpen(true)} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <Square />}
        End visit
      </Button>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetDialog();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>End visit</DialogTitle>
            <DialogDescription>
              Close the visit and tell the manager if the customer needs spare parts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Does this unit need spare parts?</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNeedsParts("no");
                    setRows([]);
                  }}
                  className={
                    "rounded-md border px-3 py-2 text-sm transition-colors " +
                    (needsParts === "no"
                      ? "border-[var(--color-brand)] bg-[var(--color-brand)]/10 text-[var(--color-text-primary)]"
                      : "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-default)]")
                  }
                >
                  No — unit is fine
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNeedsParts("yes");
                    if (rows.length === 0) addRow();
                  }}
                  className={
                    "rounded-md border px-3 py-2 text-sm transition-colors " +
                    (needsParts === "yes"
                      ? "border-[var(--color-warning)] bg-[var(--color-warning)]/10 text-[var(--color-text-primary)]"
                      : "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-default)]")
                  }
                >
                  Yes — request parts
                </button>
              </div>
            </div>

            {needsParts === "yes" && (
              <div className="space-y-2 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3">
                <div className="flex items-center justify-between">
                  <Label>Spare parts</Label>
                  <Button type="button" size="sm" variant="secondary" onClick={addRow}>
                    <Plus /> Add part
                  </Button>
                </div>

                {rows.length === 0 && (
                  <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-3 text-center text-[11px] text-[var(--color-text-muted)]">
                    Click &ldquo;Add part&rdquo; to pick from the catalogue.
                  </div>
                )}

                <div className="space-y-2">
                  {rows.map((row, idx) => (
                    <div
                      key={row.uid}
                      className="space-y-2 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                          Part {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeRow(row.uid)}
                          className="inline-flex size-6 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                          aria-label="Remove part"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <select
                        aria-label="Spare part"
                        value={row.partId}
                        onChange={(e) => updateRow(row.uid, { partId: e.target.value })}
                        className="h-9 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-xs"
                      >
                        <option value="">Select a part…</option>
                        {spareParts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · {p.partNumber} {p.stockLevel > 0 ? `(${p.stockLevel} in stock)` : "(out of stock)"}
                          </option>
                        ))}
                      </select>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[var(--color-text-muted)]">Quantity</label>
                          <Input
                            type="number"
                            min={1}
                            value={row.qty}
                            onChange={(e) => updateRow(row.uid, { qty: Math.max(1, Number(e.target.value) || 1) })}
                            aria-label="Quantity"
                            className="h-9"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--color-text-muted)]">Priority</label>
                          <select
                            aria-label="Priority"
                            value={row.priority}
                            onChange={(e) =>
                              updateRow(row.uid, {
                                priority: e.target.value as PartRow["priority"],
                              })
                            }
                            className="h-9 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-xs"
                          >
                            <option value="urgent">Urgent</option>
                            <option value="normal">Normal</option>
                            <option value="scheduled">Scheduled</option>
                          </select>
                        </div>
                      </div>

                      <Input
                        type="text"
                        value={row.reason}
                        onChange={(e) => updateRow(row.uid, { reason: e.target.value })}
                        placeholder="Reason (e.g. worn out, needs replacement)"
                        className="h-9"
                      />
                    </div>
                  ))}
                </div>

                {spareParts.length === 0 && (
                  <div className="text-[11px] text-[var(--color-danger)]">
                    No spare parts in the catalogue for this branch yet.
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="end-notes">Technician notes (optional)</Label>
              <Textarea
                id="end-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Summary of work performed, anything the customer should know…"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleConfirmEnd} disabled={loading || needsParts === null}>
              {loading ? <Loader2 className="animate-spin" /> : <Square />}
              {needsParts === "yes" ? "End visit & request parts" : "End visit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

async function captureLocation(): Promise<{ lat: number; lng: number } | undefined> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return undefined;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60_000 },
    );
  });
}
