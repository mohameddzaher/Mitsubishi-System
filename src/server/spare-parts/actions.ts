"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import {
  SparePartRequest,
  AuditLog,
  Notification,
  SparePart,
  Quotation,
  WorkOrder,
} from "@/models";
import { requireSession, enforce } from "@/lib/session";
import { VAT_RATE } from "@/config/constants";

const idSchema = z.string().regex(/^[a-f0-9]{24}$/i);

export async function approveSparePartRequest(requestId: string, note?: string) {
  const session = await requireSession();
  await enforce("spare_part_requests", "approve");
  const id = idSchema.parse(requestId);
  await connectDB();

  const req = await SparePartRequest.findById(id);
  if (!req) throw new Error("Request not found");
  if (req.status !== "pending_manager_approval") {
    throw new Error(`Cannot approve request in status: ${req.status}`);
  }

  req.status = "approved";
  req.set("managerApproval", {
    approvedById: session.user.id,
    at: new Date(),
    note: note ?? "",
    decision: "approved",
  });
  req.timeline.push({
    status: "approved",
    at: new Date(),
    byId: session.user.id,
    note: note ?? "",
  } as unknown as (typeof req.timeline)[number]);
  await req.save();

  // Auto-create a Quotation so sales can send the customer a price for the
  // parts the technician just requested. One quotation per approval.
  const part = await SparePart.findById(req.partId);
  let quotationId: mongoose.Types.ObjectId | null = null;

  if (part) {
    const unitPrice = part.sellingPrice > 0 ? part.sellingPrice : Math.round(part.unitCost * 1.4);
    const lineTotal = unitPrice * req.qty;
    const vatAmount = Math.round(lineTotal * VAT_RATE);
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const countThisYear = await Quotation.countDocuments({
      branchId: req.branchId,
      createdAt: {
        $gte: new Date(new Date().getFullYear(), 0, 1),
      },
    });
    const code = `QT-MKK-${new Date().getFullYear()}-${String(countThisYear + 1).padStart(5, "0")}`;

    const quotation = await Quotation.create({
      code,
      customerId: req.customerId,
      status: "draft",
      contractType: "spare_parts_only",
      source: "spare_part_request",
      sourceWorkOrderId: req.workOrderId,
      sourceSparePartRequestIds: [req._id],
      items: [
        {
          description: `${part.name} (${part.partNumber})${req.reason ? ` — ${req.reason}` : ""}`,
          category: "spare_part",
          qty: req.qty,
          unitPrice,
          discount: 0,
          total: lineTotal,
        },
      ],
      subtotal: lineTotal,
      vatAmount,
      discountAmount: 0,
      total: lineTotal + vatAmount,
      validUntil,
      notes: `Generated from spare-part request ${req.code} following work order visit.`,
      preparedBy: session.user.id,
      branchId: req.branchId,
      createdBy: session.user.id,
    });
    quotationId = quotation._id;

    // Link back to the work order too, for traceability.
    if (req.workOrderId) {
      await WorkOrder.updateOne(
        { _id: req.workOrderId },
        { $addToSet: { sparePartRequestIds: req._id } },
      );
    }
  }

  // Stock check — fast-track to ready_for_pickup if in stock.
  if (part && part.stockLevel >= req.qty) {
    req.status = "ready_for_pickup";
    req.set("warehouseAction", { action: "in_stock", byId: session.user.id, at: new Date() });
    req.timeline.push({
      status: "ready_for_pickup",
      at: new Date(),
      note: "Stock available · ready for pickup",
    } as unknown as (typeof req.timeline)[number]);
    await req.save();
  }

  await Notification.create({
    userId: req.technicianId,
    type: "spare_approved",
    title: "Spare part request approved",
    body: quotationId
      ? `Request ${req.code} approved. A quotation has been drafted for the customer.`
      : `Your request ${req.code} has been ${req.status === "ready_for_pickup" ? "approved and is ready for pickup" : "approved"}.`,
    link: quotationId ? `/sales/quotations/${quotationId}` : `/spare-parts/requests`,
    priority: "normal",
    entityType: "spare_part_request",
    entityId: req._id,
  });

  await AuditLog.create({
    userId: session.user.id,
    userName: `${session.user.firstName} ${session.user.lastName}`,
    userRole: session.user.role,
    action: "approve_spare_part_request",
    resource: "spare_part_requests",
    resourceId: req._id,
    resourceLabel: req.code,
    newValue: { status: req.status, quotationId: quotationId ? String(quotationId) : null },
    branchId: req.branchId,
  });

  revalidatePath("/spare-parts/requests");
  revalidatePath("/sales/quotations");
  return { success: true, quotationId: quotationId ? String(quotationId) : null };
}

export async function rejectSparePartRequest(requestId: string, reason: string) {
  const session = await requireSession();
  await enforce("spare_part_requests", "approve");
  const id = idSchema.parse(requestId);
  await connectDB();

  const req = await SparePartRequest.findById(id);
  if (!req) throw new Error("Request not found");

  req.status = "rejected";
  req.set("managerApproval", {
    approvedById: session.user.id,
    at: new Date(),
    note: reason,
    decision: "rejected",
  });
  req.timeline.push({
    status: "rejected",
    at: new Date(),
    byId: session.user.id,
    note: reason,
  } as unknown as (typeof req.timeline)[number]);
  await req.save();

  await Notification.create({
    userId: req.technicianId,
    type: "spare_approved",
    title: "Spare part request rejected",
    body: reason,
    link: `/spare-parts/requests`,
    priority: "high",
    entityType: "spare_part_request",
    entityId: req._id,
  });

  revalidatePath("/spare-parts/requests");
  return { success: true };
}
