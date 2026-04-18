import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SparePartSchema = new Schema(
  {
    partNumber: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: [
        "motor",
        "controller",
        "door",
        "safety",
        "cable",
        "sensor",
        "lighting",
        "interior",
        "consumable",
        "electronic",
        "mechanical",
        "other",
      ],
      default: "other",
      index: true,
    },
    compatibleModels: [{ type: String }],
    unitCost: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },

    stockLevel: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 10 },
    maxStock: { type: Number, default: 100 },
    reservedQty: { type: Number, default: 0 },

    warehouseLocation: {
      shelf: { type: String, default: "" },
      bin: { type: String, default: "" },
      zone: { type: String, default: "" },
    },
    supplierIds: [{ type: Schema.Types.ObjectId, ref: "Vendor" }],
    leadTimeDays: { type: Number, default: 7 },
    warrantyMonths: { type: Number, default: 12 },
    unitOfMeasure: { type: String, default: "pcs" },

    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

SparePartSchema.index({ branchId: 1, category: 1 });
SparePartSchema.index({ name: "text", description: "text", partNumber: "text" });

export type SparePartDoc = InferSchemaType<typeof SparePartSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SparePart: Model<SparePartDoc> =
  (mongoose.models.SparePart as Model<SparePartDoc>) ||
  mongoose.model<SparePartDoc>("SparePart", SparePartSchema);
