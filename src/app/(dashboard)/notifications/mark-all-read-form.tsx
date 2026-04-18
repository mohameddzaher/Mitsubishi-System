"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "@/server/notifications/actions";

export function MarkAllReadForm() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await markAllNotificationsRead();
            toast.success("All notifications marked as read");
          } catch {
            toast.error("Could not update notifications");
          }
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Check />} Mark all read
    </Button>
  );
}
