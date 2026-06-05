# DodoStays Plan 04 — Payments + Auto-Invoicing (Mauritian VAT, MUR-only)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Confirm booking" stops being a stub. Real payment capture (mocked via `InMemoryPaymentProcessor` in dev — MIPS skeleton ready for production), idempotent confirmation, auto-generated guest invoice PDFs (QuestPDF), email confirmation via Resend (also mocked in dev), and a weekly Hangfire payout job that batches per-host transfers via `IPayoutProcessor` (Wise skeleton). MUR-only — multi-currency deferred to Plan 06.

**Architecture:**
- **`IPaymentProcessor`** abstraction with `InMemoryPaymentProcessor` (default) and `MipsPaymentProcessor` (skeleton, throws when called).
- **`IPayoutProcessor`** abstraction with `InMemoryPayoutProcessor` (default) and `WiseBusinessPayoutProcessor` (skeleton).
- **`IInvoiceGenerator`** with QuestPDF guest + commission invoice templates.
- **`IEmailSender`** with `ResendEmailSender` (skeleton) and `LogEmailSender` (default — writes to console + file under `wwwroot/emails/`).
- **`IFxRateProvider`** with `FixedFxRateProvider` (default — 1 MUR = 1 MUR; multi-currency in Plan 06).
- New module `Modules/Payments/` owns processor, invoice, email abstractions.
- `BookingService.ConfirmAsync` becomes idempotent via `Idempotency-Key` header + `IdempotencyKey` table.
- `BookingPayoutJob` Hangfire recurring weekly: aggregates eligible (CheckedIn + 24h) bookings by host, calls `IPayoutProcessor`, generates host commission invoice, marks booking `payout_status` = Paid.
- Frontend: confirm button now triggers a real flow (still no real card UI — plan 06 wires that). Booking detail at `/bookings/[id]` shows invoice PDF download link.

**Pre-conditions:**
- Plan 03 Sections A + B + C complete: 8 booking endpoints, hold/confirm/cancel/checkin lifecycle, calendar service, iCal sync via Hangfire (so the DI container already knows Hangfire), guest booking flow + /bookings dashboard
- Backend at http://localhost:5080; ~137 backend tests + 7 e2e all passing
- Frontend Sega & Sand × Cinema Maurice; MUI v6 hybrid

---

## File Structure (this plan adds)

```
api/src/Dodostays.Api.Contracts/
  Payments/
    PaymentStatus.cs                 # enum
    PayoutStatus.cs                  # enum
    PaymentReceiptDto.cs
    InvoiceDto.cs
    InvoiceKind.cs                   # GuestStay | HostCommission | CreditNote
    BookingPaymentSummaryDto.cs

api/src/Dodostays.Api/Modules/Payments/
  PaymentsModule.cs
  Domain/
    PaymentRecord.cs                 # entity per attempt
    HostPayout.cs                    # entity per weekly batch
    Invoice.cs                       # entity (sequence-numbered)
    IdempotencyKey.cs                # entity
  Database/
    DodostaysDbContext.Payments.cs   # partial
    PaymentEntityConfigurations.cs
  Processing/
    IPaymentProcessor.cs
    InMemoryPaymentProcessor.cs
    MipsPaymentProcessor.cs          # skeleton
    PaymentOptions.cs
  Payouts/
    IPayoutProcessor.cs
    InMemoryPayoutProcessor.cs
    WiseBusinessPayoutProcessor.cs   # skeleton
    PayoutOptions.cs
    BookingPayoutJob.cs              # Hangfire weekly job
  Fx/
    IFxRateProvider.cs
    FixedFxRateProvider.cs
    FxOptions.cs
  Invoices/
    IInvoiceGenerator.cs
    QuestPdfInvoiceGenerator.cs
    InvoiceSequenceService.cs
  Email/
    IEmailSender.cs
    LogEmailSender.cs
    ResendEmailSender.cs             # skeleton
    EmailOptions.cs
    BookingConfirmationEmail.cs      # template
  Idempotency/
    IIdempotencyStore.cs
    IdempotencyService.cs
  Endpoints/
    GetBookingInvoiceEndpoint.cs     # GET /api/bookings/{id}/invoice
    GetBookingDetailEndpoint.cs      # GET /api/bookings/{id}
  IntegrationHooks/
    PaymentsBookingHooks.cs          # called by ConfirmAsync after state change

api/src/Dodostays.Api/Modules/Bookings/
  Services/
    BookingService.cs                # MODIFIED — calls payment processor + idempotency + payout-status init
  Endpoints/
    ConfirmBookingEndpoint.cs        # MODIFIED — reads Idempotency-Key header
  Integration/
    PaymentBridge.cs                 # interface BookingService calls into Payments

api/tests/
  Dodostays.Api.Tests/
    Payments/
      InMemoryPaymentProcessorTests.cs
      InMemoryPayoutProcessorTests.cs
      InvoiceSequenceServiceTests.cs
      IdempotencyServiceTests.cs
      QuestPdfInvoiceGeneratorTests.cs    # asserts ICS-style header + total visible
      FixedFxRateProviderTests.cs
  Dodostays.Api.IntegrationTests/
    Payments/
      ConfirmBookingPaymentFlowTests.cs    # confirm with idempotency-key + receipt + email + invoice
      PayoutJobFlowTests.cs                # run job; assert payout records + commission invoice
      InvoiceDownloadFlowTests.cs

web/src/
  lib/
    payments.ts                            # API client
  components/
    bookings/
      booking-detail.tsx                   # existing or NEW
      invoice-download-button.tsx
  app/
    bookings/
      [id]/
        page.tsx                           # NEW — booking detail with invoice link
  e2e/
    payments.spec.ts                       # confirm + invoice download
```

