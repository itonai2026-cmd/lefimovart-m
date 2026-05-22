# 🎨 LefimovArt - AI Image & Video Generation Platform

Aplicație full-stack pentru generare și editare de imagini + generare video cu AI, hosted pe serverul LiteSpeed cu bază de date MySQL.

## 🏗️ Arhitectură

- **Frontend:** React SPA (Vite) + TailwindCSS + shadcn/ui
- **Backend:** PHP REST API (LiteSpeed)
- **Database:** MySQL/MariaDB (`r133813iton_ai_video`)
- **AI:** FAL.ai (imagini și video-uri)
- **Autentificare:** JWT + Google OAuth
- **Plăți:** Stripe

## 📦 Instalare

### 1. Database Schema
```bash
mysql -h localhost -u r133813iton_dacos -p r133813iton_ai_video < database/schema.sql
```

### 2. Environment
Editează `.env` și adaugă credențialele:
- `DB_*` (deja completat)
- `GOOGLE_CLIENT_ID` și `GOOGLE_CLIENT_SECRET`
- `STRIPE_SECRET_KEY` (dacă vrei plăți)

### 3. Deploy PHP API
Copiază directorul `api/` pe server la `/wp/lefimovart/api/`

### 4. Frontend Build
```bash
cd frontend
npm install
npm run build
```
Copiază `dist/` pe server la `/wp/lefimovart/`

## 🔌 API Endpoints

### Auth
- `POST /api/auth/register.php` - Înregistrare
- `POST /api/auth/login.php` - Login
- `POST /api/auth/verify.php` - Verificare email
- `GET /api/auth/me.php` - Info user actual
- `GET /api/auth/google_callback.php` - Google OAuth callback
- `POST /api/auth/forgot_password.php` - Reset parolă
- `POST /api/auth/reset_password.php` - Schimbare parolă

### Images
- `POST /api/images/generate.php` - Generare imagine
- `GET /api/images/gallery.php` - Lista imagini
- `DELETE /api/images/gallery.php` - Ștergere imagine

### Videos
- `POST /api/videos/generate.php` - Generare video
- `GET /api/videos/list.php` - Lista video-uri
- `GET /api/videos/status.php?id=X` - Verificare status video (polling)

### Payments
- `POST /api/payments/create_checkout.php` - Creare sesiune Stripe Checkout
- `POST /api/payments/verify_stripe.php` - Verificare plata Stripe

## 📱 Funcționalități

✅ Generare imagini cu AI (fal.ai/flux/dev)
✅ Editare imagini (crop, rotate, blur, text, stickere, filtru AI)
✅ Generare video cu AI (3 modele: Wan, LTX, Kling)
✅ Galerie imagini/video
✅ Autentificare email + Google OAuth
✅ Sistem de credite
✅ Plăți Stripe (Bronze/Silver/Gold)
✅ Mobile-responsive
✅ PWA support

## 🚀 Deploy pe Production

### LiteSpeed Setup
1. Copiază `api/` în `/home/user/public_html/wp/lefimovart/api/`
2. Copiază `frontend/dist/` în `/home/user/public_html/wp/lefimovart/`
3. Copie `.htaccess` la rădăcina `/wp/lefimovart/.htaccess`
4. Setează permisiuni: `chmod 755 api/` și `chmod 644 api/*.php`

### .htaccess
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /wp/lefimovart/

    # API routes pass through
    RewriteRule ^api/ - [L]

    # SPA routing - redirecționează toate requesturi la index.html
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.html [QSA,L]
</IfModule>
```

## 🔑 Variabile de Mediu

```env
APP_ENV=production
APP_URL=https://itonai.ro
BASE_PATH=/wp/lefimovart

DB_HOST=localhost
DB_NAME=r133813iton_ai_video
DB_USER=r133813iton_dacos
DB_PASS=***

FAL_AI_API_KEY=***
GOOGLE_CLIENT_ID=***
GOOGLE_CLIENT_SECRET=***
STRIPE_SECRET_KEY=sk_live_***
```

## 📝 Licență

MIT - Free to use and modify
