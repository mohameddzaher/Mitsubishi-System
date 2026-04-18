import { PageHeader } from "@/components/ui/page-header";
import { SimpleTable } from "@/components/data-table/simple-table";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Department, User } from "@/models";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const session = await requireSession();
  await connectDB();
  const departments = await Department.find({ branchId: session.user.branchId, deletedAt: null })
    .populate("headId", "firstName lastName")
    .lean();

  const withCounts = await Promise.all(
    departments.map(async (d) => {
      const count = await User.countDocuments({ departmentId: d._id, status: "active", deletedAt: null });
      return { ...d, userCount: count };
    }),
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Departments" description={`${departments.length} departments in the branch`} />
      <SimpleTable
        data={withCounts}
        getKey={(r) => String((r as { _id: unknown })._id)}
        columns={[
          { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
          { key: "name", header: "Name", accessor: (r) => <span className="text-xs font-medium">{(r as { name: string }).name}</span> },
          {
            key: "head",
            header: "Head",
            accessor: (r) => {
              const h = (r as { headId: { firstName?: string; lastName?: string } | null }).headId;
              return <span className="text-xs">{h ? `${h.firstName} ${h.lastName}` : "—"}</span>;
            },
          },
          { key: "users", header: "Staff", align: "right", accessor: (r) => <span className="font-mono text-xs">{(r as { userCount: number }).userCount}</span> },
        ]}
      />
    </div>
  );
}
