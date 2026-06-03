# DodoStays — Mauritius Short-Term Rental Marketplace

**Spec date:** 2026-06-03
**Working brand:** DodoStays (final brand pending trademark + domain verification)
**Status:** Design — pending user approval before implementation planning

---

## 1. Vision

DodoStays is a Mauritius-only short-term rental marketplace, operated by an Australia-based founding team via a Mauritian domestic company. It serves Mauritian villa, apartment, and guesthouse hosts and international leisure tourists, with a stated wedge against Airbnb and Booking.com on **price transparency, instant booking, and lower commission**.

### Three guest-facing promises

1. **Real prices, locked.** Multi-currency display (MUR, EUR, GBP, AUD, ZAR, USD). FX rate frozen at booking. No surprise fees at checkout.
2. **Instant book everything.** Every listing bookable in under 30 seconds. No request-to-book queues.
3. **Cheaper, guaranteed.** 7% host commission flows to lower guest prices than Airbnb (~15% total) or Booking.com (~15-20%).

### Trust stack (all-in for MVP)

- Physical inspection by DodoStays team for "Verified" tier
- Money-back guarantee (Swan Insurance partnership, manual ops absorption pre-partnership)
- Escrow (mandatory under Mauritius Bank of Mauritius rules — implemented via licensed PSP)
- Verified-stay-only two-way reviews

### Headline UX innovation

**Conversational search.** Guest types or speaks (Web Speech API): *"3 beds near Flic en Flac with pool, 14-21 March, under MUR 5000/night"* → Claude Haiku extracts structured filters via JSON-mode → results page with editable filter chips. Falls back to manual filter UI.

### MVP scope

- **Geography:** whole island of Mauritius
- **Property types:** villas, apartments, guesthouses only (no rooms, no hotels)
- **Languages:** English (default), French, Mauritian Creole (post-launch community-sourced)
- **Currencies:** MUR, EUR, GBP, AUD, ZAR, USD

---

## 2. Architecture

### Topology

Single Mauritius-domiciled web platform. Modular .NET 9 monolith (split to microservices later). PostgreSQL with PostGIS. Next.js 15 PWA frontend. Hetzner (Falkenstein) + Cloudflare for hosting and CDN.

```
Next.js 15 PWA (EN/FR/MFE) — Hetzner + Cloudflare
└─ Web Speech API (voice) → AI Search Service
   │
   │ REST + WebSocket (messaging)
   ▼
ASP.NET Core 9 API (modular monolith)
├─ Identity & KYC
├─ Listings & Search
├─ Booking & Calendar
├─ Payments & Payouts
└─ Messaging & Reviews
   │
   ├─ PostgreSQL 16 + PostGIS (Hetzner managed)
   ├─ Anthropic Claude API (search parsing, review moderation)
   ├─ MIPS (Mauritius card acquiring)
   ├─ Wise Business API (host payouts in MUR)
   ├─ Onfido (KYC for guests + hosts)
   ├─ MCB Bank (MUR settlement, business account)
   ├─ Cloudflare R2 (image and PDF storage)
   ├─ Resend (email)
   ├─ Twilio (SMS — booking confirmations only)
   └─ Mapbox (maps)
```

### Modules

#### 2.1 Identity & KYC
- Sign-in: email/password + Google OAuth
- Roles: `guest`, `host`, `admin`, `inspector`
- ID verification: Onfido for both guests and hosts (~$1.50/check)
- Host onboarding captures: TAM (Tourism Authority of Mauritius) license number, MCB/SBM/AfrAsia bank account, VAT number (optional below MUR 3M turnover), business legal name
- Two-factor auth (TOTP) optional for hosts; mandatory for admin
- Data retention per Mauritius Data Protection Act 2017

