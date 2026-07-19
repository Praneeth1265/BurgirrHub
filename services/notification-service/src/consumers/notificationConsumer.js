import amqp from "amqplib";
import { NotificationLog } from "../models/notificationLog.js";
import { sendEmail } from "../utils/mailer.js";
import {
  reservationCreatedEmail,
  orderCreatedEmail,
  paymentSucceededEmail,
  paymentFailedEmail,
} from "../templates/emailTemplates.js";

const QUEUE = "notification-service.events";

// This is the one consumer that fans in from all three other services'
// exchanges -- Reservation, Order, and Payment each publish independently
// and have no idea Notification Service exists. That decoupling is the
// entire point of Phase 5: none of the other services had to change to
// gain email notifications, this service just started listening.
const BINDINGS = [
  { exchange: "reservation.events", routingKey: "reservation.created", template: reservationCreatedEmail },
  { exchange: "order.events", routingKey: "order.created", template: orderCreatedEmail },
  { exchange: "payment.events", routingKey: "payment.succeeded", template: paymentSucceededEmail },
  { exchange: "payment.events", routingKey: "payment.failed", template: paymentFailedEmail },
];

export async function startNotificationConsumer() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672");
  const channel = await conn.createChannel();

  const { queue } = await channel.assertQueue(QUEUE, { durable: true });

  for (const binding of BINDINGS) {
    await channel.assertExchange(binding.exchange, "topic", { durable: true });
    await channel.bindQueue(queue, binding.exchange, binding.routingKey);
  }

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    const routingKey = msg.fields.routingKey;
    const binding = BINDINGS.find((b) => b.routingKey === routingKey);

    if (!binding) {
      console.warn(`No template for routing key "${routingKey}", discarding`);
      return channel.ack(msg);
    }

    let payload;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch (err) {
      console.error("Malformed event payload, discarding:", err.message);
      return channel.nack(msg, false, false);
    }

    const emailContent = binding.template(payload);
    let status = "sent";
    let previewUrl = null;

    try {
      const result = await sendEmail(emailContent);
      previewUrl = result.previewUrl;
      if (previewUrl) {
        console.log(`Email sent for "${routingKey}" -- preview: ${previewUrl}`);
      }
    } catch (err) {
      // A failed send is still logged (status: "failed") rather than
      // thrown -- losing a notification is not worth retry-looping RabbitMQ
      // over, and the log entry is enough to notice and investigate later.
      status = "failed";
      console.error(`Failed to send email for "${routingKey}":`, err.message);
    }

    try {
      await NotificationLog.create({
        type: routingKey,
        recipientEmail: emailContent.to,
        subject: emailContent.subject,
        status,
        previewUrl,
        payload,
      });
    } catch (err) {
      console.error("Failed to write notification log:", err.message);
    }

    channel.ack(msg);
  });

  console.log("Notification Service subscribed to reservation.events, order.events, payment.events");
}
