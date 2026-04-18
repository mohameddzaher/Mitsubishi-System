"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Customer, AuditLog } from "@/models";
import { requireSession, enforce } from "@/lib/session";
import { CUSTOMER_TYPES } from "@/config/constants";
import { MAKKAH_DISTRICTS } from "@/config/constants";

const customerCreateSchema = z.object({
  commercialName: z.string().min(2),
  legalName: z.string().optional(),
  type: z.enum(CUSTOMER_TYPES),
  contactName: z.string().min(2),
  contactRole: z.string().optional(),
  contactPhone: z.string().min(6),
  contactEmail: z.string().email().optional().or(z.literal("")),
  district: z.string().optional(),
  street: z.string().optional(),
  taxNumber: z.string().optional(),
  commercialRegistration: z.string().optional(),
  leadSource: z.string().optional(),
  creditLimit: z.coerce.number().min(0).optional(),
});

export async function createCustomer(formData: FormData) {
  const session = await requireSession();
  await enforce("customers", "create");

  const data = customerCreateSchema.parse(Object.fromEntries(formData));
  await connectDB();

  const count = await Customer.countDocuments({ branchId: session.user.branchId });
  const code = `MELSA-MKK-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const district = data.district ? MAKKAH_DISTRICTS.find((d) => d.name === data.district) : null;

  const customer = await Customer.create({
    code,
    type: data.type,
    commercialName: data.commercialName,
    legalName: data.legalName,
    contacts: [
      {
        name: data.contactName,
        role: data.contactRole ?? "",
        phone: data.contactPhone,
        email: data.contactEmail || "",
        isPrimary: true,
      },
    ],
    addresses: data.street
      ? [
          {
            label: "Main",
            street: data.street,
            district: data.district ?? "",
            city: "Makkah",
            country: "Saudi Arabia",
            latitude: district?.lat,
            longitude: district?.lng,
            isDefault: true,
          },
        ]
      : [],
    taxNumber: data.taxNumber ?? "",
    commercialRegistration: data.commercialRegistration ?? "",
    status: "lead",
    leadSource: data.leadSource ?? "other",
    creditLimit: data.creditLimit ?? 0,
    assignedSalesRepId: session.user.id,
    branchId: session.user.branchId,
    createdBy: session.user.id,
  });

  await AuditLog.create({
    userId: session.user.id,
    userName: `${session.user.firstName} ${session.user.lastName}`,
    userRole: session.user.role,
    action: "create_customer",
    resource: "customers",
    resourceId: customer._id,
    resourceLabel: customer.code,
    newValue: { status: "lead" },
    branchId: customer.branchId,
  });

  revalidatePath("/customers");
  redirect(`/customers/${customer._id}`);
}
