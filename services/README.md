# BurgirrHub Microservices (Phase 1–5, roadmap complete)

This is the new microservices architecture described in the [system design doc](https://app.notion.com/p/3a2ad0d3fb30812585a3d82b445fca14), built alongside — not replacing — the existing `Backend/`/`Frontend/` app, which keeps running on Vercel exactly as before.

**Phase 1**: API Gateway + Auth Service (Google OAuth + JWT), plus the Docker Compose skeleton (Mongo, Redis, RabbitMQ) that later phases build on.
**Phase 2**: Reservation Service — ports the existing table-booking logic, adds a proper `Branch` collection (replacing the old plain string enum), staff/admin-only list & delete with per-branch scoping, and publishes a `reservation.created` event to RabbitMQ.
**Phase 3**: Order Service — menu/catalog (seeded), order placement with server-computed pricing (client never gets to say what anything costs), a `pending → confirmed → preparing → ready → completed`/`cancelled` state machine, and an `order.created` event to RabbitMQ. This is the piece that actually makes the "Hub" part of the name real.
**Phase 4**: Payment Service — Stripe PaymentIntents, a verified/idempotent webhook handler, and the RabbitMQ round-trip that closes the loop: Order publishes `order.created` → Payment consumes it and pre-populates a payment record → client requests a PaymentIntent → Stripe confirms via webhook → Payment publishes `payment.succeeded`/`payment.failed` → Order Service consumes that and **automatically** moves the order to `confirmed` or `cancelled`, no staff action needed.
**Phase 5**: Notification Service — the payoff of the whole event-driven design. It consumes `reservation.created`, `order.created`, `payment.succeeded`, and `payment.failed` from all three other services and sends a real email for each, without any of those services knowing it exists. Emails go through an auto-provisioned free [Ethereal](https://ethereal.email) test inbox by default (no signup, no real SMTP credentials needed) — every send gets a browser-viewable preview link.

This closes the roadmap from the [Notion doc](https://app.notion.com/p/3a2ad0d3fb30812585a3d82b445fca14): 5 services + gateway, all wired together, all verified against a real running stack (including real Stripe test-mode API calls and real emails, not mocks).

## Services

| Service | Port (local) | Purpose |
|---|---|---|
| `nginx` | 80 | Reverse proxy — the one entry point in a real deployment |
| `gateway` | 8080 | Routes to services, verifies JWTs, Redis-backed rate limiting, CORS |
| `auth-service` | 4001 | Google OAuth login, JWT issuing/refresh, RBAC |
| `reservation-service` | 4002 | Branches (seeded), table reservations, staff/admin branch-scoped management |
| `order-service` | 4003 | Menu (seeded), order placement/lifecycle, auto-confirms via `payment.events` |
| `payment-service` | 4004 | Stripe PaymentIntents, webhook verification, `payment.events` publisher |
| `notification-service` | 4005 | Consumes all three other services' events, sends email, keeps an audit log |
| `mongo` | 27017 | Shared Mongo instance, one logical DB per service |
| `redis` | 6379 | Backs the gateway's rate limiter |
| `rabbitmq` | 5672 / 15672 (mgmt UI) | `reservation.events`, `order.events`, `payment.events` — all three now have consumers |

## Running locally

1. Get a Google OAuth Client ID (Google Cloud Console → APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application). Add `http://localhost:5173` as an authorized JavaScript origin.
2. `cp .env.example .env` and fill in `JWT_SECRET` (generate one — see the comment in `.env.example`) and `GOOGLE_CLIENT_ID`.
3. `docker-compose up --build`
4. Check everything is up:
   - `curl http://localhost:8080/health` → gateway
   - `curl http://localhost:4001/health` → auth-service directly
   - `curl http://localhost/` → through Nginx (proxies to the gateway)

## Testing the auth flow

`POST /auth/google` needs a real Google ID token (not just the client ID) — get one quickly via [Google's OAuth Playground](https://developers.google.com/oauthplayground) or by wiring up a "Sign in with Google" button on the frontend later. Once you have one:

```bash
curl -X POST http://localhost:8080/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken": "<paste ID token here>"}'
```

This returns an `accessToken` and sets an httpOnly `refreshToken` cookie. Use the access token to call the RBAC demo route:

```bash
curl http://localhost:8080/api/staff/ping -H "Authorization: Bearer <accessToken>"
```

New users default to the `customer` role, so this will 403 until you manually promote a user's `role` to `staff` or `admin` in Mongo. For `staff`, also set `branchId` to an exact branch name (e.g. `"HSR Layout"`) — the Reservation Service scopes staff to that branch (see below):

```bash
docker exec -it burgirrhub-mongo mongosh auth_db --eval 'db.users.updateOne({email:"you@example.com"},{$set:{role:"staff",branchId:"HSR Layout"}})'
```

There's no admin UI for role management yet — that's a natural later addition.

## Testing the Reservation flow

Branches are seeded automatically on first boot (the 6 known BurgirrHub locations). No auth needed to browse or book:

```bash
curl http://localhost:8080/branches
```

```bash
curl -X POST http://localhost:8080/reservations \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Jane","lastName":"Doe","email":"jane@example.com","phone":"9876543210","date":"2026-08-01","time":"19:30","branchId":"<a branch _id from /branches>"}'
```

Listing and deleting reservations requires a `staff` or `admin` access token (see above for promoting a user). Staff only see/delete reservations for the branch on their JWT's `branchId` claim — an HSR Layout staff account gets `403` trying to delete a Koramangala reservation. Admins see and manage everything:

```bash
curl http://localhost:8080/reservations -H "Authorization: Bearer <accessToken>"
curl -X DELETE http://localhost:8080/reservations/<id> -H "Authorization: Bearer <accessToken>"
```

Each successful booking publishes a `reservation.created` message to the `reservation.events` topic exchange in RabbitMQ (visible in the management UI at `:15672`, guest/guest) — the Notification Service (Phase 5) picks this up and sends a confirmation email.

## Testing the Order flow

Menu browsing is public — filter by branch or category with query params:

```bash
curl http://localhost:8080/menu
curl "http://localhost:8080/menu?branch=ITPL"      # includes the one ITPL-exclusive item
curl "http://localhost:8080/menu?category=Burgers"
```

Placing an order requires *any* logged-in role (customer, staff, or admin — order history just needs an account to attach to, unlike the guest-friendly Reservation flow). Only send `menuItemId` + `quantity` per line — price and total are always computed server-side from the current menu, so there's nothing to gain by tampering with a price field client-side (it gets silently stripped before the request even reaches the database logic):

```bash
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" -H "Authorization: Bearer <accessToken>" \
  -d '{"branch":"HSR Layout","items":[{"menuItemId":"<id from /menu>","quantity":2}]}'
```

Listing/viewing orders is scoped by role: customers see only their own orders, staff see only their branch's orders, admins see everything:

```bash
curl http://localhost:8080/orders -H "Authorization: Bearer <accessToken>"
curl http://localhost:8080/orders/<id> -H "Authorization: Bearer <accessToken>"
```

Moving an order through its lifecycle is staff/admin only, and only along valid transitions (`pending→confirmed→preparing→ready→completed`, with `cancelled` reachable from `pending`/`confirmed`) — skipping a step (e.g. `pending` straight to `ready`) is rejected with `400`:

```bash
curl -X PATCH http://localhost:8080/orders/<id>/status \
  -H "Authorization: Bearer <staff-or-admin-accessToken>" -H "Content-Type: application/json" \
  -d '{"status":"confirmed"}'
```

Staff can still do `pending → confirmed` manually via the endpoint above, but from Phase 4 onward the normal path is automatic — see below.

## Testing the Payment flow

1. Get a Stripe **test-mode** secret key: [dashboard.stripe.com](https://dashboard.stripe.com) → sign up (instant, free, test mode needs no business verification) → Developers → API keys → copy the Secret key (`sk_test_...`). Put it in `services/.env` as `STRIPE_SECRET_KEY`.
2. Place an order (see above), then immediately request a PaymentIntent for it — no need to wait, there's a synchronous fallback if the `order.created` event hasn't propagated yet, but in practice it beats you to it:

```bash
curl -X POST http://localhost:8080/payments/<orderId>/intent -H "Authorization: Bearer <accessToken>"
```

Returns `{ "clientSecret": "pi_..._secret_..." }`. Only the order's own customer (or staff on the same branch, or admin) can request this — everyone else gets `403`. Calling it again for the same order reuses the same PaymentIntent rather than creating a duplicate charge.

3. **Confirming the payment** normally happens client-side with Stripe.js/Elements using that `clientSecret` (not built yet — there's no checkout UI in this phase). Stripe then calls our webhook. Since this stack runs on localhost with no public URL, real Stripe webhook delivery can't reach it directly — either run the [Stripe CLI](https://docs.stripe.com/stripe-cli) (`stripe listen --forward-to http://localhost:8080/payments/webhook`, then use its printed `whsec_...` as `STRIPE_WEBHOOK_SECRET`), or use the included test script, which constructs a genuinely valid signed webhook payload without needing either:

```bash
cd payment-service/scripts
node send-test-webhook.js <STRIPE_WEBHOOK_SECRET> <paymentIntentId> payment_intent.succeeded
node send-test-webhook.js <STRIPE_WEBHOOK_SECRET> <paymentIntentId> payment_intent.payment_failed
```

(`paymentIntentId` is the `pi_...` prefix of the `clientSecret` from step 2.) This exercises the real signature-verification code, not a mock — an altered/wrong secret is rejected with `400`.

A successful webhook: marks the Payment `succeeded`, publishes `payment.succeeded` to RabbitMQ, and the Order Service — watching that exchange independently — flips the order to `confirmed` automatically. A `payment_intent.payment_failed` event auto-cancels the order the same way. Resending the identical event (Stripe does this on retry) is a safe no-op — check `processedWebhookEventIds` on the Payment record.

## Testing the Notification flow

Nothing to call directly — this service only reacts to events already flowing from the three flows above. Trigger any of them (book a reservation, place an order, run a test webhook) and check the Notification Service's logs for a line like:

```
Email sent for "order.created" -- preview: https://ethereal.email/message/...
```

Open that URL in a browser to see the actual rendered email. On first boot with no `SMTP_HOST` configured, the service auto-provisions a free Ethereal test inbox and logs its address — same account is reused for every send that session.

To review what's fired without digging through logs, use the audit log (staff/admin only):

```bash
curl http://localhost:8080/notifications -H "Authorization: Bearer <staff-or-admin-accessToken>"
curl "http://localhost:8080/notifications?type=payment.failed" -H "Authorization: Bearer <accessToken>"
```

Each entry records the event type, recipient, subject, delivery status, the Ethereal preview link, and the raw event payload — so a failed send (bad email address, mail server hiccup) is visible and auditable rather than silently swallowed.

## Deploying

Three runbooks, by what the host requires:

- `DEPLOYMENT_RENDER.md` — Render + Atlas + Upstash + CloudAMQP. **No credit card anywhere.**
  Packs the six services into one container (`render/`) since the free plan gives one 512 MB
  web service rather than ten containers. This is what the live deployment runs on.
- `DEPLOYMENT_AZURE.md` — Azure VM on student credit, running `docker-compose.yml` unchanged.
- `DEPLOYMENT.md` — the original AWS EC2 runbook.

## What's not done

The 5-phase roadmap from the Notion doc is complete and everything above has been verified against a live running stack, not just written. What's deliberately still open — matching the "Security recommendations" / "Scaling considerations" sections of the design doc — for whenever this goes further:

- ~~No frontend wired up~~ — **done**. `Frontend/` now talks to the gateway (`src/api/client.js`),
  with Google Sign-In, a Stripe Elements checkout, and a manager dashboard. The old `Backend/`
  monolith is no longer used by anything.
- No automated tests (unit or integration) — everything here was verified by hand against the live containers during development.
- Stock decrement is a read-modify-write (`stock: remaining`) rather than an atomic `$inc`, so
  concurrent orders for the same item can oversell. Not hit in practice at demo traffic, but real.
- Rate limiting, RBAC, and validation exist, but there's no centralized logging/tracing (correlation IDs) across services yet — tracing one customer's request across 5 services currently means checking 5 separate `docker logs`.
- Menu/branch data is seeded, not admin-manageable — there's no CRUD UI or API for staff to add a dish or open a new branch.
