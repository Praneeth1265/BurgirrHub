import { Payment } from "../models/payment.js";
import { stripe } from "../utils/stripeClient.js";
import { publishEvent } from "../utils/publisher.js";
import { ErrorHandler } from "../error/error.js";

// Shared by createIntent and confirmDummyUpi: finds the Payment doc for an
// order, or -- if the order.created event hasn't arrived yet (race between
// placing an order and immediately trying to pay for it) -- falls back to a
// synchronous lookup against the Order Service, forwarding the caller's own
// JWT so Order Service's existing RBAC (own order / own branch / admin)
// applies unchanged. No internal-auth bypass.
async function getOrCreatePayment(orderId, authHeader) {
  let payment = await Payment.findOne({ orderId });
  if (payment) return payment;

  const orderRes = await fetch(`${process.env.ORDER_SERVICE_URL}/orders/${orderId}`, {
    headers: { Authorization: authHeader || "" },
  });
  if (!orderRes.ok) {
    throw new ErrorHandler("Order not found or not authorized", orderRes.status === 404 ? 404 : 403);
  }
  const { order } = await orderRes.json();
  return Payment.create({
    orderId: order._id,
    customerId: order.customerId,
    customerEmail: order.customerEmail,
    branch: order.branch,
    amount: order.totalAmount,
    status: "awaiting_payment",
  });
}

// Same three-tier RBAC as Reservation/Order: customer must own it, staff
// must match branch, admin unrestricted.
function assertCanPay(payment, user) {
  if (user.role === "customer" && payment.customerId !== user.sub) {
    throw new ErrorHandler("Not authorized to pay for this order", 403);
  }
  if (user.role === "staff" && payment.branch !== user.branchId) {
    throw new ErrorHandler("Not authorized to pay for this order", 403);
  }
}

export const createIntent = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const payment = await getOrCreatePayment(orderId, req.headers.authorization);
    assertCanPay(payment, req.user);

    if (payment.status === "succeeded") {
      return next(new ErrorHandler("This order has already been paid for", 400));
    }

    // Idempotent: reuse the existing PaymentIntent instead of creating a
    // duplicate charge if the client retries this call (e.g. page refresh
    // mid-checkout).
    let intent;
    if (payment.stripePaymentIntentId) {
      intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
    } else {
      intent = await stripe.paymentIntents.create({
        // Stripe amounts are in the smallest currency unit -- paise, not rupees.
        amount: Math.round(payment.amount * 100),
        currency: payment.currency,
        metadata: { orderId: payment.orderId },
      });
      payment.stripePaymentIntentId = intent.id;
    }

    payment.status = "processing";
    payment.method = "card";
    await payment.save();

    res.status(200).json({ success: true, clientSecret: intent.client_secret });
  } catch (error) {
    next(error);
  }
};

// Fully simulated UPI "gateway" for demo purposes -- there's no real UPI
// integration (that needs an Indian-registered payment aggregator account
// Stripe test mode doesn't give us). This mirrors exactly what a verified
// Stripe webhook does for the card flow: mark the payment succeeded and
// publish payment.succeeded, so Order Service's existing
// paymentEventsConsumer flips the order to "confirmed" the same way either
// way. The frontend is responsible for the fake "processing" delay/UX;
// this endpoint just resolves instantly once called.
export const confirmDummyUpi = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { upiId } = req.body;
    const payment = await getOrCreatePayment(orderId, req.headers.authorization);
    assertCanPay(payment, req.user);

    if (payment.status === "succeeded") {
      return next(new ErrorHandler("This order has already been paid for", 400));
    }

    payment.status = "succeeded";
    payment.method = "upi";
    payment.upiTransactionId = `UPI-DEMO-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    await payment.save();

    publishEvent("payment.succeeded", {
      orderId: payment.orderId,
      customerEmail: payment.customerEmail,
      amount: payment.amount,
    });

    res.status(200).json({
      success: true,
      upiTransactionId: payment.upiTransactionId,
      upiId,
    });
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    // req.body is the raw Buffer here (see server.js -- this route is
    // mounted with express.raw(), before the global express.json()),
    // which is required for the signature check to pass at all.
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const intent = event.data.object;
    const payment = await Payment.findOne({ stripePaymentIntentId: intent.id });

    if (!payment) {
      // Nothing local to reconcile against (e.g. a test event from the
      // Stripe dashboard unrelated to a real order) -- ack anyway so
      // Stripe stops retrying.
      return res.status(200).json({ received: true });
    }

    if (payment.processedWebhookEventIds.includes(event.id)) {
      // Stripe retries webhook deliveries; this makes reprocessing a safe
      // no-op instead of double-firing payment.succeeded/failed.
      return res.status(200).json({ received: true });
    }

    if (event.type === "payment_intent.succeeded") {
      payment.status = "succeeded";
      payment.processedWebhookEventIds.push(event.id);
      await payment.save();
      // customerEmail/amount are included (not just orderId) so the
      // Notification Service can compose a real email without a second
      // lookup -- same denormalize-onto-the-event pattern used everywhere
      // else in this system.
      publishEvent("payment.succeeded", {
        orderId: payment.orderId,
        customerEmail: payment.customerEmail,
        amount: payment.amount,
      });
    } else if (event.type === "payment_intent.payment_failed") {
      payment.status = "failed";
      payment.processedWebhookEventIds.push(event.id);
      await payment.save();
      publishEvent("payment.failed", {
        orderId: payment.orderId,
        customerEmail: payment.customerEmail,
        amount: payment.amount,
      });
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook handling error:", err.message);
    res.status(500).json({ received: false });
  }
};
