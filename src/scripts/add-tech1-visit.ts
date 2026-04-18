/* eslint-disable no-console */
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "@/lib/db";
import { User, Unit, WorkOrder, Notification } from "@/models";
import { UserRole } from "@/config/roles";

const DEFAULT_CHECKLIST = [
  { itemId: "c1", label: "Check motor temperature and vibration", category: "mechanical", required: true },
  { itemId: "c2", label: "Inspect traveling cables for wear", category: "electrical", required: true },
  { itemId: "c3", label: "Test emergency brake", category: "safety", required: true },
  { itemId: "c4", label: "Verify door operator alignment", category: "doors", required: true },
  { itemId: "c5", label: "Lubricate guide rails", category: "mechanical", required: true },
  { itemId: "c6", label: "Test overload sensor", category: "safety", required: true },
  { itemId: "c7", label: "Check cabin interior and lighting", category: "interior", required: false },
  { itemId: "c8", label: "Verify floor indicator operation", category: "electrical", required: false },
  { itemId: "c9", label: "Test emergency communication system", category: "safety", required: true },
  { itemId: "c10", label: "Inspect buffer oil level", category: "mechanical", required: false },
];

async function main() {
  await connectDB();

  const tech1 = await User.findOne({ email: "tech1@melsa-mkk.com" });
  if (!tech1) {
    console.error("tech1@melsa-mkk.com not found. Run `npm run seed:reset` first.");
    process.exit(1);
  }

  // Rename tech1 to the fixed demo identity so Service Manager sees
  // "Omar Al-Rashidi" in the dropdown and knows it maps to the tech1 login.
  if (tech1.firstName !== "Omar" || tech1.lastName !== "Al-Rashidi") {
    await User.updateOne(
      { _id: tech1._id },
      { $set: { firstName: "Omar", lastName: "Al-Rashidi" } },
    );
    console.log(`✓ Renamed tech1 → Omar Al-Rashidi`);
  } else {
    console.log(`✓ tech1 already named Omar Al-Rashidi`);
  }

  const dispatcher = await User.findOne({ email: "service.manager@melsa-mkk.com" });

  // Pick a unit in the same branch — prefer one with an active contract.
  const unit = await Unit.findOne({
    branchId: tech1.branchId,
    deletedAt: null,
    activeContractId: { $ne: null },
  }).lean();

  if (!unit) {
    console.error("No unit with an active contract found in this branch. Seed data missing?");
    process.exit(1);
  }

  // Schedule for today at 10:00 (so it lands on /service/my-day today)
  const scheduledDate = new Date();
  scheduledDate.setHours(0, 0, 0, 0);

  const code = `WO-MKK-${scheduledDate.getFullYear().toString().slice(2)}${String(scheduledDate.getMonth() + 1).padStart(2, "0")}${String(scheduledDate.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-4)}`;

  const wo = await WorkOrder.create({
    code,
    type: "preventive",
    priority: "high",
    status: "scheduled",
    customerId: unit.customerId,
    unitId: unit._id,
    contractId: unit.activeContractId,
    technicianId: tech1._id,
    dispatchedById: dispatcher?._id ?? tech1._id,
    scheduledDate,
    scheduledTime: "10:00",
    expectedDurationMinutes: 90,
    checklist: DEFAULT_CHECKLIST.map((i) => ({ ...i, completed: false, issue: false, notes: "" })),
    technicianNotes: "Demo visit assigned to tech1 (Omar Al-Rashidi). Start Visit → complete checklist → End Visit.",
    branchId: tech1.branchId,
    createdBy: dispatcher?._id ?? tech1._id,
  });

  await Notification.create({
    userId: tech1._id,
    type: "visit_scheduled",
    title: "New visit scheduled",
    body: `${scheduledDate.toDateString()} at 10:00 — ${unit.model}`,
    link: `/service/work-orders/${wo._id}`,
    priority: "normal",
    read: false,
  });

  console.log(`✓ Created work order ${code}`);
  console.log(`  Technician:  Omar Al-Rashidi (tech1@melsa-mkk.com)`);
  console.log(`  Unit:        ${unit.code} — ${unit.model}`);
  console.log(`  Scheduled:   ${scheduledDate.toDateString()} 10:00`);
  console.log(`  View:        /service/work-orders/${wo._id}`);
  console.log(`\n📧 Login as tech1@melsa-mkk.com / Melsa@2026! → /service/my-day`);

  await disconnectDB();
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect().finally(() => process.exit(1));
});
