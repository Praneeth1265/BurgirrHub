import amqp from "amqplib";

const EXCHANGE = "reservation.events";
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

// Fire-and-forget: nothing consumes "reservation.created" yet (that's the
// Notification Service, Phase 5), so this just publishes to a topic
// exchange with no bound queue -- the message is dropped, which is
// expected and fine. Failures here must never fail the reservation
// request itself; notifications are a secondary concern.
export async function publishEvent(routingKey, payload) {
  try {
    const channel = await getChannel();
    channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
      contentType: "application/json",
      persistent: true,
    });
  } catch (err) {
    channelPromise = null; // retry a fresh connection next time
    console.error(`Failed to publish "${routingKey}":`, err.message);
  }
}
