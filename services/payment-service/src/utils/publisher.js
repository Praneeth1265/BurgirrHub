import amqp from "amqplib";

const EXCHANGE = "payment.events";
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

// The Order Service consumes "payment.succeeded"/"payment.failed" to
// auto-transition an order out of "pending". Failures here must never
// break the webhook response to Stripe -- we've already durably recorded
// the outcome in this service's own DB before publishing.
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