#### 2.2 Listings & Search
- Listing CRUD with photo upload (Cloudflare R2, server-side resizing)
- Geo-coordinates (PostGIS `geography(Point, 4326)`); region tag for SEO landing pages
- Amenity tags (pool, beach access, Wi-Fi speed, A/C, etc.); admin-curated tag taxonomy
- Pricing: per-night base rate (in MUR), cleaning fee, optional weekend/seasonal multipliers
- Calendar with date-range availability and minimum-stay rules
- Two host onboarding tiers:
  - **Standard:** self-serve, listed within 30 minutes (TAM license verified async)
  - **Verified:** physical inspection + pro photos by DodoStays inspector before listing goes live (3-7 days SLA)
- Guest filter: "Verified only"
- **AI Search Service:** Claude Haiku with structured JSON output schema for filter extraction; confidence < 0.7 → show parsed chips with "Did we get this right?" prompt

#### 2.3 Booking & Calendar
- Booking lifecycle: `pending_payment` → `confirmed` → `checked_in` → `completed` → `reviewed`
- Bookings are immutable once confirmed (modifications via cancel + rebook)
- FX rate frozen on booking row at booking creation; never recomputed
- 15-minute payment hold (Postgres advisory lock on listing+date range during checkout)
- **Bidirectional iCal sync:** Hangfire job every 15 minutes per listing
  - Pull host's external iCal feeds (Airbnb, Booking.com, Vrbo URLs they provide)
  - Push DodoStays bookings to host's external feeds (DodoStays exposes per-listing ICS feed; host imports into Airbnb)
- Money-back guarantee claim flow with 24h response SLA, 48h resolution SLA
- Cancellation policies: standard (full refund 14+ days, 50% 7-14 days, none < 7 days) — host-selectable

#### 2.4 Payments & Payouts
- **Card acquiring:** MIPS hosted checkout (~2.5% MDR, multi-currency capture, MUR settlement to MCB)
- **Funds custody:** held in DodoStays Ltd MCB business account (segregated from operational account)
- **Payouts:** Wise Business API, weekly batch
  - Trigger: 24h post check-in → `eligible_for_payout`
  - Aggregate per host → single Wise transfer per host per week
  - Failed payout: retry 3x over 48h, then ops queue
- **FX:** daily snapshot at 00:00 UTC; locked rate stored on booking; > 24h stale → manual review flag
- **Auto-invoicing** (see §4)
- **Reserve:** MIPS holds 5% reserve for 90 days; chargeback → host payouts paused pending investigation
- **Idempotency:** all payment/payout endpoints accept `Idempotency-Key` header (24h dedupe)

#### 2.5 Messaging & Reviews
- Host↔guest chat: WebSocket primary, email fallback
- Auto-translation (FR ↔ EN ↔ MFE) via Anthropic API; clear "auto-translated" label
- Reviews:
  - Verified-stay only (must have completed booking with successful check-in)
  - Two-way (host reviews guest, guest reviews host) — Airbnb-style blind reveal at 14 days or both submitted
  - Auto-publish with AI flagging (Claude Haiku checks for ToS violations: contact info, off-topic, profanity, off-platform booking attempts)
  - Manual removal only on dispute
- 1-5 star + free text + optional photo

### Cross-cutting concerns

- **Audit log:** `audit_log` table, append-only, every state change with actor + timestamp + before/after JSON; 7-year retention
- **Feature flags:** simple DB-backed table (no LaunchDarkly cost at MVP scale)
- **i18n:** `next-intl` with EN/FR/MFE bundles; FR primary for Mauritian hosts and French/Réunion tourists
- **Observability:** OpenTelemetry → Grafana Cloud free tier (10k metrics + 50GB logs)
- **CI/CD:** GitHub Actions → Hetzner deploy via SSH + Docker

### Hosting & infrastructure cost (MVP)

| Component | Cost (USD/month) |
|---|---|
| Hetzner CX42 app server + managed Postgres | ~$70 |
| Cloudflare (Pro tier + R2 storage) | ~$30 |
| Mapbox (free tier covers ~50k loads/mo) | $0 |
| Anthropic API (~10k searches/mo at Haiku) | ~$30 |
| Resend (3k emails/mo) | $20 |
| Twilio SMS (~500 confirmations/mo) | ~$40 |
| Onfido (estimate 100 KYCs/mo) | ~$150 |
| **Total** | **~$340/mo** |

