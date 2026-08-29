# Free deployment with no credit card (Render + managed free tiers)

`DEPLOYMENT.md` targets AWS EC2 and `DEPLOYMENT_AZURE.md` targets an Azure
VM. Both need a card (Azure indirectly, via a student subscription that can
be awkward to get sizes on). This runbook needs **no card anywhere** — every
service below signs up with just an email.

**This has been validated end to end locally**, not just written: the image
below was built and run under a hard 512 MB cap, and all six services
started, connected to separate databases, seeded (48 menu items, 6
branches), started all three RabbitMQ consumers, and served correct
responses through the Gateway — at **168 MB of 512 MB (33%)**.

## What changes vs. docker-compose

Render's free plan gives **one** web service with 512 MB, not the ten
containers `docker-compose.yml` assumes. So:

| Compose | Render |
|---|---|
| 6 service containers | 1 container, 6 Node processes (`render/start.js`) |
| `mongo` container | MongoDB Atlas M0 (free) |
| `redis` container | Upstash Redis (free) |
| `rabbitmq` container | CloudAMQP Little Lemur (free) |
| `nginx` + certbot | Render terminates TLS for you — no certs to manage |

**No service code changes.** Each process still runs its own
`src/server.js` on its own port; the Gateway proxies over loopback exactly
as it proxies over the Docker network under compose (`gateway/src/config.js`
already defaults to `localhost:4001-4005`). `render/start.js` injects the
per-service `PORT` and `DB_NAME` that Compose used to supply.

Running the six as separate *processes* rather than one is deliberate:
every service calls the global `mongoose.connect()`, so sharing a process
would silently collapse all five databases into whichever connected last.

TLS being handled by Render also removes the 90-day cert renewal chore that
`renew-cert.sh` exists to solve on the VM deployments.

---

## Part 1 — MongoDB Atlas (replaces the `mongo` container)

1. <https://www.mongodb.com/cloud/atlas/register> — sign up, no card.
2. Create a **free M0 cluster** (512 MB, shared). Pick a region near you.
3. **Database Access** → Add New Database User → username + a generated
   password. **Copy the password now**, it is not shown again.
4. **Network Access** → Add IP Address → **Allow access from anywhere**
   (`0.0.0.0/0`). Render's free tier has no static outbound IP, so there is
   nothing narrower to allow-list. The database user password is what
   actually protects this.
5. **Connect** → **Drivers** → copy the connection string. It looks like:

```
mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

Substitute the real password. **Do not** add a database name to the path —
each service supplies its own via `DB_NAME`, exactly as under compose.

## Part 2 — Upstash Redis (replaces the `redis` container)

1. <https://upstash.com> — sign up with GitHub or email, no card.
2. Create a **Redis** database, free tier, region near your Render region.
3. Copy the **`rediss://` connection URL** (note the double `s` — TLS).
   `ioredis` picks up TLS from that scheme automatically, so nothing in
   `gateway/src/middleware/rateLimiter.js` needs changing.

Free tier allows 10,000 commands/day. Only the Gateway's rate limiter uses
Redis, and `/health` is registered *before* the limiter — so the keep-alive
pings in Part 6 cost zero Redis commands.

## Part 3 — CloudAMQP (replaces the `rabbitmq` container)

1. <https://www.cloudamqp.com> — sign up, no card.
2. Create an instance on the **Little Lemur** plan (free).
3. Copy the **AMQP URL** — starts with `amqps://` (TLS). `amqplib` handles
   this scheme natively; no code change.

Little Lemur caps at 100 queued messages and 3 concurrent connections. The
three consumers use exactly 3 — so if you add another service that consumes
events, this is the first thing that will break.

## Part 4 — Google OAuth + Stripe test keys

Both free, no card. Identical to the other runbooks:

- **Google**: <https://console.cloud.google.com> → new project → **OAuth
  consent screen** (External, add yourself as a Test user) → **Credentials**
  → **OAuth client ID** → **Web application**.

  **Authorized JavaScript origins** means the origin the browser-side
  sign-in runs on — that is the *frontend* only. The Render backend URL
  does not belong here; the browser never performs an OAuth redirect
  against it. Enter `http://localhost:5173` now, and add the Vercel URL as
  a second entry after Part 7. Origin only — no trailing slash, no path
  (`https://app.vercel.app`, never `https://app.vercel.app/`). Edits take
  about 5 minutes to propagate.

  Leave **Authorized redirect URIs** empty. The Auth Service verifies
  Google ID tokens (`verifyIdToken`) rather than doing a server-side code
  exchange, so the flow has no redirect leg.
- **Stripe**: <https://dashboard.stripe.com> → stay in **Test mode** →
  **Developers → API keys**. Secret key (`sk_test_…`) for Render,
  publishable key (`pk_test_…`) for Vercel. Test card `4242 4242 4242 4242`.

## Part 5 — The Render web service

1. <https://render.com> → sign up with GitHub, no card.
2. **New** → **Web Service** → connect the `BurgirrHUB` repo.
3. Configure:

| Setting | Value |
|---|---|
| Language / Runtime | **Docker** |
| Root Directory | `services` |
| Dockerfile Path | `render/Dockerfile` |
| Instance Type | **Free** |
| Region | Match your Atlas/Upstash regions if possible |

Render's help text says Dockerfile Path is "relative to the repo root".
It is not — it is resolved relative to **Root Directory**. Entering
`services/render/Dockerfile` alongside a `services` root directory makes
Render look for `services/services/render/Dockerfile` and fail the build
before it starts:

