import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    openTime: { type: String, required: true }, // "HH:mm"
    closeTime: { type: String, required: true }, // "HH:mm"
    capacity: { type: Number, required: true },
    // Live seat count the manager dashboard can adjust (e.g. reset at the
    // start of each day) -- decremented per reservation's guest count and
    // restored when a reservation is cancelled. Starts equal to capacity.
    availableSeats: { type: Number, required: true },
    contactPhone: { type: String, required: true },
  },
  { timestamps: true }
);

export const Branch = mongoose.model("Branch", branchSchema);
