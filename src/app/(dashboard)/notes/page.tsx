import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Note } from "@/models";
import { scopedFilter } from "@/server/filters";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const session = await requireSession();
  await connectDB();
  const notes = await Note.find(scopedFilter(session, { deletedAt: null }))
    .populate("authorId", "firstName lastName")
    .sort({ pinned: -1, createdAt: -1 })
    .limit(100)
    .lean();

  return (
    <div className="space-y-5">
      <PageHeader title="Notes & memos" description="Observations, reminders, and team context" />
      {notes.length === 0 ? (
        <EmptyState icon={<FileText className="size-4" />} title="No notes yet" description="Notes attached to customers, units, or tasks appear here." />
      ) : (
        <div className="space-y-2">
          {notes.map((n) => {
            const author = n.authorId as unknown as { firstName?: string; lastName?: string } | null;
            return (
              <Card key={String(n._id)}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {n.title && <div className="text-xs font-medium">{n.title}</div>}
                      <div className="text-[12px] text-[var(--color-text-secondary)]">{n.body}</div>
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
                        <Badge variant="outline">{n.relatedType}</Badge>
                        <Badge variant="outline">{n.visibility}</Badge>
                        {author && <span>· {author.firstName} {author.lastName}</span>}
                        <span>· {relativeTime(n.createdAt ?? new Date())}</span>
                      </div>
                    </div>
                    {n.pinned && <Badge variant="gold">Pinned</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
