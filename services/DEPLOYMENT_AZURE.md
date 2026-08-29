# Always-on free deployment (Azure for Students)

`DEPLOYMENT.md` targets AWS EC2 and the "spin up the night before a demo,
tear down after" workflow. This doc is the alternative: a **permanently
running, free** deployment on a single VM, sized to survive 5-6 months on
student credit, running the same `docker-compose.yml` unchanged.

Why Azure for Students: it is the one major provider that grants credit
(**$100, 12 months**) on academic-email verification with **no credit card
at all**. Fallbacks if verification fails are at the bottom.

Total time: about 90 minutes, most of it waiting on Azure and Let's Encrypt.

---

## Before you start: push the local fixes

The deployment does a `git clone`, so anything not pushed will not be on
the server. Confirm the working tree is clean and pushed before Part 4.

---

## Part 1 — Azure for Students account

1. Go to <https://azure.microsoft.com/free/students>.
2. **Start free** → sign in with a Microsoft account (create one if needed
   — this is a Microsoft account, not the Azure subscription).
3. When asked for your academic email, use **pes2ug23cs226@pes.pesu.edu**.
   Verification is usually instant; if it asks for proof instead, upload a
   student ID or fee receipt and expect a 1-2 day wait.
4. You should land on a subscription named **Azure for Students** with
   **$100** credit. No card is requested at any point — if a screen asks
   for one, you are in the normal free-trial flow, not the student one.
   Back out and start again from the `/free/students` link.

## Part 2 — Create the VM

Portal → **Virtual machines** → **Create** → **Azure virtual machine**.

| Field | Value |
|---|---|
| Region | Central India (or nearest — lower latency for your demo) |
| Image | **Ubuntu Server 24.04 LTS** |
| Size | **B1ms** (1 vCPU, 2 GB RAM) |
| Authentication | **SSH public key** |
| Username | `azureuser` |
| SSH key | Generate new key pair, name it `burgirrhub` |
| Disk | Standard **HDD** (cheapest; plenty for this) |
| Public inbound ports | Allow **SSH (22)**, **HTTP (80)**, **HTTPS (443)** |

**Size matters here.** B1ms at ~$15/mo gives ~6 months on $100. B1s
(1 GB) is ~half that and stretches to ~10 months, but 1 GB is genuinely
tight for 10 containers — `DEPLOYMENT.md` flags the same risk on
t2.micro. Take B1ms unless you need the extra runway.

Azure pre-selects something like `Standard_D2s_v3` (2 vcpu / 8 GiB,
**~$77/mo**) by default. That is not a candidate — it would exhaust the
whole $100 credit in about five weeks. Always click **See all sizes** and
search for `B1ms` rather than accepting the default.

### If the size shows "NotAvailableForSubscription"

Azure for Students does not get the full size catalogue, and whole
families (D-series in particular) are blocked in many regions. This is an
offer restriction, not a temporary capacity shortage — waiting will not
help.

1. **See all sizes** → search `B1ms` → pick **Standard_B1ms**. Keep the
   **x64** architecture selected; Arm64 B-series has patchier student
   availability and buys nothing here.
2. If B-series is unavailable in your region too, change **Basics →
   Region** instead of hunting for another size. In order of preference:
   **Southeast Asia** (~40-60 ms from India), then **East US** or
   **Central US** (~250 ms — fine for a demo, and the best availability).

Student subscriptions are usually quota-limited to a few regions, so
switching region resolves this faster than trying other sizes.

Before clicking Create, check the displayed monthly price is roughly
**$13-16**. Above ~$20 and the credit will not stretch to six months.

When you click Create, the browser downloads **`burgirrhub.pem` once and
only once**. Save it somewhere permanent, then lock it down:

```bash
chmod 600 ~/Downloads/burgirrhub.pem
```

### Give it a static IP

Portal → your VM → **Networking** → click the **Network interface** →
**IP configurations** → `ipconfig1` → Public IP address → **Static** → Save.

