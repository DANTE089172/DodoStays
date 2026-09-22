# DodoStays — Waitlist landing page

A **standalone** pre-launch landing page for [dodostays.mu](https://dodostays.mu),
deployed to **Cloudflare Pages** with a free **Cloudflare D1** (SQLite) backend via
**Pages Functions**. It captures two-sided waitlist signups (travellers + hosts) and
stores them at the edge — no separate API server, no CORS, $0/month. The page itself
is still plain `index.html` + `styles.css` + `app.js` with no build step.

```
waitlist/
├── public/             # static site (the Pages build output)
│   ├── index.html      # markup
│   ├── styles.css      # brand styling (mirrors web/src/app/globals.css)
│   ├── app.js          # form logic → POST /api/waitlist, GET /api/waitlist/stats
│   ├── favicon.svg
│   └── _headers        # Cloudflare Pages security + cache headers
├── functions/          # Pages Functions (the backend)
│   └── api/
│       ├── waitlist.js        # POST /api/waitlist  → D1 insert (idempotent)
│       └── waitlist/stats.js  # GET  /api/waitlist/stats → aggregate counts
├── schema.sql          # D1 table + indexes
├── wrangler.toml       # project name, build output dir, D1 binding
└── README.md
```

## How it works

- **Frontend:** the static site in `public/`, served on Cloudflare Pages (edge, free tier).
- **Backend:** same-origin **Pages Functions** under `/api/*`, backed by a **D1**
  database (`waitlist_signups`). `app.js` calls `/api/waitlist` and
  `/api/waitlist/stats` on its own origin, so there is no cross-origin base URL and
  no CORS to configure.
- **Idempotent:** signing up twice with the same email+audience returns the existing
  record (`alreadyOnList: true`). The same email may join once as a Traveller **and**
  once as a Host.

## Local development

```powershell
# From the waitlist/ folder. `wrangler pages dev` serves the static site AND the
# Functions on one port, against a local D1 database (no cloud calls).

# 1. Create the local D1 schema (first time only)
npx wrangler d1 execute dodostays-waitlist --local --file=schema.sql

# 2. Run the site + functions on http://localhost:8788
npx wrangler pages dev
```

Open http://localhost:8788 and submit the form — rows land in the local D1 database.

## Deploy to Cloudflare Pages

The project uses a Wrangler config file (`wrangler.toml`), so the static site and the
Functions (with the D1 binding) deploy together.

### One-time setup

```bash
npm install -g wrangler
wrangler login

# Create the Pages project and the D1 database
wrangler pages project create dodostays-waitlist --production-branch master
wrangler d1 create dodostays-waitlist   # copy the database_id into wrangler.toml

# Create the table in the production D1 database
wrangler d1 execute dodostays-waitlist --remote --file=schema.sql
```

### Deploy (from the `waitlist/` folder)

```bash
wrangler pages deploy --branch master        # production: dodostays-waitlist.pages.dev
```

`wrangler pages deploy` (no directory argument) reads `wrangler.toml`: it uploads
`public/` as static assets, compiles `functions/`, and attaches the `DB` D1 binding.
Omit `--branch master` to publish a preview deployment instead.

> **Git-connected builds** (auto-deploy on push): set **Build output directory** to
> `waitlist/public` and **Root directory** to `waitlist/`. Bindings come from
> `wrangler.toml`, so no dashboard binding setup is needed.

## Custom domain (dodostays.mu)

1. Pages project → **Custom domains** → **Set up a custom domain** → add
   `dodostays.mu` and `www.dodostays.mu`.
2. If the domain's DNS is on Cloudflare, records are created automatically.
   Otherwise add at your registrar:
   - `www` → `CNAME` → `dodostays-waitlist.pages.dev`
   - apex `dodostays.mu` → use Cloudflare nameservers (CNAME flattening) or an
     `ALIAS`/`ANAME` to `dodostays-waitlist.pages.dev`.

## No CORS needed

Because the backend runs as same-origin Pages Functions, there is nothing to
allow-list — the form works on every deployment (preview URLs, `*.pages.dev`, and the
custom domain) with no API redeploy.

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

```bash
# Dump every signup as JSON (audience: 0 = Traveller, 1 = Host)
wrangler d1 execute dodostays-waitlist --remote --json \
  --command "SELECT email, audience, region, locale, source, created_at FROM waitlist_signups ORDER BY created_at DESC"
```

Or browse and run SQL in the Cloudflare dashboard → **Workers & Pages** → **D1** →
`dodostays-waitlist`.