### Module boundaries

Each module owns its tables; cross-module communication is via C# interfaces. **No cross-module DB joins.** This permits later split into microservices without rewriting business logic.

---

## 3. Critical Data Flows

### 3.1 Guest discovery → booking (the money path)

1. Guest lands on dodostays.com. Currency auto-detected from IP (override available, persists in cookie).
2. Voice or text input: *"3 beds Flic en Flac with pool, 14-21 March, under €150/night"*
3. Web Speech API → transcript → `POST /api/search/parse` → Claude Haiku (structured output) → filter object
4. Search query: PostGIS `ST_DWithin` + filter SQL → ranked listings
5. Card pricing: `nightly × N + cleaning_fee + 15% VAT`, displayed in guest currency at locked daily FX rate
6. Listing detail → "Book now €1,089 (locked)"
7. Booking creation:
   - Insert booking (status=`pending_payment`, FX rate frozen)
   - Reserve dates (Postgres advisory lock, 15-min TTL)
   - Push iCal block to host's external calendars
8. Redirect to MIPS hosted checkout → 3DS → success callback
9. Webhook → mark `confirmed` → send confirmation emails (FR/EN by locale) + auto-invoice
10. Funds in DodoStays MCB account; host sees booking in dashboard

### 3.2 Check-in → payout (the trust path)

1. T-24h: SMS + email reminder to guest with host contact
2. Check-in day: host marks "guest arrived" (or auto-mark T+24h)
3. T+24h post-checkin: booking → `eligible_for_payout`
4. Daily payout job aggregates eligible bookings per host → Wise API → host MCB account in MUR
5. Booking marked `paid`; host commission invoice PDF generated and emailed
6. Day after checkout: review prompts to both parties (14-day window, blind reveal)

### 3.3 Calendar sync (anti-double-book path)

Every 15 min, Hangfire job per listing:
- Pull external iCal feeds → merge → mark conflicts as `blocked-external`
- Push DodoStays confirmed bookings to host's external feeds via our exposed ICS URL

Race-condition handling: if guest A starts checkout AND Airbnb confirms guest B in the same 15-min window:
- Postgres advisory lock during checkout
- Post-MIPS webhook re-validates calendar; conflict → auto-refund + redirect to alternative listings + 5% apology credit

### 3.4 AI search edge case

Input: *"somewhere romantic for honeymoon next month under 2 lakh"*
Claude Haiku extracts:
```json
{
  "region": null,
  "amenities": ["beach_access", "pool"],
  "checkIn": "2026-07-01",
  "checkOut": "2026-07-08",
  "maxTotal": {"INR": 200000},
  "vibe": "romantic"
}
```
- "Romantic" → tag-based filter (`couples-friendly`, set by inspector)
- "Lakh" → INR detected → converted at locked FX rate
- Confidence < 0.7 → editable chips with "Did we get this right?"

### 3.5 Money-back guarantee claim

1. Guest checks in, finds property doesn't match listing
2. Within 24h: opens claim with photos + description
3. Auto-pause payout; flag booking `disputed`
4. Inspector dispatched within 24h (founder/ops in MVP)
5. Resolution paths:
   - Host at fault → full refund + rebook at DodoStays cost + Swan Insurance claim (post-partnership)
   - False claim → guest charged, host paid normally
   - Partial → partial credit
6. **SLA: 48h or auto-refund** — forces ops responsiveness

### Data integrity rules

- Bookings immutable once confirmed (changes via cancel + rebook)
- FX rate frozen on booking row, never recomputed
- Calendar holds expire after 15 min if no payment
- Audit log every state transition (actor + timestamp + before/after)

---

## 4. Auto-Invoicing

### Invoice types

