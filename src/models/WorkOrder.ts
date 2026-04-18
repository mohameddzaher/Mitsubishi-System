import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { PRIORITIES, WO_STATUSES, WO_TYPES } from "@/config/constants";

const ChecklistItemSchema = new Schema(
  {
    itemId: { type: String, required: true },
    label: { type: String, required: true },
    category: { type: String, default: "general" },
    required: { type: Boolean, default: true },
    completed: { type: Boolean, default: false },
    issue: { type: Boolean, default: false },
    notes: { type: String, default: "" },
  },
  { _id: true },
);

const PhotoSchema = new Schema(
  {
    url: { type: String, required: true },
    thumbUrl: { type: String, default: "" },
    caption: { type: String, default: "" },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: true },
);

const WorkOrderSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: WO_TYPES, required: true, index: true },
    priority: { type: String, enum: PRIORITIES, default: "medium", index: true },
    status: { type: String, enum: WO_STATUSES, default: "scheduled", index: true },

    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    unitId: { type: Schema.Types.ObjectId, ref: "Unit", required: true, index: true },
    contractId: { type: Schema.Types.ObjectId, ref: "Contract", index: true },

    technicianId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    secondaryTechnicianId: { type: Schema.Types.ObjectId, ref: "User" },
    supervisorId: { type: Schema.Types.ObjectId, ref: "User" },
    dispatchedById: { type: Schema.Types.ObjectId, ref: "User" },

    scheduledDate: { type: Date, required: true, index: true },
    scheduledTime: { type: String, default: "09:00" },
    expectedDurationMinutes: { type: Number, default: 60 },

    actualStartAt: { type: Date },
    actualEndAt: { type: Date },
    actualDurationMinutes: { type: Number },
    durationVarianceMinutes: { type: Number },

    startLocation: {
      lat: { type: Number },
      lng: { type: Number },
      accuracy: { type: Number },
    },
    endLocation: {
      lat: { type: Number },
      lng: { type: Number },
      accuracy: { type: Number },
    },

    checklist: [ChecklistItemSchema],
    beforePhotos: [PhotoSchema],
    afterPhotos: [PhotoSchema],

    sparePartRequestIds: [{ type: Schema.Types.ObjectId, ref: "SparePartRequest" }],

    technicianNotes: { type: String, default: "" },
    supervisorNotes: { type: String, default: "" },
    customerSignature: { type: String, default: "" },
    customerSignedByName: { type: String, default: "" },
    technicianSignedAt: { type: Date },

    customerFeedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, default: "" },
      submittedAt: { type: Date },
      submittedFromPortal: { type: Boolean, default: false },
    },

    emergencyDetails: {
      reportedAt: { type: Date },
      reportedByName: { type: String, default: "" },
      reportedByPhone: { type: String, default: "" },
      entrapmentInvolved: { type: Boolean, default: false },
      peopleAffected: { type: Number, default: 0 },
      description: { type: String, default: "" },
    },

    slaTargetMinutes: { type: Number },
    slaDeadlineAt: { type: Date },
    slaMet: { type: Boolean, default: null },

    cancellationReason: { type: String, default: "" },
    rescheduledFromWorkOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder" },
    followUpRequired: { type: Boolean, default: false },

    pdfReportUrl: { type: String, default: "" },

    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

WorkOrderSchema.index({ technicianId: 1, scheduledDate: 1 });
WorkOrderSchema.index({ branchId: 1, status: 1, scheduledDate: -1 });
WorkOrderSchema.index({ customerId: 1, createdAt: -1 });
WorkOrderSchema.index({ status: 1, scheduledDate: 1 });

export type WorkOrderDoc = InferSchemaType<typeof WorkOrderSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WorkOrder: Model<WorkOrderDoc> =
  (mongoose.models.WorkOrder as Model<WorkOrderDoc>) ||
  mongoose.model<WorkOrderDoc>("WorkOrder", WorkOrderSchema);
