"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Opportunity, Quotation, AuditLog } from "@/models";
import { requireSession, enforce } from "@/lib/session";
import { VAT_RATE } from "@/config/constants";

const oppSchema = z.object({
  customerId: z.string().regex(/^[a-f0-9]{24}$/i),
  title: z.string().min(2),
  value: z.coerce.number().min(0),
  probability: z.coerce.number().min(0).max(100),
  expectedCloseDate: z.string(),
  dealType: z.enum(["amc", "installation", "modernization", "repair", "upgrade"]),
  stage: z.enum(["new", "contacted", "qualified", "site_survey", "quotation_prepared", "quotation_sent", "negotiation", "won", "lost", "on_hold"]).default("new"),
});

export async function createOpportunity(formData: FormData) {
  const session = await requireSession();
  await enforce("opportunities", "create");
  const data = oppSchema.parse(Object.fromEntries(formData));
  await connectDB();

  const opp = await Opportunity.create({
    customerId: new mongoose.Types.ObjectId(data.customerId),
    title: data.title,
    value: data.value,
    probability: data.probability,
    expectedCloseDate: new Date(data.expectedCloseDate),
    dealType: data.dealType,
    stage: data.stage,
    ownerId: session.user.id,
    branchId: session.user.branchId,
    createdBy: session.user.id,
  });

  await AuditLog.create({
    userId: session.user.id,
    action: "create_opportunity",
    resource: "opportunities",
    resourceId: opp._id,
    resourceLabel: opp.title,
    branchId: session.user.branchId,
  });

  revalidatePath("/sales/opportunities");
  redirect(`/sales/opportunities/${opp._id}`);
}

const quotationSchema = z.object({
  customerId: z.string().regex(/^[a-f0-9]{24}$/i),
  description: z.string().min(2),
  qty: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
  contractType: z.string().default("amc_comprehensive"),
  validityDays: z.coerce.number().min(1).default(30),
  notes: z.string().optional(),
});

export async function createQuotation(formData: FormData) {
  const session = await requireSession();
  await enforce("quotations", "create");
  const data = quotationSchema.parse(Object.fromEntries(formData));
  await connectDB();

  const count = await Quotation.countDocuments({ branchId: session.user.branchId });
  const code = `QUO-MKK-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const itemTotal = data.qty * data.unitPrice;
  const vatAmount = Math.round(itemTotal * VAT_RATE);
  const total = itemTotal + vatAmount;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + data.validityDays);

  const q = await Quotation.create({
    code,
    customerId: new mongoose.Types.ObjectId(data.customerId),
    version: 1,
    status: "draft",
    contractType: data.contractType,
    items: [
      {
        description: data.description,
        category: "amc",
        qty: data.qty,
        unitPrice: data.unitPrice,
        discount: 0,
        total: itemTotal,
      },
    ],
    subtotal: itemTotal,
    vatAmount,
    total,
    validUntil,
    notes: data.notes ?? "",
    preparedBy: session.user.id,
    branchId: session.user.branchId,
    createdBy: session.user.id,
  });

  await AuditLog.create({
    userId: session.user.id,
    action: "create_quotation",
    resource: "quotations",
    resourceId: q._id,
    resourceLabel: q.code,
    branchId: session.user.branchId,
  });

  revalidatePath("/sales/quotations");
  redirect(`/sales/quotations/${q._id}`);
}

export async function updateOpportunityStage(opportunityId: string, stage: string) {
  const session = await requireSession();
  await connectDB();
  const opp = await Opportunity.findById(opportunityId);
  if (!opp) throw new Error("Opportunity not found");
  opp.stage = stage as typeof opp.stage;
  if (stage === "won" || stage === "lost") {
    opp.actualCloseDate = new Date();
  }
  await opp.save();
  revalidatePath("/sales/opportunities");
  return { success: true };
}
