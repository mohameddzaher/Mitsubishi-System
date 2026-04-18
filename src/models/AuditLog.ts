import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AuditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, default: "" },
    userRole: { type: String, default: "" },
    action: { type: String, required: true },
    resource: { type: String, required: true, index: true },
    resourceId: { type: Schema.Types.ObjectId, index: true },
    resourceLabel: { type: String, default: "" },
    oldValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

AuditLogSchema.index({ userId: 1, at: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1, at: -1 });

export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AuditLog: Model<AuditLogDoc> =
  (mongoose.models.AuditLog as Model<AuditLogDoc>) ||
  mongoose.model<AuditLogDoc>("AuditLog", AuditLogSchema);