**Tech stack additions:**
- `QuestPDF` (free OSS) for invoice PDFs
- `Resend` (HTTP API; only call shape needed for the skeleton)
- No new DB migrations BEYOND what we add (Payments tables: `PaymentRecords`, `HostPayouts`, `Invoices`, `IdempotencyKeys`)

**Config block (added):**

```json
"Payments": {
  "Provider": "InMemory",
  "MipsApiKey": "",
  "MipsBaseUrl": "",
  "MipsMerchantId": "",
  "MerchantOfRecord": "DodoStays Ltd",
  "MerchantVatNumber": "VAT12345678",
  "MerchantAddress": "Mauritius"
},
"Payouts": {
  "Provider": "InMemory",
  "WiseApiKey": "",
  "WiseProfileId": "",
  "CommissionPercent": 7
},
"Fx": {
  "Provider": "Fixed"
},
"Email": {
  "Provider": "Log",
  "ResendApiKey": "",
  "FromAddress": "noreply@dodostays.com",
  "OutputDir": "wwwroot/emails"
},
"Invoicing": {
  "GuestSequencePrefix": "DS",
  "CommissionSequencePrefix": "DS-COM",
  "CreditNoteSequencePrefix": "DS-CN"
}
```

---

## Plan 04 — Task Outline (10 tasks)

Numbered for clarity; each lands in a separate commit. The plan content below is a **scope spec** — actual TDD-tight code blocks per task will be expanded if/when execution starts (this file is already long; the depth-first specs come at execute time, similar to how Plan 03 Sections B/C are written but executed task-by-task).

### Task 4.1: Payments contracts + entities + migration

- 5 contract files (`PaymentStatus`, `PayoutStatus`, `PaymentReceiptDto`, `InvoiceDto`, `InvoiceKind`, `BookingPaymentSummaryDto`)
- 4 entities (`PaymentRecord`, `HostPayout`, `Invoice`, `IdempotencyKey`) + EF configurations
- New migration `AddPaymentsSchema`
- Schema highlights:
  - `PaymentRecords (Id, BookingId FK, ProcessorId, ExternalRef, AmountMur, Status, AttemptedAt, SucceededAt?, FailureReason?, RawPayload jsonb)`
  - `HostPayouts (Id, HostUserId, BookingIds[], TotalGrossMur, CommissionMur, NetMur, Status, ExternalRef?, AttemptedAt, SucceededAt?, FailureReason?)`
  - `Invoices (Id, Number, Kind, BookingId, IssuedToDisplayName, IssuedToVatNumber?, GrossMur, VatMur, NetMur, PdfStoragePath, IssuedAt)`
  - `IdempotencyKeys (Id, KeyHash, BookingId, ResponseBody jsonb, CreatedAt, ExpiresAt)`

### Task 4.2: Payment processor abstraction + InMemory impl + MIPS skeleton + tests

- `IPaymentProcessor.AuthorizeAndCaptureAsync(bookingId, amountMur, idempotencyKey, ct) → PaymentReceiptDto`
- `InMemoryPaymentProcessor` returns success after 200ms with synthetic ExternalRef
- `MipsPaymentProcessor` — config-driven, throws `NotImplementedException` if called (matching Onfido/Wise pattern from earlier plans)
- 4 unit tests on InMemory: success, deterministic-on-same-idempotency-key, deterministic-amount-shape, ExternalRef-uniqueness

### Task 4.3: Idempotency service + tests

