import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const NoteSchema = new Schema(
  {
    title: { type: String, default: "" },
    body: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    relatedType: {
      type: String,
      enum: [
        "customer",
        "unit",
        "contract",
        "invoice",
        "workorder",
        "technician",
        "visit",
        "general",
      ],
      default: "general",
    },
    relatedId: { type: Schema.Types.ObjectId, index: true },
    visibility: {
      type: String,
      enum: ["private", "team", "department", "branch"],
      default: "team",
    },
    pinned: { type: Boolean, default: false },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

NoteSchema.index({ relatedType: 1, relatedId: 1, createdAt: -1 });

export type NoteDoc = InferSchemaType<typeof NoteSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Note: Model<NoteDoc> =
  (mongoose.models.Note as Model<NoteDoc>) || mongoose.model<NoteDoc>("Note", NoteSchema);
