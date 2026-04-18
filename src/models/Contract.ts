import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { CONTRACT_TYPES } from "@/config/constants";

const ContractSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    quotationId: { type: Schema.Types.ObjectId, ref: "Quotation" },

    type: { type: String, enum: CONTRACT_TYPES, required: true, index: true },
    status: {
      type: String,
      enum: ["draft", "active", "expiring_soon", "expired", "terminated", "renewed"],
      default: "draft",
      index: true,
    },

    unitIds: [{ type: Schema.Types.ObjectId, ref: "Unit" }],
    unitCount: { type: Number, default: 0 },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true, index: true },
    durationMonths: { type: Number, default: 12 },

    billingCycle: {
      type: String,
      enum: ["monthly", "quarterly", "semi_annual", "annual"],
      default: "semi_annual",
    },
    paymentTiming: {
      type: String,
      enum: ["in_advance", "arrears"],
      default: "in_advance",
    },
    visitFrequency: {
      type: String,
      enum: ["weekly", "biweekly", "monthly", "bimonthly", "quarterly"],
      default: "monthly",
    },
    visitsPerYear: { type: Number, default: 12 },

    coverage: {
      sparePartsCovered: { type: Boolean, default: true },
      laborCovered: { type: Boolean, default: true },
      emergencyIncluded: { type: Boolean, default: true },
      modernizationIncluded: { type: Boolean, default: false },
    },
    sla: {
      responseTimeMinutes: { type: Number, default: 60 },
      resolutionTimeHours: { type: Number, default: 24 },
    },

    price: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: "SAR" },

    autoRenew: { type: Boolean, default: true },
    renewalNoticeDays: { type: Number, default: 60 },
    renewedFromId: { type: Schema.Types.ObjectId, ref: "Contract" },

    documents: [
      {
        type: { type: String, default: "contract" },
        url: String,
        name: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    signedBy: { type: String, default: "" },
    signedAt: { type: Date },
    terminatedAt: { type: Date },
    terminationReason: { type: String, default: "" },

    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ContractSchema.index({ customerId: 1, status: 1 });
ContractSchema.index({ branchId: 1, status: 1, endDate: 1 });

export type ContractDoc = InferSchemaType<typeof ContractSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Contract: Model<ContractDoc> =
  (mongoose.models.Contract as Model<ContractDoc>) ||
  mongoose.model<ContractDoc>("Contract", ContractSchema);
