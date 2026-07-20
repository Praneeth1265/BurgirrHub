import mongoose from "mongoose";

// Field-level validation (length, format, email shape) lives in the zod
// schemas at the route layer, not duplicated here — the old monolith's
// Reservation model and controller both validated the same fields, which
// the Notion design doc flagged as redundant. This schema only enforces
// what the database itself should guarantee.
const reservationSchema = new mongoose.Schema(
  {
    // The signed-in account that made the booking (reservations now
    // require auth -- see createReservation). Distinct from `email` above,
    // which is the contact email typed into the form and may differ (e.g.
    // booking under a different contact than the account holder).
    customerId: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    guests: { type: Number, required: true, min: 1 },
    // References this service's own Branch collection (both live in the
    // same reservation_db). Deliberately NOT a cross-service reference to
    // anything in the Auth Service's database -- see authenticate.js for
    // why staff branch scoping matches on branch *name* instead.
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
  },
  { timestamps: true }
);

export const Reservation = mongoose.model("Reservation", reservationSchema);
