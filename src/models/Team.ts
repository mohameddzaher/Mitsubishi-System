import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const TeamSchema = new Schema(
  {
    name: { type: String, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true, index: true },
    leaderId: { type: Schema.Types.ObjectId, ref: "User" },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type TeamDoc = InferSchemaType<typeof TeamSchema> & { _id: mongoose.Types.ObjectId };

export const Team: Model<TeamDoc> =
  (mongoose.models.Team as Model<TeamDoc>) || mongoose.model<TeamDoc>("Team", TeamSchema);