```
error: invalid local: resolve : lstat /opt/render/project/src/services/services: no such file or directory
```

Root Directory still sets the Docker build context to `services/`, which
is what makes the Dockerfile's `COPY auth-service/...` paths resolve.

4. **Environment Variables** — add all of these:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` — **required**, or the refresh cookie never gets `Secure; SameSite=None` and cross-site login from Vercel silently fails |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `MONGO_URI` | Atlas string from Part 1 |
| `REDIS_URL` | Upstash `rediss://…` from Part 2 |
| `RABBITMQ_URL` | CloudAMQP `amqps://…` from Part 3 |
| `GOOGLE_CLIENT_ID` | Part 4 |
| `STRIPE_SECRET_KEY` | Part 4 (`sk_test_…`) |
| `ADMIN_EMAILS` | `hrudhayr6885@gmail.com` — the repo default is `gpraneeth555@gmail.com` alone, so as shipped only he can reach the manager dashboard. Comma-separate to add others |
| `CORS_ORIGIN` | your Vercel URL — placeholder for now, set in Part 7 |

Do **not** set `PORT`. Render injects it, and `start.js` hands it to the
Gateway; overriding it will break routing.

5. **Create Web Service.** First build takes 5–10 minutes.

### Confirming it worked

Render's log stream is prefixed per service. You want to see:

```
[supervisor] started auth-service on port 4001
...
[gateway] API Gateway listening on port 10000
[auth-service] Auth Service connected to MongoDB (db: auth_db)
[order-service] Menu seeded (48 items, idempotent)
[order-service] payment events consumer started
[payment-service] order events consumer started
[notification-service] notification consumer started
```

Three `consumer started` lines is the signal that CloudAMQP is wired up.
A few `retrying in Ns` lines before them are expected and harmless.

Then check from your machine:

```bash
curl https://YOUR-SERVICE.onrender.com/health
```

`{"status":"ok","service":"gateway"}` means you are live.

**If one service crashes, the whole container exits and Render restarts
it.** That is deliberate: `start.js` kills everything if any child dies,
because the alternative is a Gateway that answers `/health` cheerfully
while proxying into a void. If Render shows a crash loop, read the log for
the `[supervisor] <name> exited` line — the service that died is named,
and its stack trace is directly above.

## Part 6 — Keeping it awake

Free Render services **sleep after 15 minutes of inactivity**, and the cold
start is ~50 seconds. That cannot be disabled on the free plan, but an
external pinger avoids it.

1. <https://cron-job.org> — free, no card.
2. Create a cron job hitting `https://YOUR-SERVICE.onrender.com/health`
   **every 10 minutes**.

The budget works out: Render's free tier allows **750 instance-hours per
month**, and a service kept awake continuously uses ~730 (31 × 24). It
fits, but it is the only free service you can afford to keep awake — a
second always-on free service would blow the cap and Render would suspend
both.

`/health` is deliberately the right endpoint to ping: it is registered
before the rate limiter, so pings cost no Upstash commands and cannot
rate-limit real users.

## Part 7 — Frontend on Vercel

Free, no card, sign in with GitHub.

1. <https://vercel.com> → **Add New** → **Project** → import `BurgirrHUB`.
2. **Root Directory**: `Frontend` — the repo root has no app.
3. Framework preset: **Vite** (auto-detected).
4. **Environment Variables**, before the first deploy:

| Name | Value |
|---|---|
| `VITE_GATEWAY_URL` | `https://YOUR-SERVICE.onrender.com` |
| `VITE_GOOGLE_CLIENT_ID` | Part 4 |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Part 4 (`pk_test_…`) |

5. **Deploy**, then copy the `https://….vercel.app` URL.

### Close the loop — all three are required

1. **Render** → `CORS_ORIGIN` → your Vercel URL → save (it redeploys).
   Without this the browser blocks every API call.
2. **Google Console** → Authorized JavaScript origins → add the Vercel URL.
   Without this, Sign-In fails.
3. **Vercel** → redeploy after any `VITE_*` change. Vite inlines these at
   **build** time; editing the variable alone does nothing.

## Part 8 — Verify end to end

1. Open the Vercel URL (first load may take ~50s if it slept).
2. Sign in with Google.
3. Make a reservation.
4. Place an order, pay with `4242 4242 4242 4242`.
5. Manager dashboard: double-click the hero chef image on the homepage —
   only works if your email is in `ADMIN_EMAILS`.

Notification emails go to an auto-provisioned Ethereal test inbox unless
you set real SMTP credentials. Find the preview links in the Render logs:

```
[notification-service] Email sent for "order.created" -- preview: https://ethereal.email/message/...
```

## Known limits of this deployment

Worth knowing before you demo it, and worth saying out loud if you present it:

- **Cold starts.** If the pinger fails, first request takes ~50s.
- **0.1 CPU.** Fine for a demo, slow under any real concurrency.
- **Atlas M0 is 512 MB** and sleeps after long inactivity.
- **CloudAMQP allows 3 connections** — exactly what the current consumers
  use, with none spare.
- **One free service only.** The 750 hour/month cap is account-wide.

If you later get access to any card, `DEPLOYMENT_AZURE.md` or Oracle Cloud
Always Free give a real always-on VM that runs `docker-compose.yml`
unchanged, with none of the above limits.
