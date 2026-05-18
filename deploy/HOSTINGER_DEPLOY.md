# JLT Fragrances – Hostinger VPS Deployment Guide

**Target VPS:** Ubuntu 22.04 LTS @ `187.127.170.21`  
**Domain:** `https://www.jltfragrances.com`  
**Stack:** FastAPI + React + MongoDB + Nginx + Let's Encrypt SSL  
**Estimated time:** 25–40 minutes

---

## STEP 0 — Point Your Domain to the VPS (do this FIRST)

In your domain registrar (or Hostinger DNS):

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A    | `@`  | `187.127.170.21` | 3600 |
| A    | `www`| `187.127.170.21` | 3600 |

DNS can take 10–60 minutes to propagate. Check with:
```bash
nslookup www.jltfragrances.com
```
Move to Step 1 only after both `jltfragrances.com` and `www.jltfragrances.com` resolve to `187.127.170.21`.

---

## STEP 1 — SSH into Your VPS

From your laptop (Mac/Linux Terminal or Windows PowerShell):
```bash
ssh root@187.127.170.21
```
Enter the root password from Hostinger's welcome email.

---

## STEP 2 — Initial Server Setup (run as root)

Copy & paste this whole block:

```bash
# Update OS
apt update && apt upgrade -y

# Install required packages
apt install -y curl git nginx ufw build-essential software-properties-common \
  python3 python3-pip python3-venv gnupg ca-certificates

# Node.js 20 (for React build)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g yarn

# MongoDB 7.0
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" \
  | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update && apt install -y mongodb-org
systemctl enable --now mongod

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

Verify:
```bash
node --version    # v20.x
python3 --version # 3.10.x
mongod --version  # 7.0.x
systemctl status mongod | head -5
```

---

## STEP 3 — Upload the Code

You have two options. **Option A (GitHub) is recommended.**

### Option A: Push from Emergent to GitHub, then clone on VPS

1. **On Emergent**: Click the "Save to GitHub" button in your workspace (top toolbar) → create a new repo named `jlt-fragrances`. Once pushed, **on your VPS**:

```bash
cd /var/www
git clone https://github.com/<your-username>/jlt-fragrances.git jlt
cd /var/www/jlt
ls   # should show: backend/, frontend/, deploy/
```

### Option B: Direct upload via SCP from your laptop

If you've downloaded the code zip from Emergent:
```bash
# From your laptop:
scp -r /path/to/jlt-fragrances root@187.127.170.21:/var/www/jlt
```

---

## STEP 4 — Configure Production Environment Variables

```bash
# Backend .env
cat > /var/www/jlt/backend/.env <<'EOF'
MONGO_URL="mongodb://localhost:27017"
DB_NAME="jlt_fragrances_prod"
CORS_ORIGINS="https://www.jltfragrances.com,https://jltfragrances.com"
JWT_SECRET="278a5335ebf4235645db46f37c6fb4ee5d6ed23464ae89a7f6ee7431298bc872"
ADMIN_EMAIL="justlikethatfragrances@gmail.com"
ADMIN_PASSWORD="CHANGE_ME_NOW_Admin@2026"
WHATSAPP_NUMBER="+918089083404"
INSTAGRAM_URL="https://www.instagram.com/jltfragrances?igsh=MWJxamRpdHN5ZmFj"
EOF

# Frontend .env (production)
cat > /var/www/jlt/frontend/.env <<'EOF'
REACT_APP_BACKEND_URL=https://www.jltfragrances.com
WDS_SOCKET_PORT=443
EOF
```

**IMPORTANT**: Edit `ADMIN_PASSWORD` to your real password:
```bash
nano /var/www/jlt/backend/.env
# Change ADMIN_PASSWORD to a strong unique value
# Save: Ctrl+O, Enter, Ctrl+X
```

---

## STEP 5 — Install Backend & Build Frontend

```bash
# Backend (Python venv)
cd /var/www/jlt/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