#### Guest invoice (issued on booking confirmation)
- **From:** DodoStays Ltd (Mauritian domestic company)
- **To:** Guest (name + address from checkout)
- **Currency:** guest's locked currency (MUR-equivalent shown in footer for MRA records)
- **Lines:** nightly × N nights, cleaning fee, **15% VAT**, DodoStays service fee (= 0 in MVP, line shown for transparency)
- **Numbering:** `DS-{YYYY}-{seq}` — sequential per Mauritius VAT Act
- **Delivery:** PDF emailed to guest, downloadable from booking page

#### Host commission invoice (issued on payout)
- **From:** DodoStays Ltd
- **To:** Host (legal name + TAM license number)
- **Lines:** gross booking, DodoStays commission (7%), VAT on commission if host VAT-registered, net payout in MUR
- **Numbering:** `DS-COM-{YYYY}-{seq}`
- **Issued:** weekly Wise payout day

#### Host's own guest invoice (the host's accommodation invoice to guest)
- The host is the legal accommodation provider; under Mauritius law they should issue an invoice for the accommodation portion
- DodoStays generates this **on the host's behalf** with their TAM license + VAT details (collected at onboarding)
- Saves Mauritian hosts the manual paperwork Airbnb forces them to do — genuine differentiator

### Edge cases

- **Cancellation:** credit note (`DS-CN-{YYYY}-{seq}`); original invoice retained
- **Currency split:** invoice in guest currency, footer shows MUR equivalent at locked FX rate (MRA requirement)
- **Modifications:** not allowed — cancel + rebook (clean audit trail)

### Tech

- PDF generation: **QuestPDF** (.NET, open-source, free)
- Storage: Cloudflare R2, signed URLs
- Email: Resend
- Sequence numbers: Postgres sequence (gapless, MRA-required)
- Compliance: MRA VAT Act 1998 + Tourism Authority requirements

**Effort estimate:** ~3-4 dev days extra in MVP.

---

## 5. Errors, Edge Cases & Security

### Failure modes

| Scenario | Handling |
|---|---|
| MIPS payment fails after webhook delay | Booking auto-cancels after 15-min hold; calendar released; guest notified with retry link |
| MIPS webhook never arrives | Reconciliation job every 5 min: poll MIPS API for any `pending_payment > 10 min`, sync state |
| Wise payout fails (host bank issue) | Retry 3x over 48h, then manual ops queue; funds stay in MCB; host notified via email + dashboard banner |
| Double-booking despite iCal sync | Auto-detect on confirmation; cancel newer booking + full refund + 5% apology credit + ops escalation |
| Host marks "no-show" but guest claims arrival | 24h dispute window; resolved via WhatsApp/photo evidence; default favors guest with verified ID |
| AI search returns 0 results | Fallback to broader search (drop strictest filter); show "Showing similar — adjust filters?" with chips |
| AI search misparses intent | Confidence < 0.7 → show parsed chips + manual filter UI |
| Anthropic API down | Fallback to keyword search (Postgres full-text); banner: "Smart search temporarily unavailable" |
| Onfido KYC fails | Manual review queue; guest blocked from booking until resolved |
| Inappropriate listing photos | Cloudflare Images AI moderation flag; manual review before publish (Verified) or async takedown (Standard) |
| VPN currency spoofing | Currency editable per page; FX locked at booking; spoofing pre-booking has no price effect |
| Listing condition drift | Random re-inspection every 6 months; guest report → re-inspection within 30 days; verified badge revocable |
| Host force-majeure cancellation | Auto-rebook from similar listings + 10% credit; host gets one strike (3 strikes = delisted) |

### Security & compliance

- **Auth:** ASP.NET Core Identity + JWT (15 min access) + refresh tokens (30 days). 2FA TOTP optional (host) / mandatory (admin).
- **PII:** ID documents AES-256 at rest, 7-year retention per Data Protection Act, deletion API endpoint
- **Payment data:** never stored; MIPS hosted checkout = SAQ-A scope
- **Rate limits:** 10 req/sec per IP for search, 1 req/min for booking creation; Cloudflare WAF
- **CSRF/XSS:** anti-forgery tokens on all mutations, strict Content-Security-Policy
- **Audit log:** append-only, 7-year retention
- **Data Protection Office** registration at incorporation; SCCs for data leaving Mauritius (e.g. Anthropic API in US)
- **AML:** OFAC/UN sanctions screening on host signup; STRs filed by MIPS for transactions > MUR 500k

