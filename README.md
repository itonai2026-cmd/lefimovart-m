# LefiMovArt - AI Image & Video Generation Platform

Aplicație full-stack pentru generare și editare de imagini + generare video cu AI, hosted pe serverul LiteSpeed cu bază de date MySQL.

## 🏗️ Arhitectură

- **Frontend:** React SPA (Vite) + TailwindCSS + shadcn/ui
- **Backend:** PHP REST API (LiteSpeed)
- **Database:** MySQL/MariaDB (`r133813iton_ai_video`)
- **AI imagini/editare:** OpenAI Images API
- **AI video:** FAL.ai
- **Autentificare:** JWT + Google OAuth
- **Plăți:** Stripe
- **Procesare imagine:** PHP GD pentru output HiRes și formatele 16:9 / 9:16

## 📦 Instalare

### 1. Database Schema
```bash
mysql -h localhost -u r133813iton_dacos -p r133813iton_ai_video < database/schema.sql
```

### 2. Environment
Editează `.env` și adaugă credențialele:
- `DB_*` (deja completat)
- `OPENAI_API_KEY` pentru generare și editare imagini
- `OPENAI_IMAGE_MODEL=gpt-image-1.5` (modelul recomandat curent pentru imagini)
- `FAL_AI_API_KEY` pentru generare video
- `GOOGLE_CLIENT_ID` și `GOOGLE_CLIENT_SECRET`
- `STRIPE_SECRET_KEY` (dacă vrei plăți)

Pentru OpenAI, creează un **Project API key** în dashboard-ul OpenAI, din `API keys`, apoi adaugă cheia numai în `.env` pe server:

```env
OPENAI_API_KEY=sk-proj-...
OPENAI_IMAGE_MODEL=gpt-image-1.5
```

Cheia este utilizată numai de endpoint-urile PHP din `api/images/`; nu trebuie introdusă în variabile Vite sau în codul React.

### 3. Frontend Build
```bash
cd frontend
npm install
npm run build
```

### 4. Deploy
Copiază directoarele `api/`, `database/` și `frontend/dist/`, plus `.htaccess`, păstrând structura proiectului sub `/wp/lefimovart/`. Fișierul `.htaccess` din acest repo servește build-ul din `frontend/dist/`; `index.html` și tot directorul `frontend/dist/assets/` trebuie publicate împreună la fiecare build.

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
- `POST /api/requests/create.php` - Salvare cerere imagine cu status `pending`
- `POST /api/images/create.php` - Generare imagine din `request_id` si finalizare `ready`/`failed`
- `GET /api/images/gallery.php` - Lista imagini
- `DELETE /api/images/gallery.php` - Ștergere imagine

### Videos
- `POST /api/videos/create.php` - Generare video
- `GET /api/videos/list.php` - Lista video-uri
- `GET /api/videos/status.php?id=X` - Verificare status video (polling)

### Payments
- `POST /api/payments/create_checkout.php` - Creare sesiune Stripe Checkout
- `POST /api/payments/verify_stripe.php` - Verificare plata Stripe

## 📱 Funcționalități

✅ Generare și editare imagini cu OpenAI
✅ Formate imagine 1:1, 3:2, 2:3, 16:9 și 9:16, cu output Standard/HiRes
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
2. Copiază `frontend/dist/` în `/home/user/public_html/wp/lefimovart/frontend/dist/`
3. Copie `.htaccess` la rădăcina `/wp/lefimovart/.htaccess`
4. Setează permisiuni: `chmod 755 api/` și `chmod 644 api/*.php`

### .htaccess
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /wp/lefimovart/

    # API routes pass through
    RewriteRule ^api/ - [L]

    # Asset-urile Vite sunt servite din build; cele lipsă rămân 404.
    RewriteCond %{DOCUMENT_ROOT}/wp/lefimovart/frontend/dist/assets/$1 -f
    RewriteRule ^assets/(.*)$ frontend/dist/assets/$1 [L]
    RewriteRule ^assets/ - [R=404,L]

    # SPA routing
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ frontend/dist/index.html [QSA,L]
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
OPENAI_API_KEY=sk-proj-***
OPENAI_IMAGE_MODEL=gpt-image-1.5
GOOGLE_CLIENT_ID=***
GOOGLE_CLIENT_SECRET=***
STRIPE_SECRET_KEY=sk_live_***
```

## 📝 Licență

MIT - Free to use and modify
