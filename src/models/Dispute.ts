import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const DisputeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },

    raisedById: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    raisedByType: { type: String, enum: ["employee", "customer"], default: "employee" },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", index: true },

    relatedType: {
      type: String,
      enum: [
        "customer",
        "unit",
        "contract",
        "invoice",
        "workorder",
        "payment",
        "vendor",
        "internal",
        "none",
      ],
      default: "none",
    },
    relatedId: { type: Schema.Types.ObjectId },

    category: {
      type: String,
      enum: [
        "customer_complaint",
        "payment_dispute",
        "quality_issue",
        "technician_issue",
        "internal",
        "vendor_issue",
        "other",
      ],
      default: "other",
      index: true,
    },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "investigating", "escalated", "resolved", "closed", "reopened"],
      default: "open",
      index: true,
    },

    currentAssigneeId: { type: Schema.Types.ObjectId, ref: "User", index: true },

    timeline: [
      {
        type: {
          type: String,
          enum: [
            "assigned",
            "forwarded",
            "commented",
            "status_changed",
            "escalated",
            "resolved",
            "reopened",
          ],
          required: true,
        },
        fromUserId: { type: Schema.Types.ObjectId, ref: "User" },
        toUserId: { type: Schema.Types.ObjectId, ref: "User" },
        note: { type: String, default: "" },
        at: { type: Date, default: Date.now },
      },
    ],

    resolutionSummary: { type: String, default: "" },
    rootCause: { type: String, default: "" },
    customerSatisfactionAfter: { type: Number, min: 1, max: 5 },

    slaTargetHours: { type: Number, default: 24 },
    slaDeadlineAt: { type: Date },
    slaBreached: { type: Boolean, default: false },
    resolvedAt: { type: Date },

    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

DisputeSchema.index({ branchId: 1, status: 1, severity: 1, createdAt: -1 });
DisputeSchema.index({ currentAssigneeId: 1, status: 1 });

export type DisputeDoc = InferSchemaType<typeof DisputeSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Dispute: Model<DisputeDoc> =
  (mongoose.models.Dispute as Model<DisputeDoc>) ||
  mongoose.model<DisputeDoc>("Dispute", DisputeSchema);
