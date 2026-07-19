import amqp from "amqplib";
import { Order } from "../models/order.js";
import { canTransition } from "../utils/orderTransitions.js";

const EXCHANGE = "payment.events";
const QUEUE = "order-service.payment-events";

// Both the Payment Service and this consumer assert the same exchange
// idempotently -- whichever service starts first declares it, the other
// just confirms it already matches. Standard practice when two services
// share a topic exchange but neither strictly "owns" it.
export async function startPaymentEventsConsumer() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672");
  const channel = await conn.createChannel();

  await channel.assertExchange(EXCHANGE, "topic", { durable: true });
  const { queue } = await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(queue, EXCHANGE, "payment.succeeded");
  await channel.bindQueue(queue, EXCHANGE, "payment.failed");

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const routingKey = msg.fields.routingKey;
      const { orderId } = JSON.parse(msg.content.toString());

      const order = await Order.findById(orderId);
      if (!order) {
        console.warn(`payment event for unknown order ${orderId}, discarding`);
        return channel.ack(msg);
      }

      const nextStatus = routingKey === "payment.succeeded" ? "confirmed" : "cancelled";

      if (!canTransition(order.status, nextStatus)) {
        // Not an error -- e.g. staff already manually confirmed/cancelled
        // it, or this is a duplicate delivery after the order moved on.
        console.log(`Order ${orderId} already "${order.status}", ignoring "${routingKey}"`);
        return channel.ack(msg);
      }

      order.status = nextStatus;
      await order.save();
      console.log(`Order ${orderId} -> "${nextStatus}" via "${routingKey}"`);
      channel.ack(msg);
    } catch (err) {
      console.error("Failed to process payment event:", err.message);
      // Discard rather than requeue -- a malformed message will never
      // succeed on retry, and requeueing it would loop forever.
      channel.nack(msg, false, false);
    }
  });

  console.log("Order Service subscribed to payment.events (succeeded/failed)");
}
