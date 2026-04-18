import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PaymentSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["bank_transfer", "cheque", "cash", "credit_card", "stc_pay", "mada"],
      required: true,
    },
    reference: { type: String, default: "" },
    receivedAt: { type: Date, default: Date.now, index: true },
    receivedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiptUrl: { type: String, default: "" },
    notes: { type: String, default: "" },
    reconciled: { type: Boolean, default: false },
    reconciledAt: { type: Date },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type PaymentDoc = InferSchemaType<typeof PaymentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Payment: Model<PaymentDoc> =
  (mongoose.models.Payment as Model<PaymentDoc>) ||
  mongoose.model<PaymentDoc>("Payment", PaymentSchema);
