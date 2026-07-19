import mongoose from "mongoose";

// Item name/price are snapshotted at order time -- if the menu price
// changes later, past orders must keep showing what the customer actually
// paid, not today's price. Standard e-commerce pattern.
const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // Identifies the Auth Service user (JWT `sub`) without holding a
    // cross-service foreign key -- Order Service never needs to join
    // back to the User document, just to know who to scope/attribute to.
    customerId: { type: String, required: true },
    customerEmail: { type: String, required: true },
    branch: { type: String, required: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "Order must contain at least one item",
      },
    },
    // Always computed server-side from current MenuItem prices at creation
    // time -- never trust a client-submitted total or per-item price.
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
