"use client";

import { useTransition } from "react";
import { Loader2, CheckCircle2, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateTaskStatus } from "@/server/tasks/actions";

export function TaskStatusActions({ taskId, status }: { taskId: string; status: string }) {
  const [pending, start] = useTransition();

  async function doStatus(newStatus: string) {
    start(async () => {
      try {
        await updateTaskStatus(taskId, newStatus);
        toast.success(`Task ${newStatus.replace("_", " ")}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {status === "todo" && (
        <Button size="sm" variant="secondary" onClick={() => doStatus("in_progress")} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Play />} Start
        </Button>
      )}
      <Button size="sm" onClick={() => doStatus("done")} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Mark done
      </Button>
    </div>
  );
}
