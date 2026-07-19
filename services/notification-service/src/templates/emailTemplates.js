// Deliberately plain -- these exist to prove the event -> email pipeline
// works, not to be a real design system. Each takes the exact payload
// shape the originating service publishes (see each service's
// utils/publisher.js call sites).

export function reservationCreatedEmail(payload) {
  return {
    to: payload.email,
    subject: `Your BurgirrHub reservation at ${payload.branch} is confirmed`,
    html: `
      <h2>Reservation confirmed</h2>
      <p>Branch: ${payload.branch}</p>
      <p>Date: ${payload.date}</p>
      <p>Time: ${payload.time}</p>
      <p>Reservation ID: ${payload.reservationId}</p>
    `,
  };
}

export function orderCreatedEmail(payload) {
  return {
    to: payload.customerEmail,
    subject: `We've received your BurgirrHub order`,
    html: `
      <h2>Order received</h2>
      <p>Order ID: ${payload.orderId}</p>
      <p>Branch: ${payload.branch}</p>
      <p>Total: &#8377;${payload.totalAmount}</p>
      <p>We'll email you again once payment is confirmed.</p>
    `,
  };
}

export function paymentSucceededEmail(payload) {
  return {
    to: payload.customerEmail,
    subject: `Payment confirmed for your BurgirrHub order`,
    html: `
      <h2>Payment successful</h2>
      <p>Order ID: ${payload.orderId}</p>
      <p>Amount: &#8377;${payload.amount}</p>
      <p>Your order is now confirmed and being prepared.</p>
    `,
  };
}

export function paymentFailedEmail(payload) {
  return {
    to: payload.customerEmail,
    subject: `Payment failed for your BurgirrHub order`,
    html: `
      <h2>Payment failed</h2>
      <p>Order ID: ${payload.orderId}</p>
      <p>Amount: &#8377;${payload.amount}</p>
      <p>Your order has been cancelled. Please try again.</p>
    `,
  };
}
