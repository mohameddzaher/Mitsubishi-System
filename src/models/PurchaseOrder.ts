import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const POItemSchema = new Schema(
  {
    partId: { type: Schema.Types.ObjectId, ref: "SparePart" },
    partNumber: { type: String, default: "" },
    description: { type: String, required: true },
    qty: { type: Number, default: 1 },
    receivedQty: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: true },
);

const PurchaseOrderSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    linkedSparePartRequestId: { type: Schema.Types.ObjectId, ref: "SparePartRequest" },

    items: [POItemSchema],
    subtotal: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: "SAR" },

    status: {
      type: String,
      enum: [
        "draft",
        "pending_approval",
        "approved",
        "sent",
        "partially_received",
        "received",
        "cancelled",
      ],
      default: "draft",
      index: true,
    },

    expectedDeliveryAt: { type: Date },
    receivedAt: { type: Date },

    approvals: [
      {
        level: { type: Number, default: 1 },
        approverId: { type: Schema.Types.ObjectId, ref: "User" },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        at: { type: Date },
        note: { type: String, default: "" },
      },
    ],

    requestedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notes: { type: String, default: "" },

    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

PurchaseOrderSchema.index({ branchId: 1, status: 1, createdAt: -1 });

export type PurchaseOrderDoc = InferSchemaType<typeof PurchaseOrderSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PurchaseOrder: Model<PurchaseOrderDoc> =
  (mongoose.models.PurchaseOrder as Model<PurchaseOrderDoc>) ||
  mongoose.model<PurchaseOrderDoc>("PurchaseOrder", PurchaseOrderSchema);