- `IIdempotencyStore` (DB-backed via `IdempotencyKeys` table, 24h TTL)
- `IdempotencyService.GetOrExecuteAsync<TResult>(headerKey, scope, factory)` — hashes the header value with scope ("bookingId:xxx") to prevent cross-booking key reuse, stores response body for replay
- 5 unit tests: cache miss → factory invoked once; cache hit → factory NOT invoked, same body returned; expired entry → factory re-invoked; collision across scopes → independent; null header → no caching applied

### Task 4.4: FX rate provider (Fixed for now)

- `IFxRateProvider.GetRateAsync("MUR", "EUR", ct)` — `FixedFxRateProvider` returns 1.0 if same currency, else throws `"Plan 06 multi-currency"`. We're MUR-only this plan, so the provider is just plumbing for the future.
- 2 trivial unit tests

### Task 4.5: Invoice generator (QuestPDF) + sequence service + tests

- `InvoiceSequenceService.NextNumberAsync(InvoiceKind)` — Postgres `CREATE SEQUENCE` per kind (gapless, MRA-required); names: `inv_guest_seq`, `inv_commission_seq`, `inv_credit_note_seq`. Format: `DS-{YYYY}-{seq:D5}` / `DS-COM-{YYYY}-{seq:D5}` / `DS-CN-{YYYY}-{seq:D5}`.
- `QuestPdfInvoiceGenerator.GenerateGuestInvoice(invoice, booking)` produces a PDF byte[] with the Sega & Sand brand mark + line items + 15% VAT + total. Stored under `wwwroot/invoices/{year}/{month}/{number}.pdf` via `IPhotoStorage`-style abstraction.
- `IInvoiceGenerator.GenerateHostCommissionAsync(booking, payout)` — same template, different copy.
- Tests: byte-content sanity (PDF magic bytes), sequence monotonic, sequence gapless across InvoiceKind boundaries

### Task 4.6: Email sender (Log default + Resend skeleton) + tests

- `LogEmailSender` writes JSON-formatted email + attached invoice PDF to `wwwroot/emails/{utcDate}/{messageId}.eml.json` so dev can inspect what would have been sent
- `ResendEmailSender` skeleton — config-driven, throws `NotImplementedException` if invoked when `Provider=Resend` until launch readiness
- `BookingConfirmationEmail.cs` template (Plex-styled HTML; same brand mark)
- 2 unit tests on LogEmailSender (file written, JSON parseable)

### Task 4.7: BookingService.ConfirmAsync — wire payment + idempotency + invoice + email

