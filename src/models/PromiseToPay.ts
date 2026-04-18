import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PromiseToPaySchema = new Schema(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    collectionOfficerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    promisedDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["active", "kept", "broken", "cancelled"],
      default: "active",
      index: true,
    },
    note: { type: String, default: "" },
    evaluatedAt: { type: Date },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
  },
  { timestamps: true },
);

export type PromiseToPayDoc = InferSchemaType<typeof PromiseToPaySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PromiseToPay: Model<PromiseToPayDoc> =
  (mongoose.models.PromiseToPay as Model<PromiseToPayDoc>) ||
  mongoose.model<PromiseToPayDoc>("PromiseToPay", PromiseToPaySchema);
