import amqp from "amqplib";

const EXCHANGE = "order.events";
let channelPromise = null;

async function getChannel() {
  if (!channelPromise) {
    channelPromise = (async () => {
      const conn = await amqp.connect(process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672");
      const channel = await conn.createChannel();
      await channel.assertExchange(EXCHANGE, "topic", { durable: true });
      return channel;
    })();
  }
  return channelPromise;
}

// Fire-and-forget, same pattern as the Reservation Service's publisher.
// Nothing consumes "order.created" yet -- the Payment Service (Phase 4)
// will be the first consumer. Publishing failures must never fail the
// order request itself.
export async function publishEvent(routingKey, payload) {
  try {
    const channel = await getChannel();
    channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
      contentType: "application/json",
      persistent: true,
    });
  } catch (err) {
    channelPromise = null;
    console.error(`Failed to publish "${routingKey}":`, err.message);
  }
}
