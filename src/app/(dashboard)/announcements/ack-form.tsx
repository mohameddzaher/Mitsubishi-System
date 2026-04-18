"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acknowledgeAnnouncement } from "@/server/announcements/actions";

export function AckForm({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await acknowledgeAnnouncement(id);
            toast.success("Marked as read");
          } catch {
            toast.error("Failed");
          }
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Check />} Mark read
    </Button>
  );
}
