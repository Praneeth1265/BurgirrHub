# BurgirrHub

A restaurant reservation and ordering platform, built as six Node microservices behind an API
gateway and tied together by a RabbitMQ event bus.

Customers browse a menu, book tables, order food, and pay by card. Staff and managers get a
branch-scoped dashboard for reservations, orders, and stock. The interesting part isn't the
features — it's that paying for an order confirms it with no service calling another service
directly, and no staff action.

**Live:** [burgirr-hub.vercel.app](https://burgirr-hub.vercel.app) ·
**API:** [burgirrhub-1.onrender.com/health](https://burgirrhub-1.onrender.com/health)

> Hosted on free tiers, so the API sleeps when idle — the first request after a quiet spell can
> take up to a minute to wake it.

---

## Architecture

```
                    Browser (React / Vercel)
                              |
                            HTTPS
                              v
                        API Gateway  ──────────  Redis
              verify JWT · RBAC · rate limit · CORS   (rate-limit counters)
                              |
        ┌───────────┬─────────┼─────────┬──────────────┐
        v           v         v         v              v
      Auth     Reservation  Order    Payment    Notification
     auth_db  reservation_db order_db payment_db notification_db
        |           |         |  ^      |  ^           ^
        |           └─────────┼──┼──────┼──┼───────────┤
        |                     v  |      v  |           |
        └──────────────►  RabbitMQ topic exchanges ─────┘
                     reservation.events · order.events · payment.events
```

Two paths through the system:

- **Synchronous** — every browser request enters through one gateway, which verifies the JWT and
  applies coarse role checks *before* proxying. No service re-implements authentication, and the
  frontend only ever talks to one origin.
- **Asynchronous** — services publish events without knowing who consumes them. Order Service
  publishes `order.created` and doesn't care whether nobody or three services are listening.

That decoupling is what let the Notification Service be added last, subscribing to events from
three existing services without a line changing in any of them.

### The payment flow

The flow worth reading the code for:

1. Order Service prices the order server-side, saves it `pending`, publishes `order.created`.
2. Payment Service consumes that and pre-creates a payment record.
3. Frontend requests a PaymentIntent; Stripe.js confirms the card in the browser.
4. Stripe calls our webhook. The signature is verified against the **raw** request body, the
   payment is marked succeeded, and `payment.succeeded` is published.
5. Order Service consumes that event and advances the order `pending → confirmed` — automatically.

Delete the Payment Service entirely and orders still get placed. They just never leave `pending`.

---

## Services

| Service | Port | Owns | Publishes | Consumes |
|---|---|---|---|---|
| `gateway` | 8080 | routing, JWT verification, RBAC, rate limiting, CORS | — | — |
| `auth-service` | 4001 | users, roles, Google OAuth, token issuing | — | — |
| `reservation-service` | 4002 | branches, table bookings | `reservation.created` | — |
| `order-service` | 4003 | menu, orders, status state machine | `order.created` | `payment.*` |
| `payment-service` | 4004 | Stripe intents, payment records, webhooks | `payment.succeeded` / `.failed` | `order.created` |
| `notification-service` | 4005 | transactional email, delivery audit log | — | all four events |

Supporting containers: `mongo` (one instance, one logical database per service), `redis`
(rate-limit counters), `rabbitmq`, and `nginx` as the public entry point in a VM deployment.

## Tech

**Backend** — Node 20, Express, Mongoose/MongoDB, RabbitMQ (`amqplib`), Redis (`ioredis`),
`jsonwebtoken`, `google-auth-library`, Stripe, Nodemailer, Zod for request validation, Helmet.

**Frontend** — React 18, Vite, React Router 6, Axios, Stripe.js via `@stripe/react-stripe-js`.

**Infrastructure** — Docker, Docker Compose, Nginx, Let's Encrypt.

---

## Repository layout

```
BurgirrHUB/
├── Frontend/              React app (Vite) — the live frontend
├── services/              the microservices stack
│   ├── gateway/           API gateway
│   ├── auth-service/
│   ├── reservation-service/
│   ├── order-service/
│   ├── payment-service/
│   ├── notification-service/
│   ├── nginx/             reverse proxy config for VM deployments
│   ├── render/            single-container build for free-tier hosting
│   ├── docker-compose.yml
│   └── .env.example
└── Backend/               legacy monolith — superseded, kept for reference
```

`Backend/` is the original Express + Mongoose monolith the project started as. The frontend no
longer talks to it; everything now goes through the gateway. It is kept only as history.

---

## Running locally

You need Docker, and a Google OAuth client ID (free — Google Cloud Console → APIs & Services →
Credentials → OAuth client ID → Web application, with `http://localhost:5173` as an authorized
JavaScript origin).

```bash
git clone https://github.com/Praneeth1265/BurgirrHUB.git
cd BurgirrHUB/services
cp .env.example .env
```

Fill in `JWT_SECRET` and `GOOGLE_CLIENT_ID` in `.env` (generate a secret with the command in the
file's comments), then:

```bash
docker compose up --build -d
```

Ten containers start. Confirm the stack is healthy:

```bash
curl http://localhost:8080/health
docker compose logs order-service payment-service notification-service | grep consumer
```

You want `{"status":"ok","service":"gateway"}` and three `consumer started` lines. A few
`retrying in Ns` lines before them are expected — the services boot faster than RabbitMQ accepts
connections, so they back off and retry.

Then start the frontend:

```bash
cd ../Frontend
npm install
```

Create `Frontend/.env`:

```
VITE_GATEWAY_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

```bash
npm run dev
```

Menu and branch data seed themselves on first boot. Payments need a Stripe **test-mode** secret
key in `services/.env`; the test card is `4242 4242 4242 4242` with any future expiry and CVC.

### Roles

New accounts default to `customer`. Add your email to `ADMIN_EMAILS` in `services/.env` to get the
manager dashboard — the check runs on every login, so adding yourself later works without touching
the database. Staff accounts are scoped to one branch and only see that branch's reservations and
orders.

### Emails

With no SMTP configured, the Notification Service provisions a free
[Ethereal](https://ethereal.email) test inbox on first send and logs a preview URL for every email:

```bash
docker compose logs notification-service | grep -i preview
```

---

## Deploying

Three documented paths, depending on what you can sign up for:

| Runbook | Target | Needs a card? |
|---|---|---|
| [`services/DEPLOYMENT_RENDER.md`](services/DEPLOYMENT_RENDER.md) | Render + Atlas + Upstash + CloudAMQP | No |
| [`services/DEPLOYMENT_AZURE.md`](services/DEPLOYMENT_AZURE.md) | Azure VM + Docker Compose | No (student credit) |
| [`services/DEPLOYMENT.md`](services/DEPLOYMENT.md) | AWS EC2 + Docker Compose | Yes |

The VM runbooks run `docker-compose.yml` unchanged. The Render path packs the six services into
one container (`services/render/`) because the free plan gives one 512 MB web service rather than
ten containers — measured footprint is 168 MB. No service code differs between them.

---

## Known limitations

Honest list, roughly by how much they'd matter in production:

- **Lost-update race in stock decrement.** Order placement reads stock, subtracts in application
  code, and writes back an absolute value, so concurrent orders can oversell. It needs an atomic
  `$inc` with the quantity check moved into the query filter.
- **No automated tests.** Everything was verified by hand against running containers.
- **No correlation IDs.** Tracing one request across five services means reading five logs.
- **Symmetric JWT signing.** Gateway and services share one HS256 secret, so any service can mint
  tokens rather than only verify them. RS256 with a public verification key is the fix.
- **No refresh-token revocation.** Logout clears the cookie, but the token stays valid until it
  expires.
- **No dead-letter queue.** Malformed messages are discarded rather than requeued — deliberate,
  since retrying them would loop forever, but they should be kept for inspection.
- **Shared Mongo instance.** Database-per-service logically, one server physically.