### Concurrency & integrity

- Postgres advisory locks on `(listing_id, date_range)` during checkout
- Calendar holds: 15-min TTL
- Idempotency keys: 24h dedupe window
- iCal sync: external > internal precedence (don't override Airbnb-confirmed bookings)
- FX rate freshness: never serve > 24h stale; if snapshot fails, flag for manual review

### Abuse prevention

- **Fake reviews:** auto-flag reviews where guest never communicated with host; AI flag on contact info / promo / ToS violations
- **Listing scams:** Verified inspection; Standard tier requires bank verification + ID + TAM number
- **Chargebacks:** MIPS holds 5% reserve 90 days; chargeback → auto-pause host payouts pending investigation
- **Multi-account abuse:** device fingerprint + ID hash check at signup

### Disaster recovery

- Postgres PITR via Hetzner managed Postgres; daily snapshots → Cloudflare R2 (off-region)
- **RTO:** 4 hours. **RPO:** 1 hour.
- Funds custody: MCB business account, never in operational account; clean separation enforced in accounting

---

## 6. Testing & Launch

### Testing strategy

| Layer | Approach |
|---|---|
| Unit | xUnit; focus on commission/VAT calc, FX freezing, calendar conflict — the "money correctness" zones. Target 80% coverage on these modules only, not blanket. |
| Integration | Testcontainers for Postgres + PostGIS; real DB, mocked external APIs |
| Contract | Mocked MIPS/Wise webhooks via JSON fixtures; replay real payloads after first prod transactions |
| E2E | Playwright on critical paths: search → book → pay → check-in → review → payout. ~10 scenarios on PR. |
| AI search regression | Fixture file: 50 example queries → expected filter outputs. Run on every Claude model bump. |
| Load | k6 against search (target 100 req/sec sustained); booking endpoint (10 req/sec) |
| Manual QA | Internal staging with seeded data; team books real listings end-to-end pre-launch |

### Launch plan

#### Phase 0 — Soft launch (weeks 1-2 post-build, ~50 listings)
- Hand-pick 50 listings via cleaning-business clients + network
- All Verified tier (founder personally inspects + photographs)
- Friends & family bookings only (5-10 real bookings to test full flow)
- No marketing
- **Exit:** 10 successful end-to-end bookings + payouts, zero financial discrepancies

#### Phase 1 — Public soft launch (weeks 3-12, target 200 listings)
- Open self-serve host signup (Standard + Verified tiers)
- Marketing: French/UK Facebook + Google Ads on long-tail ("Flic en Flac villa with pool"); ~AUD $5k/mo budget
- WhatsApp host community engagement (real estate agent partnerships)
- **Exit:** 50+ confirmed bookings/month, < 5% cancellation rate, NPS > 40

#### Phase 2 — Growth (months 4-12, target 1000 listings + 500 bookings/mo)
- SEO content (region pages: Grand Baie, Tamarin, Belle Mare, Le Morne)
- Native host mobile app (React Native, sharing API with web)
- Money-back guarantee → underwritten by Swan Insurance partnership
- Channel partnerships (Mauritius Tourism Authority, Air Mauritius)

### Success metrics (track from day 1)

**Marketplace health**
- Listings live (Standard / Verified split)
- Bookings/month, GMV/month
- Average take rate (target 7%)
- Verified-tier % of GMV (trust premium proxy)

**Guest experience**
- Search → booking conversion rate
- AI-search-used % (vs manual filter)
- Time to book (median seconds)
- Cancellation rate (host-fault vs guest-fault split)
- NPS (post-stay)
- Money-back claims raised vs upheld

**Host experience**
- Time to first booking (signup → first booking)
- Listings per host (multi-listing = power host)
- Host churn (left vs delisted)
- Host NPS (quarterly)

**Finance & ops**
- Cost per booking (infra + ops)
- Wise payout failure rate
- MIPS chargeback rate
- AI search cost per query (target < $0.005)
- Inspector throughput (verifications/week)

**Compliance**
- TAM license attach rate (% with valid TAM number)
- VAT correctly applied: 100% (audit metric)
- Onfido KYC pass rate

---

## 7. Out of Scope (NOT in MVP)

- Native mobile apps (PWA only)
- Experiences / activities / transfers / car rental
- Multi-property dynamic pricing engine (seasonal calendars OK)
- Loyalty / referral programs
- Hotels (always)
- Long-stay discount engine (manual host setting only)
- AI ranking / "why this matches" explanations (phase 2)
- Money-back guarantee insurance underwriting (manual ops absorption pre-Swan)
- Host channel manager UI (we sync iCal, but no fancy multi-channel rate dashboard)
- Request-to-book flow (instant book only is the wedge)
- Guest-side fees (0% guest fee is the wedge)

---

## 8. Open Items (pre-implementation)

The following must be resolved before or during implementation but do not block design approval:

1. **Brand verification:** trademark search (USPTO TESS, Mauritius IPO, EUIPO, IP Australia) and `dodostays.com` registrar check. Backup names if blocked.
2. **Mauritian domestic company incorporation:** 3-5 working days via CBRD (~MUR 3,000); founder identification documents required.
3. **MCB business account opening:** 4-8 weeks for non-resident directors; on-site visit likely required.
4. **MIPS merchant agreement:** application + KYB; estimate 4-6 weeks.
5. **Wise Business account:** open from Australia; standard onboarding.
6. **Onfido contract:** standard self-serve.
7. **Anthropic API account:** standard self-serve.
8. **Tourism Authority of Mauritius consultation:** confirm host TAM license verification API or process.
9. **Australian holding company structure:** consult tax adviser on CFC implications (no Australia-Mauritius DTA).
10. **Data Protection Office registration** as data controller; SCCs drafted for cross-border transfers.
11. **Swan Insurance partnership** scoping (deferrable to phase 2).
12. **Domain + brand audit:** `dodostays.com`, `dodostays.mu`, social handles.

---

## 9. Strategic Context

### Market summary (from research)

- Mauritius tourism: 1.38M overnight arrivals 2024, USD 1.9B receipts (~13.5% GNP)
- No credible local STR marketplace exists; global OTAs (Airbnb ~3-5k MU listings, Booking.com) dominate
- Top source markets: France, UK, Réunion, Germany, South Africa — 30%+ Francophone (Airbnb's Anglo-default UX is a real weakness)
- Host pain points: 15-20% commissions + 2-4% FX haircut on USD/EUR→MUR + slow payouts + no French/Creole support + no VAT/TAM-license help

### Why this can work

- Real, named pain point (FX, commissions, payouts, language)
- Founder has cleaning-business distribution channel for host acquisition in Flic en Flac/Tamarin
- 7% commission is credibly cheaper, marketable in one sentence
- AI conversational search is a wedge Airbnb has not credibly executed
- Mauritius Premium Visa (free, 1-year renewable) lets founder spend extended periods on the ground

### Why this is hard (acknowledged)

- Guest-side CAC vs Airbnb's $2.1B/yr marketing spend is the existential challenge
- Travel marketplace graveyard: Wimdu, 9flats, HouseTrip — all failed or absorbed
- 1-2 person AU founding team is undercapitalized for guest scale-up; $500k-1M seed likely needed by month 12
- Phase 2 will require a Mauritius-resident founder or operations lead
- Multi-homing is the realistic year 1-2 supply pattern (hosts will list everywhere)

### Mitigation thesis

- Phase 0/1 supply-side land grab via cleaning-business + WhatsApp/real-estate partnerships before paying for guest acquisition
- AI search wedge captures intent that Airbnb's keyword search misses
- French/Creole + Verified inspection differentiate on dimensions Airbnb structurally cannot match
- Austrade EMDG grant offsets ~50% of marketing spend up to AUD $80k/yr

---

*End of design.*
