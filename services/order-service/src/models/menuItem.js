import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    // Broad cuisine grouping used for menu browsing/filtering (Burgers,
    // Sides, Beverages, Desserts, Italian, Chinese...) -- separate from
    // `category` since a cuisine like Italian spans multiple categories
    // (Mains, Starters, Desserts).
    cuisine: { type: String, default: "American" },
    imageUrl: { type: String, default: "" },
    isAvailable: { type: Boolean, default: true },
    // Empty array = available at every branch. Non-empty = only listed
    // branches. Keeps the common case (available everywhere) simple to seed.
    branches: { type: [String], default: [] },
    calories: { type: Number, default: null },
    ingredients: { type: [String], default: [] },
    isVeg: { type: Boolean, default: true },
    // Surfaced on the homepage "Popular Dishes" section.
    isPopular: { type: Boolean, default: false },
    // null = unlimited/untracked stock, governed only by isAvailable.
    // A number is decremented per order and auto-flips isAvailable off at 0
    // -- see Order Service's createOrder.
    stock: { type: Number, default: null },
  },
  { timestamps: true }
);

export const MenuItem = mongoose.model("MenuItem", menuItemSchema);
