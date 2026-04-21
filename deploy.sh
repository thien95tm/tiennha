#!/bin/bash
# Deploy script chạy trên server cPanel
# Sử dụng: bash ~/tiennha-src/deploy.sh
#
# Cấu trúc:
#   ~/tiennha-src/        ← git clone repo
#   ~/tiennha.jsonsave.com/ ← document root (subdomain)

set -e

REPO_DIR="$HOME/tiennha-src"
DOCROOT="$HOME/tiennha.jsonsave.com"

echo "==> Pull latest code"
cd "$REPO_DIR"
git pull

echo "==> Load nvm"
source ~/.nvm/nvm.sh 2>/dev/null || true

echo "==> Install React deps"
cd "$REPO_DIR/web"
npm install --no-audit --no-fund

echo "==> Build React production"
npm run build

echo "==> Sync built files to docroot"
mkdir -p "$DOCROOT"
# Xoá file cũ trừ api/ và .env, .htaccess (nếu .htaccess không có trong build)
find "$DOCROOT" -mindepth 1 -maxdepth 1 \
  ! -name 'api' \
  ! -name '.well-known' \
  ! -name 'cgi-bin' \
  -exec rm -rf {} +

cp -r "$REPO_DIR/web/dist/." "$DOCROOT/"

echo "==> Sync API files"
mkdir -p "$DOCROOT/api"
# Giữ .env hiện có, copy mọi file khác
rsync -a --exclude='.env' --exclude='logs/' "$REPO_DIR/api/" "$DOCROOT/api/"

echo "==> Done. Visit https://tiennha.jsonsave.com/"
