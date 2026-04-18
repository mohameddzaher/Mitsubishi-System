import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const BranchSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, index: true },
    city: { type: String, required: true },
    region: { type: String, default: "Makkah Province" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    managerId: { type: Schema.Types.ObjectId, ref: "User" },
    workingHours: {
      sat_thu: { type: String, default: "08:00-17:00" },
      friday: { type: String, default: "Closed" },
    },
    holidays: [{ type: String }],
    latitude: { type: Number },
    longitude: { type: Number },
    isHeadquarters: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type BranchDoc = InferSchemaType<typeof BranchSchema> & { _id: mongoose.Types.ObjectId };

export const Branch: Model<BranchDoc> =
  (mongoose.models.Branch as Model<BranchDoc>) ||
  mongoose.model<BranchDoc>("Branch", BranchSchema);
