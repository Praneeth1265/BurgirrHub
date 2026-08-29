#!/usr/bin/env bash
# Renew the Let's Encrypt cert for a LONG-RUNNING deployment (static IP).
#
# This is the counterpart to redeploy-fresh-ip.sh: that script is for the
# "new IP every restart" demo workflow and gets a brand-new cert each time,
# so expiry never comes up. A permanently-running instance keeps one
# hostname, and its cert dies at 90 days -- taking the whole site down,
# since nginx redirects all HTTP traffic to HTTPS.
#
# Certbot's webroot method can't be used here: nginx.conf serves the
# challenge from /usr/share/nginx/html inside the nginx container, which
# isn't bind-mounted from the host, so certbot on the host can't write
# into it. Briefly stopping nginx and using --standalone sidesteps that.
#
# Install as a weekly cron job (renewal is a no-op until ~30 days before
# expiry, so running it weekly is safe and self-correcting):
#   sudo crontab -e
#   0 3 * * 1 /home/azureuser/BurgirrHUB/services/renew-cert.sh >> /var/log/burgirrhub-renew.log 2>&1

set -euo pipefail
cd "$(dirname "$0")"

echo "--- $(date -u) starting renewal check ---"

# Stop nginx only for the duration of the challenge. Everything else keeps
# serving; only the public entrypoint is down, for a few seconds.
docker compose stop nginx

# `renew` exits 0 and does nothing when the cert isn't near expiry.
sudo certbot renew --standalone --non-interactive

docker compose up -d nginx

echo "--- $(date -u) renewal check complete ---"
