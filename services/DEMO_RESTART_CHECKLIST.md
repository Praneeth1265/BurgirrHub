# Night-before-a-demo restart checklist

This is the routine for the "spin the EC2 instance up only when needed"
workflow — no Elastic IP anymore, so every restart gets a **new public IP**
and needs a few minutes of reconnection/re-cert work before it's demoable.

## 1. Before starting a chat with Claude

- **AWS Console → EC2 → Instances → start the instance.**
- Wait ~30-60s for it to reach "Running", then note its **new Public IPv4
  address** (Instances page, or the instance's Details tab). It will be
  different from last time.
- **AWS Console → EC2 → Security Groups →** the group attached to this
  instance **→ inbound rules → port 22 (SSH)**: make sure the source IP
  allowed is wherever the chat session's shell traffic will come from, not
  last time's IP. If unsure, start the chat first, ask Claude to check its
  current outbound IP (`curl https://checkip.amazonaws.com`), then come back
  and update this rule. Otherwise SSH will silently time out.

## 2. What to tell Claude, at the start of the chat

- The **new public IP** from step 1.
- The **SSH key** lives at `D:\down\burgirrhub.pem` on this machine — just
  point Claude at that path, no need to paste the raw key into chat again.
- SSH user is always **`ubuntu`** (Ubuntu 24.04 LTS on this instance).
- Confirm the contact email for certbot if it's ever not `gpraneeth555@gmail.com`.

## 3. What happens next (Claude does this over SSH)

```bash
cd ~/BurgirrHub/services
CERTBOT_EMAIL=gpraneeth555@gmail.com ./redeploy-fresh-ip.sh
```

This brings the stack up (already-running containers are a no-op),
requests a fresh Let's Encrypt cert for `<new-ip-with-dashes>.sslip.io`,
regenerates `nginx.conf` from `nginx.conf.template`, restarts nginx, and
verifies `https://<hostname>/health` — both from inside the instance and
externally.

If the code itself changed since the last deploy (not just the IP), pull
first and rebuild: `git pull && docker compose up --build -d`, then run
the script above.

## 4. The one step that's NOT automated

**Vercel → BurgirrHub frontend project → Settings → Environment
Variables → `VITE_GATEWAY_URL`** → update to the new
`https://<new-hostname>.sslip.io` printed at the end of the script →
**redeploy** the frontend (Vite bakes env vars in at build time, so just
changing the variable isn't enough — it needs a fresh build).

## 5. After the demo/interview

**AWS Console → EC2 → Instances → Stop instance** (not Terminate — Stop
keeps the instance and its disk, including all the already-built Docker
images, so next time is fast; Terminate deletes it entirely). Stopping is
enough to stop all billing for compute, and there's no Elastic IP anymore
to worry about leaving allocated.

## Notes

- `redeploy-fresh-ip.sh` and `nginx/nginx.conf.template` are currently
  **not committed to git** — they were copied onto the instance directly.
  If they get committed later, step 3 can start with a `git pull` instead
  of relying on them already being there.
- Each restart gets a fresh 90-day Let's Encrypt cert, so certificate
  expiry isn't a concern for this workflow (unlike a permanently-running
  deployment, which would need the renewal reminder mentioned in
  `DEPLOYMENT.md`).
