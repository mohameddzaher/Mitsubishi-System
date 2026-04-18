import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const VendorSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    contactName: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    taxNumber: { type: String, default: "" },
    paymentTerms: { type: String, default: "Net 30" },
    rating: { type: Number, default: 4, min: 1, max: 5 },
    avgLeadTimeDays: { type: Number, default: 7 },
    activeStatus: { type: Boolean, default: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type VendorDoc = InferSchemaType<typeof VendorSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Vendor: Model<VendorDoc> =
  (mongoose.models.Vendor as Model<VendorDoc>) ||
  mongoose.model<VendorDoc>("Vendor", VendorSchema);
