import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { config } from "../config.js";
import { authLimiter, globalLimiter } from "../middleware/rateLimiter.js";
import { verifyJwt, requireRole } from "../middleware/verifyJwt.js";

const router = Router();

function proxyTo(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    // Express strips the matched router path from req.url before this
    // middleware sees it, so without this the proxy forwards to the wrong
    // path on the downstream service. req.originalUrl still has the full
    // incoming path (learned the hard way validating Phase 1).
    pathRewrite: (path, req) => req.originalUrl,
  });
}

const authProxy = proxyTo(config.authServiceUrl);
const reservationProxy = proxyTo(config.reservationServiceUrl);
const orderProxy = proxyTo(config.orderServiceUrl);
const paymentProxy = proxyTo(config.paymentServiceUrl);
const notificationProxy = proxyTo(config.notificationServiceUrl);

// --- Auth Service ---
// Stricter rate limit on login/refresh specifically (checked before the
// broader /auth rule below, since Express matches route registration order).
router.use("/auth/google", authLimiter, authProxy);
router.use("/auth/refresh", authLimiter, authProxy);
router.use("/auth", globalLimiter, authProxy);

// --- Reservation Service ---
// Creating a reservation stays public/anonymous, matching the current
// app's UX (no customer accounts exist). Listing and deleting are
// staff/admin only, checked here (coarse-grained, saves a hop to a
// service that would reject anyway) and again inside the Reservation
// Service itself (fine-grained, per-branch ownership) -- defense in
// depth per the Notion LLD design.
router.post("/reservations", globalLimiter, reservationProxy);
router.get("/reservations", globalLimiter, verifyJwt, requireRole("staff", "admin"), reservationProxy);
router.delete("/reservations/:id", globalLimiter, verifyJwt, requireRole("staff", "admin"), reservationProxy);
router.get("/branches", globalLimiter, reservationProxy);
router.get("/branches/:id", globalLimiter, reservationProxy);
// Seat-availability edits from the manager dashboard's Availability tab.
router.patch("/branches/:id", globalLimiter, verifyJwt, requireRole("staff", "admin"), reservationProxy);

// --- Order Service ---
// Menu browsing is public. Placing/viewing orders just needs to be logged
// in as *someone* (customer, staff, or admin) -- fine-grained scoping (own
// orders only / own branch only) happens inside the service. Changing an
// order's status is staff/admin only, checked here and again in-service.
router.get("/menu", globalLimiter, orderProxy);
router.get("/menu/:id", globalLimiter, orderProxy);
router.post("/orders", globalLimiter, verifyJwt, orderProxy);
router.get("/orders", globalLimiter, verifyJwt, orderProxy);
router.get("/orders/:id", globalLimiter, verifyJwt, orderProxy);
router.patch("/orders/:id/status", globalLimiter, verifyJwt, requireRole("staff", "admin"), orderProxy);
// Stock/availability/price edits from the manager dashboard's Availability tab.
router.patch("/menu/:id", globalLimiter, verifyJwt, requireRole("staff", "admin"), orderProxy);

// --- Payment Service ---
// Creating a PaymentIntent needs the caller logged in (ownership is
// enforced inside the service). The Stripe webhook is the one deliberate
// exception to every pattern above: no JWT (Stripe doesn't have one to
// send), no rate limiting (Stripe retries on failure and that's expected
// traffic, not abuse), and critically no body parsing anywhere in this
// chain -- the Gateway never calls express.json() at all, so the raw
// bytes Stripe signed reach the Payment Service completely untouched.
router.post("/payments/:orderId/intent", globalLimiter, verifyJwt, paymentProxy);
// Fully simulated UPI confirmation (no real gateway) -- same auth
// requirement as creating a Stripe intent, just a different settlement path.
router.post("/payments/:orderId/confirm-dummy-upi", globalLimiter, verifyJwt, paymentProxy);
router.post("/payments/webhook", paymentProxy);

// --- Notification Service ---
// Read-only audit log of what was emailed and when -- staff/admin only,
// like the other management-style endpoints. Nothing ever calls this
// service synchronously to trigger a send; it only reacts to events.
router.get("/notifications", globalLimiter, verifyJwt, requireRole("staff", "admin"), notificationProxy);

// Demo route proving JWT verification + RBAC work end-to-end at the gateway.
router.get("/api/staff/ping", verifyJwt, requireRole("staff", "admin"), (req, res) => {
  res.json({ success: true, message: `pong, ${req.user.role}` });
});

export default router;