This is what makes the deployment "always on": a dynamic IP changes on
every stop/start and would invalidate the TLS cert and the frontend's API
URL each time. Note the IP down — everything below refers to it as
`<VM_IP>`.

## Part 3 — Install Docker

```bash
ssh -i ~/Downloads/burgirrhub.pem azureuser@<VM_IP>
```

Then on the VM:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and back in for the group change to apply, then check `docker ps`
runs without `sudo`.

### Add swap

2 GB is workable but has no headroom, and an out-of-memory kill on Mongo
or RabbitMQ is the most likely way this deployment falls over unattended.
Swap costs nothing and turns a hard crash into a slowdown:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Part 4 — Clone and configure

```bash
git clone https://github.com/Praneeth1265/BurgirrHUB.git
cd BurgirrHUB/services
cp .env.example .env
nano .env
```

Set these — the rest of the defaults are correct for Docker Compose:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` — **required**, or the refresh-token cookie never gets `Secure; SameSite=None` and cross-site login from Vercel silently fails |
| `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` — or any long random string |
| `CORS_ORIGIN` | Your Vercel URL (Part 7). Leave the placeholder for now, come back to it |
| `ADMIN_EMAILS` | `hrudhayr6885@gmail.com` — it defaults to `gpraneeth555@gmail.com` alone, so as written only he gets the manager dashboard. Comma-separate to add others |
| `GOOGLE_CLIENT_ID` | From Part 5 |
| `STRIPE_SECRET_KEY` | From Part 6 |

Then bring it up:

```bash
docker compose up --build -d
docker compose ps
```

First build takes 5-10 minutes on a B1ms. All 10 containers should read
`Up`. Check the event consumers connected:

```bash
docker compose logs order-service payment-service notification-service | grep consumer
```

You want three `... consumer started` lines. A few `retrying in Ns`
lines before them are expected and harmless — that is the consumers
waiting for RabbitMQ to finish booting.

## Part 5 — Google OAuth client

Google Sign-In is the only way into the app, so this is not optional.

1. <https://console.cloud.google.com> → create a project (free, no card).
2. **APIs & Services** → **OAuth consent screen** → External → fill in the
   app name and your email → add yourself as a **Test user**.
3. **Credentials** → **Create Credentials** → **OAuth client ID** →
   **Web application**.
4. **Authorized JavaScript origins** — add both:
   - `http://localhost:5173`
   - your Vercel URL from Part 7 (come back and add it once you have it)
5. Copy the client ID into `GOOGLE_CLIENT_ID` in `services/.env` **and**
   `VITE_GOOGLE_CLIENT_ID` in Vercel. They must match.

Google rejects plain `http://` origins for anything but localhost, which
is why Part 6's HTTPS step is mandatory rather than a nicety.

## Part 6 — Stripe test keys

<https://dashboard.stripe.com> → sign up (free) → stay in **Test mode** →
**Developers** → **API keys**.

