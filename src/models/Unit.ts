import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { UNIT_STATUSES, UNIT_TYPES } from "@/config/constants";

const UnitSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    serialNumber: { type: String, default: "", index: true },

    model: { type: String, required: true },
    type: { type: String, enum: UNIT_TYPES, required: true, index: true },
    capacity: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
    floorsServed: { type: Number, default: 0 },
    travelDistance: { type: Number, default: 0 },
    doorType: { type: String, default: "" },
    controlSystem: { type: String, default: "" },

    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    addressLabel: { type: String, default: "Main" },
    location: {
      building: { type: String, default: "" },
      floor: { type: String, default: "" },
      notes: { type: String, default: "" },
      latitude: { type: Number },
      longitude: { type: Number },
    },

    currentStatus: {
      type: String,
      enum: UNIT_STATUSES,
      default: "operational",
      index: true,
    },
    activeContractId: { type: Schema.Types.ObjectId, ref: "Contract" },

    installedAt: { type: Date },
    warrantyStart: { type: Date },
    warrantyEnd: { type: Date },
    lastServiceAt: { type: Date, index: true },
    nextServiceDue: { type: Date, index: true },

    photos: [
      {
        url: String,
        caption: String,
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
    documents: [
      {
        type: { type: String, default: "manual" },
        url: String,
        name: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    qrCode: { type: String, unique: true, sparse: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

UnitSchema.index({ customerId: 1, currentStatus: 1 });
UnitSchema.index({ branchId: 1, nextServiceDue: 1 });

export type UnitDoc = InferSchemaType<typeof UnitSchema> & { _id: mongoose.Types.ObjectId };

export const Unit: Model<UnitDoc> =
  (mongoose.models.Unit as Model<UnitDoc>) || mongoose.model<UnitDoc>("Unit", UnitSchema);
