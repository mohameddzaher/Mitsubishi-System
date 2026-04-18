import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AnnouncementSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    scope: {
      type: String,
      enum: ["branch", "department", "role", "global"],
      default: "branch",
    },
    scopeValue: { type: String, default: "" },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    priority: {
      type: String,
      enum: ["critical", "high", "normal", "low"],
      default: "normal",
    },
    pinned: { type: Boolean, default: false },
    expiresAt: { type: Date },
    acknowledgedBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
      },
    ],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

AnnouncementSchema.index({ branchId: 1, pinned: -1, createdAt: -1 });

export type AnnouncementDoc = InferSchemaType<typeof AnnouncementSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Announcement: Model<AnnouncementDoc> =
  (mongoose.models.Announcement as Model<AnnouncementDoc>) ||
  mongoose.model<AnnouncementDoc>("Announcement", AnnouncementSchema);
