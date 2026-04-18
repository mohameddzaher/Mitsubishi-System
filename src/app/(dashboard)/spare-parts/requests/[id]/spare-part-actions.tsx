"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { approveSparePartRequest, rejectSparePartRequest } from "@/server/spare-parts/actions";

export function SparePartActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function handleApprove() {
    start(async () => {
      try {
        await approveSparePartRequest(requestId);
        toast.success("Request approved");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  async function handleReject() {
    const reason = window.prompt("Rejection reason:");
    if (!reason) return;
    start(async () => {
      try {
        await rejectSparePartRequest(requestId, reason);
        toast.success("Request rejected");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={handleReject} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <XCircle />} Reject
      </Button>
      <Button size="sm" onClick={handleApprove} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Approve
      </Button>
    </div>
  );
}
