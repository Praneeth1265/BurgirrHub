import mongoose from "mongoose";

// This service intentionally has almost no other state -- per the Notion
// design doc, Notification Service "owns" no real domain data, it just
// reacts to events from the other three. This log exists purely as an
// audit trail / demo aid (so you can verify what fired without grepping
// container logs), not as something anything else reads or depends on.
const notificationLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["reservation.created", "order.created", "payment.succeeded", "payment.failed"],
      required: true,
    },
    recipientEmail: { type: String, required: true },
    subject: { type: String, required: true },
    status: { type: String, enum: ["sent", "failed"], required: true },
    previewUrl: { type: String, default: null },
    payload: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const NotificationLog = mongoose.model("NotificationLog", notificationLogSchema);
