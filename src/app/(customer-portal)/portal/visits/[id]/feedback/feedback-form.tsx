"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitVisitRating } from "@/server/work-orders/actions";
import { cn } from "@/lib/utils";

export function FeedbackForm({
  workOrderId,
  initialRating,
  initialComment,
}: {
  workOrderId: string;
  initialRating: number;
  initialComment: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [pending, start] = useTransition();

  async function submit() {
    if (rating < 1) {
      toast.error("Please select at least 1 star");
      return;
    }
    start(async () => {
      try {
        await submitVisitRating(workOrderId, rating, comment);
        toast.success("Thank you for your feedback");
        router.push(`/portal/visits/${workOrderId}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Submit failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Star rating</Label>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="transition-transform hover:scale-110"
              aria-label={`Rate ${n} stars`}
            >
              <Star
                className={cn(
                  "size-8",
                  n <= rating ? "fill-[var(--color-accent-gold)] text-[var(--color-accent-gold)]" : "text-[var(--color-border-strong)]",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="comment">Comment (optional)</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us about your experience..."
          className="mt-1"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button onClick={submit} disabled={pending || rating < 1}>
          {pending ? <Loader2 className="animate-spin" /> : <Star />}
          Submit feedback
        </Button>
      </div>
    </div>
  );
}