- Add `IPaymentProcessor`, `IIdempotencyService`, `IInvoiceGenerator`, `IEmailSender`, `InvoiceSequenceService` deps to `BookingService`
- New flow inside `ConfirmAsync`:
  1. Resolve idempotency key from request header (passed via `ConfirmBookingRequest.IdempotencyKey?` field added in Task 4.1)
  2. If key exists & cached → return cached `BookingDto`
  3. Else: capture payment via `IPaymentProcessor`
  4. On success: `MarkConfirmed(externalRef)`, generate guest invoice PDF via `IInvoiceGenerator`, persist `Invoice` + `PaymentRecord` rows
  5. Send confirmation email via `IEmailSender` (fire-and-forget; failure logged but doesn't fail confirm)
  6. Cache response under idempotency key
  7. Remove holds, save changes, return DTO
- Modify `ConfirmBookingEndpoint` to read `Idempotency-Key` header and put it on the request
- Migration: `Booking` gains `PayoutStatus` column (default `NotEligible`); becomes `Eligible` 24h after CheckedIn
- 4 integration tests:
  - Confirm without idempotency key → payment captured, booking confirmed, invoice generated, email enqueued, returns BookingDto with ConfirmedAt set
  - Confirm WITH idempotency key TWICE → payment processor called ONCE, both responses identical
  - Confirm with EXPIRED hold → 409 Conflict ("Hold expired")
  - Cancel a Confirmed booking → BookingDto.State = Cancelled (refund logic deferred)

### Task 4.8: BookingPayoutJob (Hangfire weekly) + tests

- Recurring at `0 9 * * MON` (Mondays 9 AM Mauritius — UTC+4 → 5 AM UTC)
- Logic:
  1. Find all Bookings with `PayoutStatus=Eligible`, `State in (CheckedIn, Completed)`, `CheckedInAt <= UtcNow.AddDays(-1)`, NOT YET in any active `HostPayout`
  2. Group by HostUserId
  3. For each host: compute gross = sum(TotalMur), commission = gross × `Payouts:CommissionPercent`/100, net = gross - commission
  4. Create `HostPayout` row with `Status=Pending`, attach booking IDs
  5. Call `IPayoutProcessor.SendAsync(host, netMur, idempotencyKey)`
  6. On success: mark `HostPayout.Status=Paid`, generate commission invoice via `IInvoiceGenerator`, mark each booking `PayoutStatus=Paid`
  7. Send host receipt email
- `InMemoryPayoutProcessor` returns success after 200ms (synthetic ExternalRef)
- `WiseBusinessPayoutProcessor` skeleton — throws unless `Provider=Wise`
- 2 integration tests: payout creates HostPayout + commission invoice; only `Eligible` bookings included

### Task 4.9: Booking detail endpoint + invoice download endpoint + tests

- `GET /api/bookings/{id}` → returns `BookingDto` (already exists from Section A as `BookingService.GetAsync`); endpoint wraps it
- `GET /api/bookings/{id}/invoice` → returns redirect to signed URL of `wwwroot/invoices/{path}.pdf` (similar HMAC pattern to iCal feed; OR we can serve directly via `Results.File`)
  - Auth required: only the booking's guest OR host can fetch
  - 404 if booking has no invoice yet (still PendingPayment)
- 2 integration tests: download succeeds for guest, download forbidden for unrelated user

### Task 4.10: Frontend booking detail + invoice download + e2e

- New page `/bookings/[id]` with full BookingDto display + Cancel button + invoice download link
- Update `/bookings` cards to link to `/bookings/[id]` (currently they link to the listing)
- Update `BookingSidebar` confirm flow to set `Idempotency-Key` header on the request (using `crypto.randomUUID()`)
- e2e test that completes booking → opens detail page → asserts invoice link visible → clicks → downloads succeeds

---

## Plan 04 — Definition of Done

- [ ] `IPaymentProcessor` + `IPayoutProcessor` + `IFxRateProvider` + `IEmailSender` + `IInvoiceGenerator` all live with dev defaults + production skeletons
- [ ] `BookingService.ConfirmAsync` is idempotent, captures payment, generates invoice, sends confirmation email
- [ ] Hangfire `BookingPayoutJob` runs weekly; produces commission invoices; marks bookings `PayoutStatus=Paid`
- [ ] `wwwroot/invoices/` directory contains generated PDFs (gitignored)
- [ ] `wwwroot/emails/` directory contains LogEmailSender output (gitignored)
- [ ] Backend tests: ~17 new unit + 6 new integration = ~160+ total
- [ ] Frontend `/bookings/[id]` detail page; invoice download works
- [ ] e2e: 8 total (added `payments.spec.ts`)

**Out of scope (NOT in Plan 04):**
- Real MIPS card capture UI (defer until merchant account exists; the abstraction is in place)
- Real Wise payout (skeleton calls Haversine-style fallback; defer until Wise Business account exists)
- Real Resend / Mailgun email (skeleton; defer until domain DNS + DKIM set)
- Multi-currency display + FX freezing (Plan 06 — needs locale work)
- Refund rules tied to cancellation policy (host-selectable on listing) — Plan 06 polish
- Stripe-style 3D Secure — Plan 06
- Tax invoice in French (FR locale) — Plan 06
- Webhook receivers for async payment events (defer until real PSP integration)

## Open Items (deferred)

1. **MIPS sandbox sign-up** — when ready, swap `Payments:Provider=Mips` and complete the skeleton. The InMemory processor will keep dev/test working until then.
2. **Mauritius MRA invoice spec** — verify exact field requirements (sequential numbering is required; signed VAT number is required if VAT-registered above MUR 3M turnover) with a Mauritian tax adviser before launch.
3. **Email transport contract** — Resend vs Postmark vs SES decision deferred. Skeleton works for any HTTP-based provider.
4. **Refund rules** — currently `cancel` just transitions state; no money moves. Real refund tied to `Payments:Provider` capture-then-refund flow happens once a PSP is integrated.
5. **Webhook signing** — when MIPS is wired, we'll need a `/api/webhooks/mips` endpoint with HMAC verification.

---

**Why this plan is shorter than 03 Section B:** I'm trusting the patterns we've established (interface + InMemory impl + skeleton + DI switch + appsettings) to be self-evident at execute time. Each task above will get a TDD-shaped, code-blocked spec when we dispatch it via subagents — same way Plans 02b/03 expand. Writing the full ~3,500-line spec now would push this file past readability; the outline gives you the *shape* and *trade-offs* without the boilerplate.

If you want the full per-task code spec before execution, tell me to expand Plan 04 into a longer document.
