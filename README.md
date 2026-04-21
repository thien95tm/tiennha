# Tiền thuê nhà

Quản lý tiền thuê nhà 5 phòng: hoá đơn điện/nước/phòng, OCR công tơ bằng Gemini.

## Stack

- **Backend:** PHP 8.2+ (PDO MySQL, JWT auth, không framework)
- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **OCR:** Google Gemini Flash Lite (free tier)

## Cấu trúc

```
api/                  PHP REST API
  endpoints/          Routes (auth, rooms, tenants, bills, pricing, ocr)
  lib/                Db, Jwt, Auth, Router, Env, Response
database/             schema.sql, seed.sql, import_csv.php
web/                  React app (Vite)
test/                 Sample meter images
deploy.sh             Production deploy script (cPanel)
```

## Local development

```bash
# 1. Database
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
php database/import_csv.php   # import lịch sử CSV

# 2. API config
cp api/.env.example api/.env
# Sửa DB credentials, JWT_SECRET, GEMINI_API_KEY

# 3. Apache vhost (xem setup-vhost.sh)

# 4. Frontend
cd web
cp .env.example .env
npm install
npm run dev
# Mở http://localhost:5173
```

## Production deploy (cPanel + git)

Lần đầu trên server:

```bash
ssh user@host
cd ~
git clone git@github.com:thien95tm/tiennha.git tiennha-src
cd tiennha-src/api
cp .env.example .env
nano .env   # paste DB creds, JWT_SECRET, GEMINI_API_KEY
bash ../deploy.sh
```

Update lần sau (sau khi push code mới):

```bash
ssh user@host
bash ~/tiennha-src/deploy.sh
```

## Login mặc định

`thienpv` / `admin@123` (đổi sau bằng cách hash mật khẩu mới và update bảng `admin_users`).
