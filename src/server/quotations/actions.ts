"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mongoose } from "@/lib/db";
import { connectDB } from "@/lib/db";
import { Quotation, Customer, Contract, AuditLog, Notification, User } from "@/models";
import { requireSession } from "@/lib/session";
import { UserRole } from "@/config/roles";
import { VAT_RATE } from "@/config/constants";

const idSchema = z.string().regex(/^[a-f0-9]{24}$/i);

export async function sendQuotation(quotationId: string) {
  const session = await requireSession();
  const id = idSchema.parse(quotationId);
  await connectDB();

  const q = await Quotation.findById(id);
  if (!q) throw new Error("Quotation not found");
  if (q.status !== "draft" && q.status !== "revised") {
    throw new Error(`Cannot send a quotation in status: ${q.status}`);
  }

  q.status = "sent";
  q.sentAt = new Date();
  await q.save();

  // Find the customer-portal user for this customer (they linked via the
  // customer's code stored on employeeId — see add-customer-user.ts).
  const customer = await Customer.findById(q.customerId).select("code").lean();
  const customerUser = customer
    ? await User.findOne({
        role: UserRole.CUSTOMER,
        employeeId: customer.code,
        deletedAt: null,
      })
        .select("_id")
        .lean()
    : null;

  await Notification.create({
    userId: q.preparedBy,
    type: "system",
    title: "Quotation sent",
    body: `${q.code} was sent to the customer.`,
    link: `/sales/quotations/${q._id}`,
    priority: "normal",
    entityType: "quotation",
    entityId: q._id,
  });

  if (customerUser) {
    await Notification.create({
      userId: customerUser._id,
      type: "system",
      title: "New quotation for your review",
      body: `Quotation ${q.code} is ready. Total: ${q.total} SAR.`,
      link: `/portal/quotations/${q._id}`,
      priority: "normal",
      entityType: "quotation",
      entityId: q._id,
    });
  }

  await AuditLog.create({
    userId: session.user.id,
    userName: `${session.user.firstName} ${session.user.lastName}`,
    userRole: session.user.role,
    action: "send_quotation",
    resource: "quotations",
    resourceId: q._id,
    resourceLabel: q.code,
    newValue: { status: "sent", sentAt: q.sentAt },
    branchId: q.branchId,
  });

  revalidatePath(`/sales/quotations/${id}`);
  revalidatePath("/sales/quotations");
  return { success: true };
}

export async function acceptQuotation(quotationId: string) {
  const session = await requireSession();
  const id = idSchema.parse(quotationId);
  await connectDB();

  const mongooseSession = await mongoose.startSession();
  try {
    let resultContractId: string | null = null;
    await mongooseSession.withTransaction(async () => {
      const q = await Quotation.findById(id).session(mongooseSession);
      if (!q) throw new Error("Quotation not found");
      if (q.status === "accepted") throw new Error("Quotation already accepted");
      if (!["draft", "sent", "viewed", "revised"].includes(q.status)) {
        throw new Error(`Cannot accept quotation in status: ${q.status}`);
      }

      // Mark quotation accepted
      q.status = "accepted";
      q.acceptedAt = new Date();
      q.approvedBy = new mongoose.Types.ObjectId(session.user.id);
      await q.save({ session: mongooseSession });

      // Activate customer
      const customer = await Customer.findById(q.customerId).session(mongooseSession);
      if (!customer) throw new Error("Customer not found");
      if (customer.status !== "active") {
        customer.status = "active";
        customer.activatedAt = new Date();
        await customer.save({ session: mongooseSession });
      }

      // Create contract from quotation
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      const vatAmount = Math.round(q.subtotal * VAT_RATE);
      const contractCount = await Contract.countDocuments({ branchId: customer.branchId }).session(mongooseSession);
      const code = `CON-MKK-${new Date().getFullYear()}-${String(contractCount + 1).padStart(5, "0")}`;

      const contract = await Contract.create(
        [
          {
            code,
            customerId: customer._id,
            quotationId: q._id,
            type: q.contractType ?? "amc_comprehensive",
            status: "active",
            unitIds: [],
            unitCount: 0,
            startDate,
            endDate,
            durationMonths: 12,
            billingCycle: "semi_annual",
            paymentTiming: "in_advance",
            visitFrequency: "monthly",
            visitsPerYear: 12,
            coverage: {
              sparePartsCovered: true,
              laborCovered: true,
              emergencyIncluded: true,
              modernizationIncluded: false,
            },
            sla: { responseTimeMinutes: 60, resolutionTimeHours: 24 },
            price: q.subtotal,
            vatAmount,
            total: q.subtotal + vatAmount,
            signedBy: customer.commercialName,
            signedAt: new Date(),
            branchId: customer.branchId,
            createdBy: session.user.id,
          },
        ],
        { session: mongooseSession },
      );
      resultContractId = String(contract[0]!._id);

      await AuditLog.create(
        [
          {
            userId: session.user.id,
            userName: `${session.user.firstName} ${session.user.lastName}`,
            userRole: session.user.role,
            action: "accept_quotation",
            resource: "quotations",
            resourceId: q._id,
            resourceLabel: q.code,
            newValue: { status: "accepted", customerActivated: true, contractId: resultContractId },
            branchId: customer.branchId,
          },
        ],
        { session: mongooseSession },
      );
    });

    revalidatePath("/sales/quotations");
    revalidatePath("/customers");
    revalidatePath("/contracts");
    revalidatePath("/dashboard");

    return { success: true, contractId: resultContractId };
  } finally {
    await mongooseSession.endSession();
  }
}

export async function rejectQuotation(quotationId: string, reason: string) {
  const session = await requireSession();
  const id = idSchema.parse(quotationId);
  await connectDB();

  const q = await Quotation.findById(id);
  if (!q) throw new Error("Quotation not found");
  q.status = "rejected";
  q.rejectedAt = new Date();
  q.rejectionReason = reason;
  await q.save();

  await AuditLog.create({
    userId: session.user.id,
    userName: `${session.user.firstName} ${session.user.lastName}`,
    userRole: session.user.role,
    action: "reject_quotation",
    resource: "quotations",
    resourceId: q._id,
    resourceLabel: q.code,
    newValue: { status: "rejected", reason },
    branchId: q.branchId,
  });

  revalidatePath("/sales/quotations");
  return { success: true };
}
