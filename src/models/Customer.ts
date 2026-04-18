import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { CUSTOMER_STATUSES, CUSTOMER_TYPES } from "@/config/constants";

const ContactSchema = new Schema(
  {
    name: { type: String, required: true },
    role: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true },
);

const AddressSchema = new Schema(
  {
    label: { type: String, default: "Main" },
    street: { type: String, default: "" },
    district: { type: String, default: "" },
    city: { type: String, default: "Makkah" },
    country: { type: String, default: "Saudi Arabia" },
    latitude: { type: Number },
    longitude: { type: Number },
    googleMapsUrl: { type: String, default: "" },
    isDefault: { type: Boolean, default: false },
    notes: { type: String, default: "" },
  },
  { _id: true },
);

const CustomerSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: CUSTOMER_TYPES, required: true, index: true },

    commercialName: { type: String, required: true, trim: true },
    legalName: { type: String, default: "" },

    contacts: [ContactSchema],
    addresses: [AddressSchema],

    taxNumber: { type: String, default: "" },
    commercialRegistration: { type: String, default: "" },
    vatNumber: { type: String, default: "" },

    status: {
      type: String,
      enum: CUSTOMER_STATUSES,
      default: "lead",
      index: true,
    },
    activatedAt: { type: Date, default: null, index: true },

    leadSource: {
      type: String,
      enum: [
        "website",
        "referral",
        "cold_call",
        "walk_in",
        "marketing_campaign",
        "existing_customer",
        "partner",
        "other",
      ],
      default: "other",
    },
    leadStage: { type: String, default: "" },
    riskRating: { type: String, enum: ["A", "B", "C", "D"], default: "B" },
    creditLimit: { type: Number, default: 0 },
    totalLifetimeValue: { type: Number, default: 0 },
    totalOutstanding: { type: Number, default: 0 },

    assignedSalesRepId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    assignedAccountManagerId: { type: Schema.Types.ObjectId, ref: "User" },
    assignedServiceSupervisorId: { type: Schema.Types.ObjectId, ref: "User" },
    assignedCollectionOfficerId: { type: Schema.Types.ObjectId, ref: "User", index: true },

    tags: [{ type: String }],
    preferredLanguage: { type: String, enum: ["en", "ar"], default: "en" },
    notes: { type: String, default: "" },

    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

CustomerSchema.index({ branchId: 1, status: 1 });
CustomerSchema.index({ assignedSalesRepId: 1, status: 1 });
CustomerSchema.index({ commercialName: "text", legalName: "text" });

export type CustomerDoc = InferSchemaType<typeof CustomerSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Customer: Model<CustomerDoc> =
  (mongoose.models.Customer as Model<CustomerDoc>) ||
  mongoose.model<CustomerDoc>("Customer", CustomerSchema);
