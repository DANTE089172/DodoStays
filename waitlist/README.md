# DodoStays — Waitlist landing page

A **standalone, static** pre-launch landing page for [dodostays.mu](https://dodostays.mu),
deployed to **Cloudflare Pages**. It captures two-sided waitlist signups (travellers
+ hosts) by POSTing to the existing DodoStays API on Fly.io, which persists them to
Postgres. No build step, no framework — just `index.html`, `styles.css`, `app.js`.

```
waitlist/
├── index.html      # markup
├── styles.css      # brand styling (mirrors web/src/app/globals.css)
├── app.js          # form logic → POST /api/waitlist, GET /api/waitlist/stats
├── favicon.svg
├── _headers        # Cloudflare Pages security + cache headers
└── README.md
```

## How it works

- **Frontend:** this static site on Cloudflare Pages (edge-served, free tier).
- **Backend:** `POST /api/waitlist` and `GET /api/waitlist/stats` in the .NET API
  (`api/src/Dodostays.Api/Modules/Waitlist`), backed by the `waitlist_signups`
  Postgres table.
- `app.js` auto-targets `http://localhost:5080` when served from localhost, and
  `https://dodostays-api.fly.dev` in production.

## Local development

```powershell
# 1. Postgres (from repo root)
docker compose up -d

# 2. Apply migrations (creates waitlist_signups)
dotnet ef database update --project api/src/Dodostays.Api

# 3. Run the API on :5080
dotnet run --project api/src/Dodostays.Api --urls http://localhost:5080

# 4. Serve this folder on :8788 (origin is allow-listed for CORS in dev)
python -m http.server 8788 --directory waitlist
```

Open http://localhost:8788. The dev CORS allow-list (`appsettings.Development.json`)
already includes `http://localhost:8788`.

## Deploy to Cloudflare Pages

### Option A — Dashboard (Git-connected, auto-deploys on push)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → select `DANTE089172/DodoStays`.
2. Build settings:
   - **Framework preset:** `None`
   - **Build command:** *(leave empty)*
   - **Build output directory:** `waitlist`
   - **Root directory:** `/`
3. **Save and Deploy.** Production URL: `https://dodostays-waitlist.pages.dev`.

### Option B — Wrangler CLI (one-off deploy)

```bash
npm install -g wrangler
wrangler login
wrangler pages project create dodostays-waitlist --production-branch master
wrangler pages deploy waitlist --project-name dodostays-waitlist
```

## Custom domain (dodostays.mu)

1. Pages project → **Custom domains** → **Set up a custom domain** → add
   `dodostays.mu` and `www.dodostays.mu`.
2. If the domain's DNS is on Cloudflare, records are created automatically.
   Otherwise add at your registrar:
   - `www` → `CNAME` → `dodostays-waitlist.pages.dev`
   - apex `dodostays.mu` → use Cloudflare nameservers (CNAME flattening) or an
     `ALIAS`/`ANAME` to `dodostays-waitlist.pages.dev`.

## Required: allow the page's origin on the API (CORS)

The API only accepts cross-origin POSTs from allow-listed origins. These are already
added in `api/fly.toml`:

```
Cors__AllowedOrigins__3 = "https://dodostays.mu"
Cors__AllowedOrigins__4 = "https://www.dodostays.mu"
Cors__AllowedOrigins__5 = "https://dodostays-waitlist.pages.dev"
```

**Redeploy the API for these to take effect:**

```bash
cd api && flyctl deploy --remote-only
```

> Preview deployments get random `*.dodostays-waitlist.pages.dev` subdomains that
> are **not** in the allow-list, so the form only works on the production URL /
> custom domain. Add a preview origin to the list if you need to test a preview.

## API contract

`POST /api/waitlist`
```jsonc
{
  "email": "you@example.com",   // required
  "audience": "Traveller",       // required: "Traveller" | "Host"
  "name": "Alice",               // optional
  "region": "grand-baie",        // optional
  "message": "…",                // optional
  "locale": "en",                // optional
  "source": "instagram"          // optional (utm_source / ref / referrer)
}
```
Returns `200` with `{ id, email, audience, createdAt, alreadyOnList }`. Signing up
twice with the same email+audience is idempotent (`alreadyOnList: true`). The same
email may join once as a Traveller **and** once as a Host.

`GET /api/waitlist/stats` → `{ total, travellers, hosts }` (aggregate, no PII).

## Exporting signups

```sql
SELECT "Email", "Audience", "Region", "Locale", "Source", "CreatedAt"
FROM waitlist_signups
ORDER BY "CreatedAt" DESC;
```
`Audience`: `0` = Traveller, `1` = Host.
