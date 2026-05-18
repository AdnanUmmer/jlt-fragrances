#!/usr/bin/env bash
# JLT Fragrances – one-shot Hostinger VPS deployment script
# Run as root on Ubuntu 22.04 LTS @ 187.127.170.21
# Usage:
#   wget https://your-repo-raw-url/deploy/deploy.sh -O deploy.sh
#   chmod +x deploy.sh && ./deploy.sh

set -euo pipefail

DOMAIN="jltfragrances.com"
WWW_DOMAIN="www.jltfragrances.com"
EMAIL="justlikethatfragrances@gmail.com"
APP_DIR="/var/www/jlt"
REPO_URL="${REPO_URL:-}"        # set: export REPO_URL=https://github.com/you/jlt-fragrances.git

if [ "$EUID" -ne 0 ]; then echo "Run as root"; exit 1; fi
if [ -z "$REPO_URL" ]; then echo "Set REPO_URL env var first: export REPO_URL=https://github.com/USER/REPO.git"; exit 1; fi

echo "==> [1/8] System update + base packages"
apt update && apt upgrade -y
apt install -y curl git nginx ufw build-essential software-properties-common \
  python3 python3-pip python3-venv gnupg ca-certificates

echo "==> [2/8] Node.js 20 + Yarn"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g yarn

echo "==> [3/8] MongoDB 7.0"
if ! command -v mongod &>/dev/null; then
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list
  apt update && apt install -y mongodb-org
fi
systemctl enable --now mongod

echo "==> [4/8] Firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> [5/8] Clone code"
mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR" && git pull
fi

echo "==> [6/8] Backend setup"
cd "$APP_DIR/backend"
if [ ! -f .env ]; then
  cat > .env <<EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="jlt_fragrances_prod"
CORS_ORIGINS="https://$WWW_DOMAIN,https://$DOMAIN"
JWT_SECRET="$(python3 -c 'import secrets;print(secrets.token_hex(32))')"
ADMIN_EMAIL="$EMAIL"
ADMIN_PASSWORD="CHANGE_ME_$(date +%s)"
WHATSAPP_NUMBER="+918089083404"
INSTAGRAM_URL="https://www.instagram.com/jltfragrances?igsh=MWJxamRpdHN5ZmFj"
EOF
  echo "***** IMPORTANT *****"
  echo "Edit /var/www/jlt/backend/.env and set a real ADMIN_PASSWORD before logging in."
fi
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

echo "==> [7/8] Frontend build"
cd "$APP_DIR/frontend"
cat > .env <<EOF
REACT_APP_BACKEND_URL=https://$WWW_DOMAIN
WDS_SOCKET_PORT=443
EOF
yarn install
yarn build

echo "==> [8/8] systemd + nginx"
cat > /etc/systemd/system/jlt-backend.service <<EOF
[Unit]
Description=JLT Fragrances FastAPI Backend
After=network.target mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR/backend
EnvironmentFile=$APP_DIR/backend/.env
ExecStart=$APP_DIR/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable jlt-backend
systemctl restart jlt-backend

cat > /etc/nginx/sites-available/jltfragrances <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN $WWW_DOMAIN;

    root $APP_DIR/frontend/build;
    index index.html;
    client_max_body_size 25M;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
ln -sf /etc/nginx/sites-available/jltfragrances /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# SSL
apt install -y certbot python3-certbot-nginx
certbot --nginx -d "$DOMAIN" -d "$WWW_DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect || true

sleep 6
echo ""
echo "================================================================"
echo "✅ Deployment complete!"
echo ""
echo "Visit: https://$WWW_DOMAIN"
echo ""
echo "Admin login: $EMAIL"
echo "Admin password: (set in /var/www/jlt/backend/.env)"
echo ""
echo "Useful commands:"
echo "  Logs:        journalctl -u jlt-backend -f"
echo "  Restart API: systemctl restart jlt-backend"
echo "  Reload web:  systemctl reload nginx"
echo "================================================================"
