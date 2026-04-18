import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { User } from "@/models";
import { createTask } from "@/server/tasks/actions";
import { ROLE_LABELS } from "@/config/roles";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const session = await requireSession();
  await connectDB();

  const users = await User.find({
    branchId: session.user.branchId,
    status: "active",
    deletedAt: null,
  })
    .select("firstName lastName role employeeId")
    .sort({ firstName: 1 })
    .lean();

  const options = users.map((u) => ({
    value: String(u._id),
    label: `${u.firstName} ${u.lastName}`,
    description: `${ROLE_LABELS[u.role] ?? u.role} · ${u.employeeId ?? ""}`,
  }));

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/tasks" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All tasks
        </Link>
      </div>
      <PageHeader title="New task" description="Assign work to someone on your team." />

      <form action={createTask} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Task details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" required placeholder="e.g., Follow up with customer X on quotation" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="Context, links, acceptance criteria…" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  name="priority"
                  aria-label="Priority"
                  title="Priority"
                  defaultValue="normal"
                  className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due date</Label>
                <Input id="dueDate" name="dueDate" type="date" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assigneeIds">Assign to *</Label>
              <SearchableSelect
                name="assigneeIds"
                options={options}
                placeholder="Select a user…"
                searchPlaceholder="Search by name, role, or employee ID"
                emptyMessage="No user found."
                required
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" asChild>
            <Link href="/tasks">Cancel</Link>
          </Button>
          <Button type="submit">Create task</Button>
        </div>
      </form>
    </div>
  );
}
