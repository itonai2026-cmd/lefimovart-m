# LefimovArt - JWT_SECRET Generation Guide

## Genereaza JWT_SECRET - Metode care Functioneaza pe Windows

### Metoda 1: Node.js (Recomandata - Daca ai Node.js instalat)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Output exemple:**
```
a7f3e9d2c1b5f8e4a6c9d2e1f4a7b9c2d5e8f1a4b7c9e2f3a5b8c1d4e7f0a
```

### Metoda 2: PowerShell (Corecta pentru Windows)

```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})
```

sau versiunea mai simpla:

```powershell
[guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()
```

### Metoda 3: Online Generator (Cel mai Usor)

Mergi la: https://www.uuidgenerator.net/version4

Copy-paste rezultatul direct in .env

### Metoda 4: OpenSSL (Daca ai Git instalat)

```bash
openssl rand -hex 32
```

## Unde o Pui: 

Edit file: `/wp/lefimovart/.env` pe server

```env
# JWT Configuration
JWT_SECRET=paste_here_your_generated_key
```

## Ce Trebuie sa Fie:

- Minim 32 caractere
- Combinatie de litere si cifre
- Unic pentru serverul tau
- NU-l schimba dupa ce crezi token-uri
- NU-l posta public
- Keep it SECRET!

## Verifica Daca Functioneaza:

Dupa ce pui JWT_SECRET in .env, deschide in browser:
```
http://itonai.ro/wp/lefimovart/
```

Ar trebui sa vezi login page.
