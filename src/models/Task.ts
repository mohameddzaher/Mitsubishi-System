import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const TaskSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    assignerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assigneeIds: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],

    priority: {
      type: String,
      enum: ["urgent", "high", "normal", "low"],
      default: "normal",
      index: true,
    },
    dueDate: { type: Date, index: true },
    dueTime: { type: String, default: "" },

    status: {
      type: String,
      enum: ["todo", "in_progress", "pending_review", "blocked", "done", "cancelled"],
      default: "todo",
      index: true,
    },

    relatedType: {
      type: String,
      enum: [
        "customer",
        "unit",
        "contract",
        "invoice",
        "workorder",
        "quotation",
        "opportunity",
        "dispute",
        "none",
      ],
      default: "none",
    },
    relatedId: { type: Schema.Types.ObjectId },
    relatedLabel: { type: String, default: "" },

    subtasks: [
      {
        title: { type: String, required: true },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date },
        completedById: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true },
        attachments: [
          { url: String, name: String, type: String, size: Number },
        ],
        createdAt: { type: Date, default: Date.now },
      },
    ],
    attachments: [
      { url: String, name: String, type: String, size: Number },
    ],

    followUps: [
      {
        byUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        toUserId: { type: Schema.Types.ObjectId, ref: "User" },
        note: { type: String, default: "" },
        at: { type: Date, default: Date.now },
        nextReminderAt: { type: Date },
      },
    ],

    departmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },

    completedAt: { type: Date },
    completedById: { type: Schema.Types.ObjectId, ref: "User" },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

TaskSchema.index({ branchId: 1, status: 1, dueDate: 1 });
TaskSchema.index({ assigneeIds: 1, status: 1 });

export type TaskDoc = InferSchemaType<typeof TaskSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Task: Model<TaskDoc> =
  (mongoose.models.Task as Model<TaskDoc>) || mongoose.model<TaskDoc>("Task", TaskSchema);
