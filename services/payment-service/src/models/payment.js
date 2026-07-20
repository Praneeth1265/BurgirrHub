import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    // Denormalized from the order.created event (or the synchronous
    // fallback lookup) so ownership/branch checks never need to call back
    // to the Order Service on the hot path of creating a PaymentIntent.
    customerId: { type: String, required: true },
    customerEmail: { type: String, required: true },
    branch: { type: String, required: true },
    amount: { type: Number, required: true }, // rupees, matches Order's totalAmount
    currency: { type: String, default: "inr" },
    stripePaymentIntentId: { type: String, default: null },
    // Set only for the simulated UPI flow (see confirmDummyUpi) -- there's
    // no real UPI gateway involved, this just gives the receipt something
    // that looks like a transaction reference.
    upiTransactionId: { type: String, default: null },
    method: { type: String, enum: ["card", "upi", null], default: null },
    status: {
      type: String,
      // awaiting_payment: order.created consumed, no Stripe intent yet.
      // processing: intent created, waiting on the customer to pay.
      // succeeded / failed: resolved by a verified Stripe webhook (card)
      // or confirmDummyUpi (UPI).
      enum: ["awaiting_payment", "processing", "succeeded", "failed"],
      default: "awaiting_payment",
    },
    // Stripe retries webhook deliveries; recording processed event IDs
    // makes reprocessing a safe no-op instead of double-firing
    // payment.succeeded/failed.
    processedWebhookEventIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
