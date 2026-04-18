import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const OPPORTUNITY_STAGES = [
  "new",
  "contacted",
  "qualified",
  "site_survey",
  "quotation_prepared",
  "quotation_sent",
  "negotiation",
  "won",
  "lost",
  "on_hold",
] as const;

const OpportunitySchema = new Schema(
  {
    code: { type: String, unique: true, sparse: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    title: { type: String, required: true },

    stage: {
      type: String,
      enum: OPPORTUNITY_STAGES,
      default: "new",
      index: true,
    },
    dealType: {
      type: String,
      enum: ["amc", "installation", "modernization", "repair", "upgrade"],
      default: "amc",
    },
    value: { type: Number, default: 0 },
    probability: { type: Number, default: 20, min: 0, max: 100 },
    expectedCloseDate: { type: Date, index: true },
    actualCloseDate: { type: Date },

    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    lossReason: { type: String, default: "" },
    lostToCompetitor: { type: String, default: "" },

    activities: [
      {
        type: {
          type: String,
          enum: ["call", "email", "meeting", "site_visit", "demo", "note", "whatsapp"],
          required: true,
        },
        notes: { type: String, default: "" },
        date: { type: Date, default: Date.now },
        durationMinutes: { type: Number, default: 0 },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        outcome: { type: String, default: "" },
      },
    ],

    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

OpportunitySchema.index({ ownerId: 1, stage: 1 });
OpportunitySchema.index({ branchId: 1, stage: 1, expectedCloseDate: 1 });

export type OpportunityDoc = InferSchemaType<typeof OpportunitySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Opportunity: Model<OpportunityDoc> =
  (mongoose.models.Opportunity as Model<OpportunityDoc>) ||
  mongoose.model<OpportunityDoc>("Opportunity", OpportunitySchema);
