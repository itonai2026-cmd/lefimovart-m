# LefiMovArt - AI Image & Video Generation Platform

Aplicație full-stack pentru generare și editare de imagini + generare video cu AI, hosted pe serverul LiteSpeed cu bază de date MySQL.

## 🏗️ Arhitectură

- **Frontend:** React SPA (Vite) + TailwindCSS + shadcn/ui
- **Backend:** PHP REST API (LiteSpeed)
- **Database:** MySQL/MariaDB (`r133813iton_ai_video`)
- **AI imagini/editare:** Fal.AI ca provider principal; OpenAI este folosit numai ca rezervă dacă Fal.AI eșuează
- **AI video:** FAL.ai
- **Autentificare:** JWT + Google OAuth
- **Plăți:** Stripe pe web, Google Play Billing în aplicația Android împachetată
- **Procesare imagine:** PHP GD pentru output HiRes și formatele 16:9 / 9:16

## 📦 Instalare

### 1. Database Schema
```bash
mysql -h localhost -u r133813iton_dacos -p r133813iton_ai_video < database/schema.sql
```

### 2. Environment
Editează `.env` și adaugă credențialele:
- `DB_*` (deja completat)
- `FAL_AI_API_KEY` pentru generare/editare imagini și generare video
- `OPENAI_API_KEY` doar ca rezervă pentru generare/editare imagini când Fal.AI dă eroare
- `OPENAI_IMAGE_MODEL=gpt-image-1.5` pentru fallback-ul OpenAI
- `GOOGLE_CLIENT_ID` și `GOOGLE_CLIENT_SECRET`
- `STRIPE_SECRET_KEY` (pentru plăți web)
- `STRIPE_PRICE_*` pentru fiecare plan din catalogul Stripe
- `GOOGLE_PLAY_*` pentru verificarea achizițiilor Android în Google Play

Pentru fallback-ul OpenAI, creează un **Project API key** în dashboard-ul OpenAI, din `API keys`, apoi adaugă cheia numai în `.env` pe server. Aplicația încearcă întâi Fal.AI; OpenAI este apelat numai dacă Fal.AI returnează eroare:

```env
OPENAI_API_KEY=sk-proj-...
OPENAI_IMAGE_MODEL=gpt-image-1.5
DEFAULT_IMAGE_MODEL=flux_dev
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
- `POST /api/requests/process.php` - Generare imagine din `request_id` si finalizare `ready`/`failed`
- `GET /api/images/gallery.php` - Lista imagini
- `DELETE /api/images/gallery.php` - Ștergere imagine

### Videos
- `POST /api/videos/create.php` - Generare video
- `GET /api/videos/list.php` - Lista video-uri
- `GET /api/videos/status.php?id=X` - Verificare status video (polling)

### Payments
- `POST /api/payments/create_checkout.php` - Creare sesiune Stripe Checkout
- `POST /api/payments/verify_stripe.php` - Verificare plata Stripe
- `POST /api/payments/webhook.php` - Webhook Stripe `checkout.session.completed`
- `POST /api/payments/verify_google_play.php` - Verificare Google Play purchase token și acordare credite Android

## 📱 Funcționalități

✅ Generare și editare imagini prin Fal.AI, cu OpenAI doar ca rezervă la eroare
✅ Formate imagine 1:1, 3:2, 2:3, 16:9 și 9:16, cu output Standard/HiRes
✅ Editare imagini (crop, rotate, blur, text, stickere, filtru AI)
✅ Generare video cu AI (3 modele: Wan, LTX, Kling)
✅ Galerie imagini/video
✅ Autentificare email + Google OAuth
✅ Sistem de credite
✅ Plăți Stripe pe web (Bronze/Silver/Gold/Diamond/Rhodium)
✅ Google Play Billing pentru aplicația Android împachetată
✅ Mobile-responsive
✅ PWA support

## 📱 Android wrapper cu Android Studio

Aplicația mobilă folosește Capacitor ca wrapper WebView peste site-ul live:

```text
https://itonai.ro/wp/lefimovart/
```

Codul Android este în `frontend/android/` și poate fi deschis în Android Studio:

```bash
cd frontend
npm install
npm run android:sync
npm run android:open
```

Pentru Play Store, creează produse consumabile de tip one-time product / in-app product cu aceleași ID-uri ca în `.env` și în frontend:

```text
credits_bronze
credits_silver
credits_gold
credits_diamond
credits_rhodium
```

În aplicația web normală rămâne Stripe. În aplicația Android, pagina `Buy Credits` detectează Capacitor Android și folosește Google Play Billing. După cumpărare, frontend-ul trimite `product_id`, `purchase_token`, `order_id` și planul la backend; backend-ul verifică achiziția prin Google Play Developer API, acordă creditele o singură dată și consumă produsul ca să poată fi cumpărat din nou.

Pentru verificare server-side, creează în Google Cloud/Play Console un service account cu acces la Google Play Android Developer API și setează una dintre variante:

```env
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_PLAY_SERVICE_ACCOUNT_FILE=/absolute/path/google-play-service-account.json
```

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

OPENAI_API_KEY=sk-proj-***
OPENAI_IMAGE_MODEL=gpt-image-1.5
DEFAULT_IMAGE_MODEL=flux_dev
FAL_AI_API_KEY=***
GOOGLE_CLIENT_ID=***
GOOGLE_CLIENT_SECRET=***
STRIPE_SECRET_KEY=sk_live_***
STRIPE_PUBLIC_KEY=pk_live_***
STRIPE_ENDPOINT_SECRET=whsec_***
STRIPE_PRICE_BRONZE=price_***
STRIPE_PRICE_SILVER=price_***
STRIPE_PRICE_GOLD=price_***
STRIPE_PRICE_DIAMOND=price_***
STRIPE_PRICE_RHODIUM=price_***

GOOGLE_PLAY_PACKAGE_NAME=ro.itonai.lefimovart
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_PLAY_PRODUCT_BRONZE=credits_bronze
GOOGLE_PLAY_PRODUCT_SILVER=credits_silver
GOOGLE_PLAY_PRODUCT_GOLD=credits_gold
GOOGLE_PLAY_PRODUCT_DIAMOND=credits_diamond
GOOGLE_PLAY_PRODUCT_RHODIUM=credits_rhodium
```

Configurează în Stripe Dashboard webhook-ul către:

```text
https://itonai.ro/wp/lefimovart/api/payments/webhook.php
```

Eveniment minim necesar: `checkout.session.completed`. Secretul de signing generat de acel endpoint se salvează în `STRIPE_ENDPOINT_SECRET`.

Creditele se acordă o singură dată, numai după ce Stripe confirmă sesiunea ca `paid` și `complete`, iar Price ID-ul, moneda și suma corespund planului configurat. Pentru plăți anulate, incomplete, cu Price ID greșit sau neverificate, soldul de credite rămâne neschimbat.

## 📝 Licență

MIT - Free to use and modify
