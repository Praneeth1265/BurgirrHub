import amqp from "amqplib";
import { Payment } from "../models/payment.js";

const EXCHANGE = "order.events";
const QUEUE = "payment-service.order-events";

// Pre-populates a local Payment record as soon as an order is placed, so
// creating a Stripe PaymentIntent later (POST /payments/:orderId/intent)
// doesn't need a synchronous call back to the Order Service on the common
// path. If a client asks to pay before this event has propagated, the
// controller falls back to a direct lookup -- this consumer is a
// performance/decoupling optimization, not the only path to correctness.
export async function startOrderEventsConsumer() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672");
  const channel = await conn.createChannel();

  await channel.assertExchange(EXCHANGE, "topic", { durable: true });
  const { queue } = await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(queue, EXCHANGE, "order.created");

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString());
      await Payment.updateOne(
        { orderId: payload.orderId },
        {
          $setOnInsert: {
            orderId: payload.orderId,
            customerId: payload.customerId,
            customerEmail: payload.customerEmail,
            branch: payload.branch,
            amount: payload.totalAmount,
            status: "awaiting_payment",
          },
        },
        { upsert: true }
      );
      channel.ack(msg);
    } catch (err) {
      console.error("Failed to process order.created:", err.message);
      channel.nack(msg, false, false);
    }
  });

  console.log("Payment Service subscribed to order.events (order.created)");
}
