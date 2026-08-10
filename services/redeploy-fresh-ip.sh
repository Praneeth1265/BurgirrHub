#!/usr/bin/env bash
# Run this ON THE EC2 INSTANCE after starting it and getting a fresh public
# IP (no Elastic IP -- this is specifically for the "spin up the night
# before a demo, tear down after" workflow, so the IP is expected to be
# different every time).
#
# What it does, in order:
#   1. Brings up all containers except nginx (safe no-op if already
#      running via the `restart: unless-stopped` policy after a reboot).
#   2. Stops nginx (frees port 80 for certbot; also clears any crash-loop
#      from a previous run's now-stale cert path).
#   3. Gets a fresh Let's Encrypt cert for <new-ip>.sslip.io.
#   4. Regenerates nginx.conf from nginx.conf.template with the new
#      hostname, then starts nginx.
#   5. Prints the HTTPS URL and a reminder to update Vercel's env var --
#      that part is NOT automated here, Vite bakes it in at build time.
#
# Usage: CERTBOT_EMAIL=you@example.com ./redeploy-fresh-ip.sh

set -euo pipefail
cd "$(dirname "$0")"

: "${CERTBOT_EMAIL:?Set CERTBOT_EMAIL=you@example.com before running (certbot requires a contact email in non-interactive mode)}"

PUBLIC_IP=$(curl -s https://checkip.amazonaws.com)
HOSTNAME="${PUBLIC_IP//./-}.sslip.io"
echo "Public IP: $PUBLIC_IP"
echo "Hostname:  $HOSTNAME"

echo "--- Bringing up core services ---"
docker compose up -d mongo redis rabbitmq auth-service reservation-service order-service payment-service notification-service gateway

echo "--- Freeing port 80 for the certbot standalone challenge ---"
docker compose stop nginx || true

if ! command -v certbot >/dev/null 2>&1; then
  echo "--- Installing certbot ---"
  sudo apt-get update -y
  sudo apt-get install -y certbot
fi

echo "--- Requesting cert for $HOSTNAME ---"
sudo certbot certonly --standalone -d "$HOSTNAME" --non-interactive --agree-tos -m "$CERTBOT_EMAIL"

echo "--- Regenerating nginx.conf from template ---"
sed "s/YOUR_DOMAIN/$HOSTNAME/g" nginx/nginx.conf.template > nginx/nginx.conf

echo "--- Starting nginx ---"
docker compose up -d nginx

sleep 2
echo "--- Verifying ---"
curl -sf "https://$HOSTNAME/health" && echo "OK: gateway reachable over HTTPS"

cat <<EOF

================================================================
Backend is live at: https://$HOSTNAME

Next (not automated by this script):
  Update Vercel's VITE_GATEWAY_URL (or equivalent) env var to
  https://$HOSTNAME and trigger a redeploy -- Vite bakes this in
  at build time, so the frontend won't pick up a changed backend
  URL just because the backend changed.
================================================================
EOF