- **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY` in `services/.env`
- **Publishable key** (`pk_test_...`) → `VITE_STRIPE_PUBLISHABLE_KEY` in Vercel

Leave `STRIPE_WEBHOOK_SECRET` at its placeholder unless you set up real
webhook forwarding. Test card: `4242 4242 4242 4242`, any future expiry,
any CVC.

## Part 7 — HTTPS

`sslip.io` turns your IP into a real hostname with no signup: `20.40.60.80`
becomes `20-40-60-80.sslip.io`. The existing script does the whole dance —
despite the name, it works perfectly for a first-time static setup:

```bash
cd ~/BurgirrHUB/services
CERTBOT_EMAIL=hrudhayr6885@gmail.com ./redeploy-fresh-ip.sh
```

It detects the public IP, gets a Let's Encrypt cert, regenerates
`nginx.conf` from the template with your hostname, and restarts nginx.
It prints your HTTPS URL at the end. Verify from your own machine:

```bash
curl https://<VM_IP-with-dashes>.sslip.io/health
```

You want `{"status":"ok","service":"gateway"}`.

### Automate renewal — do not skip this

Certs expire after 90 days. Since nginx redirects all HTTP to HTTPS, an
expired cert takes the entire site down, and it would happen around month
3 of a 5-6 month deployment, most likely while you are not looking.

```bash
sudo crontab -e
```

Add (adjust the path if your clone is elsewhere):

```
0 3 * * 1 /home/azureuser/BurgirrHUB/services/renew-cert.sh >> /var/log/burgirrhub-renew.log 2>&1
```

Weekly is deliberate: `certbot renew` does nothing until ~30 days before
expiry, so a weekly run is a cheap no-op that self-corrects if one run is
missed. Confirm the plumbing works now rather than in three months:

```bash
sudo /home/azureuser/BurgirrHUB/services/renew-cert.sh
```

It should stop nginx, report "Cert not yet due for renewal", and bring
nginx back.

## Part 8 — Frontend on Vercel

Free, no card, sign in with GitHub.

1. <https://vercel.com> → **Add New** → **Project** → import `BurgirrHUB`.
2. **Root Directory**: `Frontend` — this matters, the repo root has no app.
3. Framework preset: **Vite** (auto-detected). Leave build settings alone.
4. **Environment Variables**, before the first deploy:

| Name | Value |
|---|---|
| `VITE_GATEWAY_URL` | `https://<VM_IP-with-dashes>.sslip.io` |
| `VITE_GOOGLE_CLIENT_ID` | from Part 5 |
| `VITE_STRIPE_PUBLISHABLE_KEY` | from Part 6 |

5. **Deploy**, then copy the resulting `https://....vercel.app` URL.

### Close the loop

Three things still point at placeholders. All three matter:

1. **`CORS_ORIGIN` in `services/.env`** → set to the Vercel URL, then
   `docker compose up -d` on the VM to apply. Without this the browser
   blocks every API call.
2. **Google Console** → Authorized JavaScript origins → add the Vercel URL.
   Without this, Sign-In fails.
3. **Redeploy the frontend** in Vercel after any `VITE_*` change. Vite
   inlines these at **build** time — editing the variable alone does
   nothing until a fresh build.

## Part 9 — Verify end to end

1. Open the Vercel URL.
2. Sign in with Google.
3. Make a reservation.
4. Place an order, pay with `4242 4242 4242 4242`.
5. Manager dashboard: double-click the hero chef image on the homepage
   (the hidden entry point) — works only if your email is in
   `ADMIN_EMAILS`.

If something fails, the gateway sees all traffic and is the fastest place
to look:

```bash
docker compose logs -f gateway
docker compose logs --tail=50 auth-service
```

Notification emails go to a free auto-provisioned Ethereal inbox unless
you set real SMTP credentials. The preview URL for each "sent" email is
printed in the logs:

```bash
docker compose logs notification-service | grep -i preview
```

## Managing the credit

- Portal → **Cost Management** → **Budgets** → set an alert at $50 and
  $80 so you find out before the credit runs dry rather than after.
- The VM bills whenever it is **running**, regardless of traffic. If you
  hit a gap where you do not need it, **Stop (deallocate)** it — billing
  for compute stops, and the static IP and disk survive.
- Credit expires **12 months** after activation regardless of use.

## If Azure verification fails

1. **GitHub Student Developer Pack** (<https://education.github.com/pack>)
   → DigitalOcean **$200 / 12 months**. Same VM steps; a $6-12/mo droplet
   lasts well over a year. Note DigitalOcean may still ask for a card for
   identity verification even with credit applied.
2. **Oracle Cloud Always Free** — free *forever*, and far better hardware
   (up to 4 ARM cores / 24 GB RAM). Requires a card for identity
   verification (not charged), and ARM capacity can be hard to get in
   busy regions.
3. **Google Cloud** — `e2-micro` in `us-west1`/`us-central1`/`us-east1` is
   always free, but 1 GB RAM means swap is mandatory, not optional. Card
   required for verification.
