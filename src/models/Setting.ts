import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SettingSchema = new Schema(
  {
    key: { type: String, required: true, index: true },
    value: { type: Schema.Types.Mixed },
    scope: {
      type: String,
      enum: ["global", "branch", "user", "department"],
      default: "global",
    },
    scopeId: { type: Schema.Types.ObjectId },
    description: { type: String, default: "" },
  },
  { timestamps: true },
);

SettingSchema.index({ key: 1, scope: 1, scopeId: 1 }, { unique: true });

export type SettingDoc = InferSchemaType<typeof SettingSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Setting: Model<SettingDoc> =
  (mongoose.models.Setting as Model<SettingDoc>) ||
  mongoose.model<SettingDoc>("Setting", SettingSchema);
