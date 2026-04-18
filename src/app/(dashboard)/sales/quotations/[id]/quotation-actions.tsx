"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptQuotation, rejectQuotation, sendQuotation } from "@/server/quotations/actions";

export function QuotationActions({ quotationId, status }: { quotationId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (status === "accepted" || status === "rejected") return null;

  async function handleSend() {
    start(async () => {
      try {
        await sendQuotation(quotationId);
        toast.success("Quotation sent to customer");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to send");
      }
    });
  }

  async function handleAccept() {
    start(async () => {
      try {
        const result = await acceptQuotation(quotationId);
        toast.success("Quotation accepted · customer activated · contract generated");
        if (result.contractId) router.push(`/contracts/${result.contractId}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to accept");
      }
    });
  }

  async function handleReject() {
    const reason = window.prompt("Rejection reason:");
    if (!reason) return;
    start(async () => {
      try {
        await rejectQuotation(quotationId, reason);
        toast.success("Quotation rejected");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to reject");
      }
    });
  }

  const canSend = status === "draft" || status === "revised";

  return (
    <div className="flex items-center gap-2">
      {canSend && (
        <Button variant="secondary" size="sm" onClick={handleSend} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Send />} Send to customer
        </Button>
      )}
      <Button variant="secondary" size="sm" onClick={handleReject} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <XCircle />} Reject
      </Button>
      <Button size="sm" onClick={handleAccept} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Accept &amp; activate customer
      </Button>
    </div>
  );
}
