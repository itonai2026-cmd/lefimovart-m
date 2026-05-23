# LefiMovArt - Deployment Guide (No SSH/Terminal Access Required)

## Prerequisites
- Node.js & npm installed on your local Windows machine
- FTP/SFTP client (FileZilla, WinSCP, etc.)
- Text editor for .env configuration

## Step 1: Clone Repository (✅ COMPLETED)
```bash
git clone https://github.com/itonai2026-cmd/lefimovart.git /path/to/wp/lefimovart/
```

## Step 2: Run Database Schema (✅ COMPLETED)
```bash
mysql -u r133813iton_dacos -p r133813iton_ai_video < database/schema.sql
```

## Step 3: Built Frontend Included in Git

The repository includes the compiled `frontend/dist/` output. When a change updates the React frontend, the corresponding generated `frontend/dist/index.html` and hashed files from `frontend/dist/assets/` must be committed and deployed together.

## Step 4: Deploy Repository Files Through Your Hosting Panel/Git Deploy

Deploy the current Git revision into `/wp/lefimovart/`. The following files are part of the deploy and must not be skipped by the hosting Git integration:
- `.htaccess`
- `api/`
- `frontend/dist/index.html`
- `frontend/dist/assets/`
- source files under `frontend/src/` (kept for future builds)

If `frontend/dist/index.html` is deployed without its matching hashed `frontend/dist/assets/*` files, the browser receives no JavaScript and the application appears as a blank page.

## Step 5: Configure .env on Server (via FTP or File Manager)

Create/Edit `.env` in `/wp/lefimovart/`:

```env
# Application Configuration
APP_ENV=production
APP_URL=https://itonai.ro
BASE_PATH=/wp/lefimovart

# Database Configuration
DB_HOST=localhost
DB_USER=r133813iton_dacos
DB_PASS=your_password_here
DB_NAME=r133813iton_ai_video

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_this

# Google OAuth Configuration
GOOGLE_CLIENT_ID=406355544313-kjodsgu73vu5e4pkuavr1mss62g80c9k.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=https://itonai.ro/wp/lefimovart/api/auth/google_callback.php

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_test_key_here
STRIPE_PUBLIC_KEY=pk_test_your_public_key_here
STRIPE_ENDPOINT_SECRET=whsec_your_webhook_secret_here

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
SMTP_FROM=noreply@itonai.ro

# FAL.ai Configuration (for image & video generation)
FAL_AI_API_KEY=your_fal_ai_key_here

# OpenAI Configuration (for image generation and AI image editing)
OPENAI_API_KEY=sk-proj-your_openai_project_key_here
OPENAI_IMAGE_MODEL=gpt-image-1.5

# Debug (remove in production)
APP_DEBUG=false
LOG_LEVEL=error
```

## Step 6: Set Permissions (via File Manager or Contact Hosting Support)

Ask your hosting provider to set these permissions:

```bash
chmod 755 /wp/lefimovart/api/
chmod 644 /wp/lefimovart/.env
chmod 644 /wp/lefimovart/.htaccess
```

Or use cPanel File Manager to:
1. Right-click `api/` folder → Permissions → 755
2. Right-click `.env` file → Permissions → 644

## Step 7: Verify Installation

### Test API:
```
https://itonai.ro/wp/lefimovart/api/auth/me.php
```
Should return an error about missing token (which is expected).

### Test Frontend:
```
https://itonai.ro/wp/lefimovart/
```
Should show the login page.

## Troubleshooting

### "dist folder not found" error
- Confirm that the hosting Git deploy includes `frontend/dist/`, which is committed in this repository
- Confirm that `frontend/dist/index.html` references asset names that exist under `frontend/dist/assets/`

### API returns 500 error
- Check `.env` configuration is correct
- Verify database credentials
- Check `OPENAI_API_KEY` for image endpoints and `FAL_AI_API_KEY` for video endpoints
- Review PHP error logs in hosting control panel

### Google OAuth not working
- Verify Google Client ID and Secret in .env
- Check redirect URI matches exactly: `https://itonai.ro/wp/lefimovart/api/auth/google_callback.php`

### Stripe not processing payments
- Verify Stripe keys in .env
- Test with Stripe test keys first
- Check webhook endpoint is configured in Stripe dashboard

## File Structure on Server
```
/wp/lefimovart/
├── api/
│   ├── auth/
│   ├── images/
│   ├── videos/
│   ├── payments/
│   └── ...
├── frontend/
│   └── dist/
│       ├── index.html
│       ├── assets/
│       └── ...
├── database/
│   └── schema.sql
├── .env
├── .htaccess
├── config.php
└── README.md
```

## Summary

**Local Machine (Windows):**
- Build frontend changes before committing (`npm run build`) ✓
- Commit `frontend/dist/` together with code changes ✓

**Server (Linux):**
- Deploy the Git revision from the hosting control panel
- Edit `.env` through File Manager/hosting variables to add API credentials
- Verify installation

The application is now ready to use!
