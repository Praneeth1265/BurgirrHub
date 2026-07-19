import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["customer", "staff", "admin"],
      default: "customer",
    },
    branchId: { type: String, default: null },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
