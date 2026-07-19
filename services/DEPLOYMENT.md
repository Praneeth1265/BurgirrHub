# Deploying the BurgirrHub microservices stack

The existing `Backend/`/`Frontend/` app is unaffected by any of this — it keeps deploying to Vercel exactly as today. This runbook is only for the new `services/` stack (Gateway, Auth Service, and later Reservation/Order/Payment/Notification).

## Primary target: AWS EC2 (free tier) + Docker Compose + Nginx

### 1. Launch the instance

- EC2 console → Launch instance → Ubuntu Server 22.04 LTS → **t2.micro** or **t3.micro** (free tier eligible).
- Create or reuse a key pair for SSH.
- Security group inbound rules:
  - `22` (SSH) — restrict to your IP if possible.
  - `80` (HTTP) — `0.0.0.0/0`.
  - `443` (HTTPS) — `0.0.0.0/0`, only needed once you set up TLS with a real domain.
  - Leave `8080`, `4001`, `27017`, `6379`, `5672`, `15672` **closed** to the public — only Nginx (80/443) should be internet-facing; everything else talks over the internal Docker network.

### 2. Install Docker on the instance

```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Run docker without sudo
sudo usermod -aG docker $USER
# log out and back in for this to take effect
```

### 3. Deploy

```bash
git clone https://github.com/Praneeth1265/BurgirrHub.git
cd BurgirrHub/services

cp .env.example .env
nano .env   # fill in JWT_SECRET, GOOGLE_CLIENT_ID, CORS_ORIGIN (your real frontend URL)

docker compose up --build -d
docker compose ps        # confirm all containers are Up
curl http://localhost/   # should reach the gateway through Nginx
```

From outside: `http://<EC2_PUBLIC_IP>/health` should hit the gateway.

### 4. (Optional) HTTPS with a real domain

Point your domain's A record at the EC2 instance's public IP, then:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
# Nginx here is containerized, so install certbot on the HOST and either:
#  (a) run a temporary host-level Nginx just for the cert issuance, or
#  (b) use the standalone/webroot certbot plugin against the containerized Nginx,
#      mounting the challenge directory as a volume.
# This is the one step genuinely easier outside Docker; see certbot docs for
# the "webroot" plugin pattern if you want to keep everything containerized.
```

### 5. Updating a deployment

```bash
cd BurgirrHub/services
git pull
docker compose up --build -d
```

### 6. Costs / free tier notes

- `t2.micro`/`t3.micro` + 30GB EBS is within the AWS free tier for 12 months on a new account.
- Running 5 containers (mongo, redis, rabbitmq, gateway, auth-service) plus Nginx on a 1GB-RAM `t2.micro` is tight — fine for a portfolio demo, but watch memory with `docker stats` if you add more services in later phases. Bumping to `t3.small` is the first lever if it gets tight.

## Fallback: Render

If EC2 free-tier limits become a problem, the same Dockerfiles work on Render's Docker-based web services without modification:

1. Push this repo to GitHub (already done — `Praneeth1265/BurgirrHub`).
2. In Render: New → Web Service → connect the repo → set the root directory to `services/gateway` (and separately `services/auth-service` as a second service) → Render detects the `Dockerfile` automatically.
3. Add a managed Render Redis instance and a MongoDB Atlas connection string (Render doesn't offer managed Mongo) instead of the `mongo`/`redis` containers from `docker-compose.yml`.
4. Set the same environment variables from `.env.example` in each service's Render dashboard.
5. RabbitMQ isn't offered as a Render add-on — for Phase 4 (Payment Service), use CloudAMQP's free tier instead if deploying here rather than EC2.

Render is simpler to get live but less representative of "real" cloud infrastructure — keep it as the backup story, not the primary one.
