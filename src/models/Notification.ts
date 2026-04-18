import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "task_assigned",
        "task_due",
        "task_overdue",
        "task_commented",
        "dispute_raised",
        "dispute_forwarded",
        "dispute_resolved",
        "visit_scheduled",
        "visit_started",
        "visit_completed",
        "visit_rated",
        "spare_approval_needed",
        "spare_approved",
        "spare_ready",
        "invoice_overdue",
        "invoice_paid",
        "contract_expiring",
        "lead_assigned",
        "mention",
        "kpi_alert",
        "system",
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    link: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["critical", "high", "normal", "low"],
      default: "normal",
    },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    entityType: { type: String, default: "" },
    entityId: { type: Schema.Types.ObjectId },

    readAt: { type: Date, default: null, index: true },
    archivedAt: { type: Date, default: null },

    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export type NotificationDoc = InferSchemaType<typeof NotificationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Notification: Model<NotificationDoc> =
  (mongoose.models.Notification as Model<NotificationDoc>) ||
  mongoose.model<NotificationDoc>("Notification", NotificationSchema);
