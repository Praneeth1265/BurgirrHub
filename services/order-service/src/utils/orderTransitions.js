// "confirmed" is normally reached automatically once the Payment Service
// exists (Phase 4 onward, consuming payment.succeeded) -- staff can still
// move an order through the same state machine manually via PATCH
// /orders/:id/status (useful for demoing, or handling edge cases payment
// doesn't cover). Both the HTTP controller and the RabbitMQ payment-events
// consumer share this single source of truth for valid transitions.
export const ALLOWED_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
};

export function canTransition(currentStatus, nextStatus) {
  return (ALLOWED_TRANSITIONS[currentStatus] || []).includes(nextStatus);
}