# Frontend build
cd /var/www/jlt/frontend
yarn install
yarn build
# This creates /var/www/jlt/frontend/build (static files for Nginx to serve)
```

---

## STEP 6 — Create systemd Service for Backend

```bash
cat > /etc/systemd/system/jlt-backend.service <<'EOF'
[Unit]
Description=JLT Fragrances FastAPI Backend
After=network.target mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/jlt/backend
EnvironmentFile=/var/www/jlt/backend/.env
ExecStart=/var/www/jlt/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now jlt-backend
sleep 5
systemctl status jlt-backend --no-pager | head -15
# Confirm "Active: active (running)"
```

Test backend:
```bash
curl http://127.0.0.1:8001/api/
# Should return: {"message":"JLT Fragrances API","products":791}
# (seeding 791 products takes ~10 seconds on first start)
```

---

## STEP 7 — Configure Nginx

```bash
cat > /etc/nginx/sites-available/jltfragrances <<'EOF'
# Redirect HTTP to HTTPS (Certbot will edit this)
server {
    listen 80;
    listen [::]:80;
    server_name jltfragrances.com www.jltfragrances.com;

    # React static files
    root /var/www/jlt/frontend/build;
    index index.html;

    # Increase upload size (for CSV imports)
    client_max_body_size 25M;

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # React Router SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Long cache for static assets
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Logo & favicon
    location = /favicon.ico { access_log off; log_not_found off; }
}
EOF

ln -sf /etc/nginx/sites-available/jltfragrances /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t        # should say "syntax is ok" and "test is successful"
systemctl reload nginx
```

Now visit **http://www.jltfragrances.com** — you should see your site (without SSL yet).

---

## STEP 8 — Enable HTTPS (Let's Encrypt SSL)

```bash
apt install -y certbot python3-certbot-nginx

certbot --nginx \
  -d jltfragrances.com -d www.jltfragrances.com \
  --non-interactive --agree-tos -m justlikethatfragrances@gmail.com \
  --redirect
```

After this completes, visit **https://www.jltfragrances.com** — site should be live with the padlock 🔒.

Certbot auto-renews. Verify:
```bash
systemctl status certbot.timer | head -5
```

---

## STEP 9 — Verify Everything Works

```bash
# Backend API
curl https://www.jltfragrances.com/api/
# → {"message":"JLT Fragrances API","products":791}

# Login as admin
curl -s -X POST https://www.jltfragrances.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"justlikethatfragrances@gmail.com","password":"YOUR_ADMIN_PASSWORD"}'
# → {"token":"eyJ...","user":{...}}
```

Browser checks:
- ✅ https://www.jltfragrances.com/
- ✅ https://www.jltfragrances.com/shop
- ✅ https://www.jltfragrances.com/brands
- ✅ https://www.jltfragrances.com/discovery-sets
- ✅ https://www.jltfragrances.com/admin/login

---

## Future Updates (after first deploy)

```bash
ssh root@187.127.170.21
cd /var/www/jlt
git pull
# Frontend changes:
cd frontend && yarn install && yarn build
# Backend changes:
cd /var/www/jlt/backend && source venv/bin/activate && pip install -r requirements.txt && deactivate
systemctl restart jlt-backend
systemctl reload nginx
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Backend won't start | `journalctl -u jlt-backend -n 50 --no-pager` |
| 502 Bad Gateway | Backend down → check `systemctl status jlt-backend` |
| MongoDB down | `systemctl status mongod` then `systemctl restart mongod` |
| SSL fails | DNS not propagated yet — wait 30 min, retry certbot |
| Forgot admin password | Edit `ADMIN_PASSWORD` in `/var/www/jlt/backend/.env`, then `systemctl restart jlt-backend` (it re-syncs on next startup) |
| Need to view logs | `journalctl -u jlt-backend -f` (Ctrl+C to exit) |

---

## Security Hardening (do this within 24 hours of going live)

1. **Disable root SSH password login** — set up SSH keys, edit `/etc/ssh/sshd_config` set `PermitRootLogin prohibit-password`
2. **Change MongoDB to bind localhost only** (it already does by default in 7.0)
3. **Rotate JWT_SECRET** if it was ever shared in chat — regenerate with `python3 -c "import secrets; print(secrets.token_hex(32))"` and update `.env` + restart backend
4. **Set strong admin password** in `.env`
5. **Enable automatic security updates**: `apt install unattended-upgrades && dpkg-reconfigure -plow unattended-upgrades`

---

## You're Live! 🎉

Your luxury-inspired fragrance store is now serving 791 products at **https://www.jltfragrances.com** with WhatsApp ordering, brand directory, tester combos, and admin panel — all from your own server.
