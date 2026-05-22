# LefimovArt - Deployment Guide (No SSH/Terminal Access Required)

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

## Step 3: Build Frontend Locally (⏳ DO THIS ON YOUR WINDOWS MACHINE)

### On Your Local Windows Machine:
```bash
cd D:\lefimovart-dev\frontend
npm install
npm run build
```

This will create a `dist/` folder with all compiled frontend files.

## Step 4: Upload Built Frontend to Server (via FTP)

### Files to Upload:
1. **Frontend built files**: `frontend/dist/*` → `/wp/lefimovart/frontend/dist/`
2. **API files**: All `.php` files are already on server from step 1
3. **.env file**: Configure on server (see below)

### Using FileZilla (or similar FTP client):
1. Connect to your server via FTP/SFTP
2. Navigate to `/home/user/public_html/wp/lefimovart/frontend/`
3. Delete the old `dist` folder (if exists)
4. Upload the new `dist` folder from `D:\lefimovart-dev\frontend\dist\`

### Using SCP/SFTP Command (if available):
```bash
# From your local machine
scp -r D:\lefimovart-dev\frontend\dist username@itonai.ro:/home/user/public_html/wp/lefimovart/frontend/
```

## Step 5: Configure .env on Server (via FTP or File Manager)

Create/Edit `.env` in `/wp/lefimovart/`:

```env
# API Configuration
BASE_URL=http://itonai.ro/wp/lefimovart

# Database Configuration
DB_HOST=localhost
DB_USER=r133813iton_dacos
DB_PASSWORD=your_password_here
DB_NAME=r133813iton_ai_video

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_this

# Google OAuth Configuration
GOOGLE_CLIENT_ID=406355544313-kjodsgu73vu5e4pkuavr1mss62g80c9k.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://itonai.ro/wp/lefimovart/api/auth/google_callback.php

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_test_key_here
STRIPE_PUBLIC_KEY=pk_test_your_public_key_here
STRIPE_ENDPOINT_SECRET=whsec_your_webhook_secret_here

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here
SMTP_FROM=noreply@itonai.ro

# FAL.ai Configuration (for image & video generation)
FAL_AI_API_KEY=your_fal_ai_key_here

# Application Configuration
APP_ENV=production
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
http://itonai.ro/wp/lefimovart/api/auth/me.php
```
Should return an error about missing token (which is expected).

### Test Frontend:
```
http://itonai.ro/wp/lefimovart/
```
Should show the login page.

## Troubleshooting

### "dist folder not found" error
- Make sure you ran `npm install && npm run build` on your local machine
- Verify the `dist` folder was created in `frontend/dist/`
- Re-upload the dist folder via FTP

### API returns 500 error
- Check `.env` configuration is correct
- Verify database credentials
- Check FAL.ai API key is valid
- Review PHP error logs in hosting control panel

### Google OAuth not working
- Verify Google Client ID and Secret in .env
- Check redirect URI matches exactly: `http://itonai.ro/wp/lefimovart/api/auth/google_callback.php`

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
- Clone repo ✓
- Build frontend (`npm run build`)
- Upload dist folder via FTP

**Server (Linux):**
- Run database schema ✓
- Upload dist folder from local machine
- Create/upload .env configuration
- Set file permissions (ask hosting support)
- Verify installation

The application is now ready to use!
