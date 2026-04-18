import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const QUOTATION_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
  "revised",
] as const;

const QuotationItemSchema = new Schema(
  {
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["installation", "amc", "spare_part", "modernization", "inspection", "other"],
      default: "other",
    },
    qty: { type: Number, default: 1, min: 0 },
    unitPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: true },
);

const QuotationSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    opportunityId: { type: Schema.Types.ObjectId, ref: "Opportunity" },
    version: { type: Number, default: 1 },

    status: { type: String, enum: QUOTATION_STATUSES, default: "draft", index: true },
    contractType: { type: String, default: "amc_comprehensive" },

    // Provenance — set when the quotation was auto-created from another flow
    // (e.g. a technician's approved spare-part request after a visit).
    source: {
      type: String,
      enum: ["manual", "spare_part_request", "service_sale"],
      default: "manual",
    },
    sourceWorkOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder" },
    sourceSparePartRequestIds: [{ type: Schema.Types.ObjectId, ref: "SparePartRequest" }],

    items: [QuotationItemSchema],
    subtotal: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    validUntil: { type: Date },
    sentAt: { type: Date },
    viewedAt: { type: Date },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, default: "" },

    pdfUrl: { type: String, default: "" },
    notes: { type: String, default: "" },
    terms: { type: String, default: "Payment terms: Net 30. Validity: 30 days." },

    preparedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

QuotationSchema.index({ customerId: 1, status: 1 });
QuotationSchema.index({ branchId: 1, status: 1, createdAt: -1 });

export type QuotationDoc = InferSchemaType<typeof QuotationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Quotation: Model<QuotationDoc> =
  (mongoose.models.Quotation as Model<QuotationDoc>) ||
  mongoose.model<QuotationDoc>("Quotation", QuotationSchema);
