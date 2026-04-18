import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Announcement } from "@/models";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Megaphone, Pin } from "lucide-react";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { UserRole } from "@/config/roles";
import { AckForm } from "./ack-form";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const session = await requireSession();
  await connectDB();

  const announcements = await Announcement.find({ branchId: session.user.branchId, deletedAt: null })
    .sort({ pinned: -1, createdAt: -1 })
    .limit(50)
    .populate("authorId", "firstName lastName role")
    .lean();

  const canCreate = [
    UserRole.SUPER_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.DEPUTY_BRANCH_MANAGER,
    UserRole.HEAD_OF_HR,
    UserRole.HEAD_OF_SALES,
    UserRole.HEAD_OF_SERVICE,
    UserRole.HEAD_OF_FINANCE,
    UserRole.HEAD_OF_COLLECTION,
    UserRole.HEAD_OF_PROCUREMENT,
    UserRole.HEAD_OF_IT,
    UserRole.HEAD_OF_CUSTOMER_CARE,
    UserRole.CHAIRMAN,
    UserRole.CEO,
    UserRole.COO,
  ].includes(session.user.role);

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Megaphone className="size-4 text-[var(--color-brand)]" /> Announcements
          </span>
        }
        description="Broadcasts from leadership and department heads"
        actions={canCreate ? (<Button asChild><Link href="/announcements/new">+ New announcement</Link></Button>) : undefined}
      />

      {announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="size-4" />}
          title="No announcements yet"
          description="Leadership broadcasts appear here. They also hit your notifications inbox."
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const author = a.authorId as unknown as { firstName?: string; lastName?: string; role?: string } | null;
            const acked = a.acknowledgedBy?.some((ack) => String(ack.userId) === session.user.id);
            return (
              <Card key={String(a._id)} className={a.pinned ? "border-[var(--color-accent-gold)]/30" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {a.pinned && <Pin className="size-3 text-[var(--color-accent-gold)]" />}
                        <h3 className="text-[14px] font-semibold">{a.title}</h3>
                        <Badge
                          variant={
                            a.priority === "critical"
                              ? "danger"
                              : a.priority === "high"
                                ? "warning"
                                : a.priority === "low"
                                  ? "outline"
                                  : "info"
                          }
                        >
                          {a.priority}
                        </Badge>
                        {a.scope !== "branch" && <Badge variant="outline">{a.scope}</Badge>}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-xs text-[var(--color-text-secondary)]">{a.body}</p>
                      <div className="mt-2 text-[10px] text-[var(--color-text-muted)]">
                        {author && <span>By {author.firstName} {author.lastName}</span>}
                        <span> · {formatDateTime(a.createdAt ?? new Date())}</span>
                        <span> · {a.acknowledgedBy?.length ?? 0} acknowledged</span>
                      </div>
                    </div>
                    {!acked && <AckForm id={String(a._id)} />}
                    {acked && <Badge variant="success">Read</Badge>}
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
