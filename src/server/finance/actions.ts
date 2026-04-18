"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Invoice, Payment, AuditLog, Customer } from "@/models";
import { requireSession, enforce } from "@/lib/session";
import { VAT_RATE } from "@/config/constants";
import { createNotification } from "@/server/notifications/actions";

const invoiceSchema = z.object({
  customerId: z.string().regex(/^[a-f0-9]{24}$/i),
  description: z.string().min(2),
  qty: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
  dueInDays: z.coerce.number().min(1).default(30),
  contractId: z.string().optional(),
});

export async function createInvoice(formData: FormData) {
  const session = await requireSession();
  await enforce("invoices", "create");
  const data = invoiceSchema.parse(Object.fromEntries(formData));
  await connectDB();

  const subtotal = data.qty * data.unitPrice;
  const vatAmount = Math.round(subtotal * VAT_RATE);
  const total = subtotal + vatAmount;
  const issueDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + data.dueInDays);

  const count = await Invoice.countDocuments({ branchId: session.user.branchId });
  const code = `INV-MKK-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

  const inv = await Invoice.create({
    code,
    customerId: new mongoose.Types.ObjectId(data.customerId),
    contractId: data.contractId && /^[a-f0-9]{24}$/i.test(data.contractId) ? new mongoose.Types.ObjectId(data.contractId) : undefined,
    issueDate,
    dueDate,
    items: [{ description: data.description, qty: data.qty, unitPrice: data.unitPrice, total: subtotal, taxRate: VAT_RATE }],
    subtotal,
    vatAmount,
    total,
    paidAmount: 0,
    balance: total,
    status: "issued",
    agingBucket: "current",
    agingDays: 0,
    branchId: session.user.branchId,
    createdBy: session.user.id,
  });

  await AuditLog.create({
    userId: session.user.id,
    action: "create_invoice",
    resource: "invoices",
    resourceId: inv._id,
    resourceLabel: inv.code,
    branchId: session.user.branchId,
  });

  revalidatePath("/finance/invoices");
  redirect(`/finance/invoices/${inv._id}`);
}

const paymentSchema = z.object({
  invoiceId: z.string().regex(/^[a-f0-9]{24}$/i),
  amount: z.coerce.number().min(0.01),
  method: z.enum(["bank_transfer", "cheque", "cash", "credit_card", "stc_pay", "mada"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function recordPayment(formData: FormData) {
  const session = await requireSession();
  await enforce("payments", "create");
  const data = paymentSchema.parse(Object.fromEntries(formData));
  await connectDB();

  const inv = await Invoice.findById(data.invoiceId);
  if (!inv) throw new Error("Invoice not found");

  const count = await Payment.countDocuments({ branchId: session.user.branchId });
  const code = `PAY-MKK-${String(count + 1).padStart(5, "0")}`;

  const payment = await Payment.create({
    code,
    invoiceId: inv._id,
    customerId: inv.customerId,
    amount: data.amount,
    method: data.method,
    reference: data.reference ?? "",
    receivedAt: new Date(),
    receivedById: session.user.id,
    notes: data.notes ?? "",
    reconciled: true,
    reconciledAt: new Date(),
    branchId: session.user.branchId,
  });

  // Update invoice balance
  inv.paidAmount = (inv.paidAmount ?? 0) + data.amount;
  inv.balance = inv.total - inv.paidAmount;
  if (inv.balance <= 0) {
    inv.status = "paid";
    inv.paidAt = new Date();
  } else {
    inv.status = "partially_paid";
  }
  await inv.save();

  // Notify account manager / collection officer
  if (inv.assignedCollectionOfficerId) {
    await createNotification({
      userId: inv.assignedCollectionOfficerId,
      type: "invoice_paid",
      title: `Payment received: ${inv.code}`,
      body: `${data.amount} SAR via ${data.method.replace("_", " ")}`,
      link: `/finance/invoices/${inv._id}`,
    });
  }

  await AuditLog.create({
    userId: session.user.id,
    action: "record_payment",
    resource: "payments",
    resourceId: payment._id,
    resourceLabel: payment.code,
    newValue: { amount: data.amount, invoiceStatus: inv.status },
    branchId: session.user.branchId,
  });

  revalidatePath("/finance/payments");
  revalidatePath(`/finance/invoices/${inv._id}`);
  revalidatePath("/finance/collection");
  redirect(`/finance/payments/${payment._id}`);
}
