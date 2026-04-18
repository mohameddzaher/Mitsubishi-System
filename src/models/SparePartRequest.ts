import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { SPARE_REQUEST_STATUSES } from "@/config/constants";

const SparePartRequestSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true, index: true },
    technicianId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    unitId: { type: Schema.Types.ObjectId, ref: "Unit" },

    partId: { type: Schema.Types.ObjectId, ref: "SparePart", required: true },
    partNameSnapshot: { type: String, default: "" },
    qty: { type: Number, default: 1, min: 1 },
    priority: {
      type: String,
      enum: ["urgent", "normal", "scheduled"],
      default: "normal",
    },
    reason: { type: String, default: "" },

    status: {
      type: String,
      enum: SPARE_REQUEST_STATUSES,
      default: "pending_manager_approval",
      index: true,
    },

    timeline: [
      {
        status: { type: String, required: true },
        at: { type: Date, default: Date.now },
        byId: { type: Schema.Types.ObjectId, ref: "User" },
        note: { type: String, default: "" },
      },
    ],

    managerApproval: {
      approvedById: { type: Schema.Types.ObjectId, ref: "User" },
      at: { type: Date },
      note: { type: String, default: "" },
      decision: { type: String, enum: ["approved", "rejected"], default: undefined },
    },

    warehouseAction: {
      action: { type: String, enum: ["in_stock", "purchase_order"], default: undefined },
      byId: { type: Schema.Types.ObjectId, ref: "User" },
      at: { type: Date },
    },

    poId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },

    deliveredAt: { type: Date },
    installedAt: { type: Date },

    billable: { type: Boolean, default: false },
    billedAmount: { type: Number, default: 0 },

    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

SparePartRequestSchema.index({ branchId: 1, status: 1, createdAt: -1 });
SparePartRequestSchema.index({ technicianId: 1, status: 1 });

export type SparePartRequestDoc = InferSchemaType<typeof SparePartRequestSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SparePartRequest: Model<SparePartRequestDoc> =
  (mongoose.models.SparePartRequest as Model<SparePartRequestDoc>) ||
  mongoose.model<SparePartRequestDoc>("SparePartRequest", SparePartRequestSchema);
