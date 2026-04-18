import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { UserRole } from "@/config/roles";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    passwordHash: { type: String, required: true },
    employeeId: { type: String, unique: true, sparse: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    avatar: { type: String, default: "" },

    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      index: true,
    },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    managerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    teamIds: [{ type: Schema.Types.ObjectId, ref: "Team" }],

    status: {
      type: String,
      enum: ["active", "suspended", "terminated", "pending"],
      default: "active",
      index: true,
    },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    lastActivityAt: { type: Date },
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
    },

    preferences: {
      theme: { type: String, enum: ["dark", "light"], default: "dark" },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },
      language: { type: String, default: "en" },
      timezone: { type: String, default: "Asia/Riyadh" },
    },
    permissions: [
      {
        resource: String,
        action: String,
        scope: String,
      },
    ],
    linkedCustomerId: { type: Schema.Types.ObjectId, ref: "Customer" },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

UserSchema.index({ role: 1, branchId: 1 });
UserSchema.index({ managerId: 1, status: 1 });
UserSchema.index({ departmentId: 1, status: 1 });

UserSchema.virtual("fullName").get(function (this: { firstName: string; lastName: string }) {
  return `${this.firstName} ${this.lastName}`.trim();
});

UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

export type UserDoc = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
  fullName: string;
};

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ||
  mongoose.model<UserDoc>("User", UserSchema);
