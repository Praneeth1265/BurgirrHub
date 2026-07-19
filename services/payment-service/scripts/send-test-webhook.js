// Constructs a genuinely valid Stripe-style signed webhook payload and
// POSTs it straight to the running stack, without needing the Stripe CLI
// or a public URL for Stripe to deliver a real webhook to (useful for
// local/offline development). Signs with the same HMAC-SHA256 scheme
// Stripe itself uses, so this exercises the real signature-verification
// code path in paymentController.js, not a mocked version of it.
//
// Usage:
//   node send-test-webhook.js <webhookSecret> <paymentIntentId> [eventType] [eventId]
//
// Example:
//   node send-test-webhook.js whsec_xxx pi_3AbCdE payment_intent.succeeded
//   node send-test-webhook.js whsec_xxx pi_3AbCdE payment_intent.payment_failed
//
// Get a real paymentIntentId by first calling
// POST /payments/:orderId/intent and reading the "pi_..." prefix off the
// returned clientSecret.
import crypto from "crypto";

const [, , webhookSecret, paymentIntentId, eventType = "payment_intent.succeeded", eventId] =
  process.argv;

if (!webhookSecret || !paymentIntentId) {
  console.error("Usage: node send-test-webhook.js <webhookSecret> <paymentIntentId> [eventType] [eventId]");
  process.exit(1);
}

const payload = JSON.stringify({
  id: eventId || `evt_test_${Date.now()}`,
  object: "event",
  type: eventType,
  data: {
    object: {
      id: paymentIntentId,
      object: "payment_intent",
      status: eventType === "payment_intent.succeeded" ? "succeeded" : "requires_payment_method",
    },
  },
});

const timestamp = Math.floor(Date.now() / 1000);
const signature = crypto
  .createHmac("sha256", webhookSecret)
  .update(`${timestamp}.${payload}`)
  .digest("hex");

const gatewayUrl = process.env.GATEWAY_URL || "http://localhost:8080";

const res = await fetch(`${gatewayUrl}/payments/webhook`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Stripe-Signature": `t=${timestamp},v1=${signature}`,
  },
  body: payload,
});

console.log("HTTP", res.status);
console.log(await res.text());
