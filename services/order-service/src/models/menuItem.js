import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    isAvailable: { type: Boolean, default: true },
    // Empty array = available at every branch. Non-empty = only listed
    // branches. Keeps the common case (available everywhere) simple to seed.
    branches: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const MenuItem = mongoose.model("MenuItem", menuItemSchema);
