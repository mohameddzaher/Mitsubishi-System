/* eslint-disable no-console */
import * as argon2 from "argon2";
import { connectDB, disconnectDB } from "@/lib/db";
import { Customer, User } from "@/models";
import { UserRole } from "@/config/roles";

async function main() {
  console.log("→ Creating customer portal user");
  await connectDB();

  // Pick the first active customer
  const customer = await Customer.findOne({ status: "active" }).sort({ activatedAt: 1 }).lean();
  if (!customer) {
    console.error("No active customer found. Run seed first.");
    process.exit(1);
  }

  const passwordHash = await argon2.hash("Customer@2026!", {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const email = "customer@melsa-mkk.com";
  const existing = await User.findOne({ email });
  if (existing) {
    await User.updateOne(
      { _id: existing._id },
      {
        $set: {
          passwordHash,
          status: "active",
          employeeId: customer.code,
          firstName: customer.commercialName.split(" ")[0] ?? "Customer",
          lastName: "Portal",
          role: UserRole.CUSTOMER,
          branchId: customer.branchId,
        },
      },
    );
    console.log(`✓ Updated customer user: ${email} → linked to ${customer.commercialName} (${customer.code})`);
  } else {
    await User.create({
      email,
      phone: customer.contacts?.[0]?.phone ?? "",
      passwordHash,
      employeeId: customer.code,
      firstName: customer.commercialName.split(" ")[0] ?? "Customer",
      lastName: "Portal",
      role: UserRole.CUSTOMER,
      branchId: customer.branchId,
      status: "active",
      preferences: { theme: "dark", language: "en", timezone: "Asia/Riyadh", notifications: { email: true, push: true, inApp: true } },
    });
    console.log(`✓ Created customer user: ${email} → linked to ${customer.commercialName} (${customer.code})`);
  }

  console.log("\n📧 Login: customer@melsa-mkk.com / Customer@2026!");
  console.log(`🏢 Linked to: ${customer.commercialName} (${customer.code})`);

  await disconnectDB();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
