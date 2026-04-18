import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { INVOICE_STATUSES } from "@/config/constants";

const InvoiceItemSchema = new Schema(
  {
    description: { type: String, required: true },
    qty: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0.15 },
  },
  { _id: true },
);

const InvoiceSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    contractId: { type: Schema.Types.ObjectId, ref: "Contract", index: true },
    workOrderIds: [{ type: Schema.Types.ObjectId, ref: "WorkOrder" }],

    issueDate: { type: Date, required: true, index: true },
    dueDate: { type: Date, required: true, index: true },
    periodStart: { type: Date },
    periodEnd: { type: Date },

    items: [InvoiceItemSchema],
    subtotal: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "SAR" },

    status: { type: String, enum: INVOICE_STATUSES, default: "draft", index: true },

    qrCode: { type: String, default: "" },
    pdfUrl: { type: String, default: "" },

    sentAt: { type: Date },
    viewedAt: { type: Date },
    paidAt: { type: Date },
    voidedAt: { type: Date },
    voidReason: { type: String, default: "" },

    paymentReminders: [
      {
        sentAt: { type: Date, default: Date.now },
        type: { type: String, enum: ["pre_due", "due", "overdue", "final"], default: "pre_due" },
        channel: { type: String, enum: ["email", "sms", "call", "visit"], default: "email" },
        byId: { type: Schema.Types.ObjectId, ref: "User" },
        note: { type: String, default: "" },
      },
    ],

    assignedCollectionOfficerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    agingDays: { type: Number, default: 0 },
    agingBucket: {
      type: String,
      enum: ["current", "1-30", "31-60", "61-90", "90+"],
      default: "current",
      index: true,
    },

    notes: { type: String, default: "" },

    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

InvoiceSchema.index({ branchId: 1, status: 1, dueDate: 1 });
InvoiceSchema.index({ customerId: 1, status: 1 });

export type InvoiceDoc = InferSchemaType<typeof InvoiceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Invoice: Model<InvoiceDoc> =
  (mongoose.models.Invoice as Model<InvoiceDoc>) ||
  mongoose.model<InvoiceDoc>("Invoice", InvoiceSchema);
