"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Contract, AuditLog } from "@/models";
import { requireSession, enforce } from "@/lib/session";
import { VAT_RATE } from "@/config/constants";

const idSchema = z.string().regex(/^[a-f0-9]{24}$/i);

const renewSchema = z.object({
  durationMonths: z.coerce.number().min(1).max(60).default(12),
  priceAdjustmentPct: z.coerce.number().default(0),
  billingCycle: z.enum(["monthly", "quarterly", "semi_annual", "annual"]).optional(),
});

export async function renewContract(contractId: string, formData: FormData) {
  const session = await requireSession();
  await enforce("contracts", "edit");
  const id = idSchema.parse(contractId);
  const data = renewSchema.parse(Object.fromEntries(formData));
  await connectDB();

  const prev = await Contract.findById(id);
  if (!prev) throw new Error("Contract not found");

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + data.durationMonths);

  const newPrice = Math.round(prev.price * (1 + data.priceAdjustmentPct / 100));
  const vatAmount = Math.round(newPrice * VAT_RATE);

  const count = await Contract.countDocuments({ branchId: prev.branchId });
  const code = `CON-MKK-${startDate.getFullYear()}-${String(count + 1).padStart(5, "0")}`;

  const renewed = await Contract.create({
    code,
    customerId: prev.customerId,
    type: prev.type,
    status: "active",
    unitIds: prev.unitIds,
    unitCount: prev.unitCount,
    startDate,
    endDate,
    durationMonths: data.durationMonths,
    billingCycle: data.billingCycle ?? prev.billingCycle,
    paymentTiming: prev.paymentTiming,
    visitFrequency: prev.visitFrequency,
    visitsPerYear: prev.visitsPerYear,
    coverage: prev.coverage,
    sla: prev.sla,
    price: newPrice,
    vatAmount,
    total: newPrice + vatAmount,
    currency: prev.currency,
    autoRenew: prev.autoRenew,
    renewalNoticeDays: prev.renewalNoticeDays,
    renewedFromId: prev._id,
    signedBy: prev.signedBy,
    signedAt: new Date(),
    branchId: prev.branchId,
    createdBy: session.user.id,
  });

  // Mark previous as renewed
  prev.status = "renewed";
  await prev.save();

  await AuditLog.create({
    userId: session.user.id,
    action: "renew_contract",
    resource: "contracts",
    resourceId: renewed._id,
    resourceLabel: renewed.code,
    branchId: prev.branchId,
  });

  revalidatePath("/contracts");
  revalidatePath(`/contracts/${prev._id}`);
  redirect(`/contracts/${renewed._id}`);
}

export async function terminateContract(contractId: string, reason: string) {
  const session = await requireSession();
  await enforce("contracts", "edit");
  const id = idSchema.parse(contractId);
  await connectDB();

  const contract = await Contract.findById(id);
  if (!contract) throw new Error("Contract not found");

  contract.status = "terminated";
  contract.terminatedAt = new Date();
  contract.terminationReason = reason;
  await contract.save();

  revalidatePath(`/contracts/${id}`);
  return { success: true };
}
