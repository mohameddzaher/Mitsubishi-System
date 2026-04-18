"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Customer, AuditLog } from "@/models";
import { requireSession, enforce } from "@/lib/session";
import { CUSTOMER_TYPES, CUSTOMER_STATUSES } from "@/config/constants";

const idSchema = z.string().regex(/^[a-f0-9]{24}$/i);

const editSchema = z.object({
  commercialName: z.string().min(2),
  legalName: z.string().optional(),
  type: z.enum(CUSTOMER_TYPES),
  status: z.enum(CUSTOMER_STATUSES),
  contactName: z.string().optional(),
  contactRole: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  street: z.string().optional(),
  district: z.string().optional(),
  taxNumber: z.string().optional(),
  commercialRegistration: z.string().optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  riskRating: z.enum(["A", "B", "C", "D"]).optional(),
  notes: z.string().optional(),
});

export async function updateCustomer(customerId: string, formData: FormData) {
  const session = await requireSession();
  await enforce("customers", "edit");
  const id = idSchema.parse(customerId);
  const data = editSchema.parse(Object.fromEntries(formData));
  await connectDB();

  const customer = await Customer.findById(id);
  if (!customer) throw new Error("Customer not found");

  const oldStatus = customer.status;

  customer.commercialName = data.commercialName;
  customer.legalName = data.legalName ?? customer.legalName;
  customer.type = data.type;

  // Status transition: activate stamps activatedAt
  if (oldStatus !== "active" && data.status === "active" && !customer.activatedAt) {
    customer.activatedAt = new Date();
  }
  customer.status = data.status;

  customer.taxNumber = data.taxNumber ?? customer.taxNumber;
  customer.commercialRegistration = data.commercialRegistration ?? customer.commercialRegistration;
  if (data.creditLimit !== undefined) customer.creditLimit = data.creditLimit;
  if (data.riskRating) customer.riskRating = data.riskRating;
  if (data.notes !== undefined) customer.notes = data.notes;

  if (data.contactName || data.contactPhone || data.contactEmail) {
    const primary = customer.contacts?.find((c) => c.isPrimary) ?? customer.contacts?.[0];
    if (primary) {
      if (data.contactName) primary.name = data.contactName;
      if (data.contactRole !== undefined) primary.role = data.contactRole;
      if (data.contactPhone) primary.phone = data.contactPhone;
      if (data.contactEmail !== undefined) primary.email = data.contactEmail;
      primary.isPrimary = true;
    } else if (data.contactName) {
      customer.contacts.push({
        name: data.contactName,
        role: data.contactRole ?? "",
        phone: data.contactPhone ?? "",
        email: data.contactEmail ?? "",
        whatsapp: "",
        isPrimary: true,
      } as unknown as typeof customer.contacts[number]);
    }
    customer.markModified("contacts");
  }

  if (data.street || data.district) {
    const addr = customer.addresses?.find((a) => a.isDefault) ?? customer.addresses?.[0];
    if (addr) {
      if (data.street) addr.street = data.street;
      if (data.district) addr.district = data.district;
      addr.isDefault = true;
    } else {
      customer.addresses.push({
        label: "Main",
        street: data.street ?? "",
        district: data.district ?? "",
        city: "Makkah",
        country: "Saudi Arabia",
        isDefault: true,
      } as unknown as typeof customer.addresses[number]);
    }
    customer.markModified("addresses");
  }

  customer.updatedBy = session.user.id as unknown as typeof customer.updatedBy;
  await customer.save();

  await AuditLog.create({
    userId: session.user.id,
    userName: `${session.user.firstName} ${session.user.lastName}`,
    userRole: session.user.role,
    action: "update_customer",
    resource: "customers",
    resourceId: customer._id,
    resourceLabel: customer.code,
    newValue: { status: customer.status },
    branchId: customer.branchId,
  });

  revalidatePath(`/customers/${id}`);
  revalidatePath("/customers");
  redirect(`/customers/${id}`);
}

export async function softDeleteCustomer(customerId: string) {
  const session = await requireSession();
  await enforce("customers", "delete");
  const id = idSchema.parse(customerId);
  await connectDB();

  await Customer.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { deletedAt: new Date(), updatedBy: session.user.id } });
  await AuditLog.create({
    userId: session.user.id,
    action: "delete_customer",
    resource: "customers",
    resourceId: id,
    branchId: session.user.branchId,
  });
  revalidatePath("/customers");
  return { success: true };
}
