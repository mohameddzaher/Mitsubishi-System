import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    headId: { type: Schema.Types.ObjectId, ref: "User" },
    parentId: { type: Schema.Types.ObjectId, ref: "Department" },
    description: { type: String, default: "" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

DepartmentSchema.index({ branchId: 1, code: 1 }, { unique: true });

export type DepartmentDoc = InferSchemaType<typeof DepartmentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Department: Model<DepartmentDoc> =
  (mongoose.models.Department as Model<DepartmentDoc>) ||
  mongoose.model<DepartmentDoc>("Department", DepartmentSchema);
