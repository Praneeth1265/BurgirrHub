import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    openTime: { type: String, required: true }, // "HH:mm"
    closeTime: { type: String, required: true }, // "HH:mm"
    capacity: { type: Number, required: true },
    contactPhone: { type: String, required: true },
  },
  { timestamps: true }
);

export const Branch = mongoose.model("Branch", branchSchema);
