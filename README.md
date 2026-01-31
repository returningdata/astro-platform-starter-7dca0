# Sector Network Dashboard (Astro SSR on Netlify)

Astro + Auth.js (Discord OAuth) + Prisma (Postgres) dashboard to manage **Network Roles** across multiple Discord servers.

## Deploy (Netlify)
1) Push to GitHub
2) Import repo into Netlify
3) Build command: `npm run build`
4) Publish directory: `dist`
5) Add env vars from `.env.example` in Netlify Site Settings
6) Run migrations once: `npx prisma migrate deploy` (from your local machine)

## Discord Redirect URI
Add this redirect URI in Discord Developer Portal:
- `https://YOUR_SITE.netlify.app/api/auth/callback/discord`

## Bot integration
Your Python bot:
- `/authorize` writes `AuthCode` into the same Postgres (bot uses PANEL_DATABASE_URL)
- sync worker reads `SyncAction` and applies/removes roles

