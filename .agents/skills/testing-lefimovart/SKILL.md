---
name: testing-lefimovart
description: Reference for developing, linting, building and CI-checking the LefiMovArt repo (React/Vite frontend + procedural PHP backend, OpenAI + Fal.ai image/video generation). Use when working anywhere in itonai2026-cmd/lefimovart.
---

# LefiMovArt — dev & test reference

AI image/video generation platform. **Frontend**: React 18 + Vite 5 in `frontend/`. **Backend**: procedural PHP (PDO/MySQL) in `api/`. Auth = JWT (Bearer). Payments = Stripe. App is served under base path `/wp/lefimovart/`.

## Repo layout
- `frontend/` — React SPA (Vite). `base: '/wp/lefimovart/'`; dev server proxies `/wp/lefimovart/api` and `/wp/lefimovart/stickers` → `http://localhost` (see `frontend/vite.config.js`).
- `api/` — PHP endpoints. Key includes in `api/includes/` (`fal_images.php`, `openai_images.php`, `jwt.php`, `auth.php`, PHPMailer). Config + model tables in `api/config.php`.
- `database/` — SQL schema. `img/`, `vid/`, `uploads/`, `stickers/` — generated/uploaded media.

## Versions
- **PHP 8.3** in production; code verified compatible with PHP 8.0–8.3. The Devin env blueprint installs PHP 8.3.
- **Node 18 or 20** for the frontend (CI runs both). No `engines` field in package.json.

## Frontend commands (run inside `frontend/`)
```bash
npm ci            # or: npm install
npm run dev       # vite dev server
npm run build     # vite production build -> frontend/dist
npm run lint      # eslint src --ext .js,.jsx  (config: frontend/.eslintrc.cjs)
```
ESLint config (`frontend/.eslintrc.cjs`) uses `eslint:recommended` + `plugin:react`; stylistic rules (`no-unused-vars`, `no-unescaped-entities`) are warnings, so existing code passes (0 errors) while real bugs (e.g. `no-undef`) fail.

## PHP checks
```bash
# Syntax lint every PHP file (excludes bundled PHPMailer):
find . -name "*.php" -type f ! -path "*/PHPMailer/*" ! -path "*/node_modules/*" -print0 | xargs -0 -n1 -P4 php -l

# Version-compatibility scan (catches deprecated/removed funcs per PHP version).
# Requires composer + PHP_CodeSniffer + PHPCompatibility (dev-develop) installed in a tools dir:
php8.3 vendor/bin/phpcs --standard=PHPCompatibility --runtime-set testVersion 8.0-8.3 \
  --extensions=php --ignore=*/PHPMailer/* api/
```
`php -l` only catches syntax; use PHPCompatibility for deprecations. As of this writing the whole codebase is clean for 8.0–8.3.

## CI (`.github/workflows/ci.yml`)
Runs on push/PR to `main`/`develop`. Two jobs:
- **php-lint**: matrix PHP `8.0/8.1/8.2/8.3`, `php -l` over all `*.php` (excludes PHPMailer/vendor/node_modules). Blocking.
- **frontend**: matrix Node `18.x/20.x`, `npm ci` → `npm run lint` → `npm run build` in `frontend/`. Blocking.
There is no automated PHP/JS test suite.

## Architecture gotchas
- **Image generation routes through Fal.ai**, not OpenAI directly. In `api/images/generate.php`, `$useFal` is true whenever the model exists in `$IMAGE_MODELS_CONFIG` — all 3 image models (`flux_dev`, `nano_banana`, `gpt_image_2`) have `provider: fal`. The direct-OpenAI path (`openai_images.php`) is a fallback only; its default model `gpt-image-1.5` returns base64 **only** and does NOT accept a `response_format` param (don't add one). Fal image endpoints are synchronous (`fal.run/...`), return `images[0].url`, then downloaded locally.
- **Video generation is async via Fal.ai QUEUE** (`queue.fal.run/...`). `api/videos/generate.php` submits and stores `request_id`/`status_url`/`response_url`; `api/videos/status.php` polls and downloads the result. Credits are deducted only after a successful submit/insert. The submit curl uses a finite timeout — a provider/network stall can surface as a 502 with a missing `request_id`.
- **Bundled PHPMailer is 6.9.3** (PHP 8.3-compatible). PHPCompatibility flags `INTL_IDNA_VARIANT_2003` / `mbstring.func_overload` / `openssl_pkey_free()` inside it, but each is guarded and harmless — do NOT modify the vendored library.

## Session changelog
> Maintenance (for future sessions): when you change this repo, prepend ONE concise line below — format `YYYY-MM-DD — what changed (PR #N)`. Keep only the most recent 5 entries; delete older ones so this section never exceeds 5 lines and the file stays small.

- 2026-06-04 — Rewrote Privacy & Terms pages (full legal text, formatted single page); Settings header card now shows LefiMovArt icon+name+V1.1.0 (left) and ITonAI text+logo (right) (PR #59)
- 2026-06-01 — Replaced Buy Credits payment icons and landing button backgrounds (PR #51)
- 2026-05-31 — Verified PHP 8.0–8.3 compatibility; explicit `htmlspecialchars` flags; added PHP 8.3 to CI matrix (PR #35)
- 2026-05-31 — Added GitHub Actions CI pipeline: PHP lint + frontend build/lint (PR #34)

## Local backend dev — KNOWN GAP
The env blueprint documents a SQLite local-dev flow (`php test_setup.php`, `cp api/config_local.php api/config.php`, then `php -S localhost:8080 test_router.php`). **`test_setup.php` and `api/config_local.php` do NOT exist in the repo** (only `test_router.php` is present), so that flow is not reproducible as written — recreate those helpers or use a real MySQL DB before relying on it. Intended local seed accounts (per blueprint): `admin@test.local / admin123`, `user@test.local / user123!`.
