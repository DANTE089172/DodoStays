/* POST /api/waitlist — join the DodoStays waitlist.
   Cloudflare Pages Function backed by D1. Faithfully mirrors the .NET
   WaitlistService contract: validates the payload, normalises it, and performs
   an idempotent insert on (email, audience), returning
   { id, email, audience, createdAt, alreadyOnList }. */

const AUDIENCE_LABEL = { 0: "Traveller", 1: "Host" };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SELECT_ONE =
  "SELECT id, email, audience, created_at FROM waitlist_signups WHERE email = ?1 AND audience = ?2";

function parseAudience(a) {
  if (typeof a === "number") return a === 0 || a === 1 ? a : null;
  if (typeof a === "string") {
    const s = a.trim().toLowerCase();
    if (s === "traveller" || s === "0") return 0;
    if (s === "host" || s === "1") return 1;
  }
  return null;
}

function clean(v) {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function cleanLower(v) {
  const c = clean(v);
  return c ? c.toLowerCase() : null;
}

function len(v) {
  return typeof v === "string" ? v.trim().length : 0;
}

function json(obj, status = 200, contentType = "application/json") {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": contentType + "; charset=utf-8" },
  });
}

function validationProblem(errors) {
  return json(
    {
      type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
      title: "One or more validation errors occurred.",
      status: 400,
      errors,
    },
    400,
    "application/problem+json"
  );
}

function toDto(row, alreadyOnList) {
  return {
    id: row.id,
    email: row.email,
    audience: AUDIENCE_LABEL[row.audience] ?? row.audience,
    createdAt: row.created_at,
    alreadyOnList,
  };
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return validationProblem({ Body: ["Request body must be valid JSON."] });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const audience = parseAudience(body.audience);
  const errors = {};

  if (!email) errors.Email = ["Please enter your email address."];
  else if (email.length > 320) errors.Email = ["That email address is too long."];
  else if (!EMAIL_RE.test(email)) errors.Email = ["Please enter a valid email address."];

  if (audience === null)
    errors.Audience = ["Please choose whether you want to book stays or list a place."];
  if (len(body.name) > 200) errors.Name = ["Name is too long (200 characters max)."];
  if (len(body.region) > 120) errors.Region = ["Region is too long (120 characters max)."];
  if (len(body.message) > 2000) errors.Message = ["Message is too long (2000 characters max)."];
  if (len(body.locale) > 16) errors.Locale = ["Locale is too long (16 characters max)."];
  if (len(body.source) > 500) errors.Source = ["Source is too long (500 characters max)."];

  if (Object.keys(errors).length) return validationProblem(errors);

  const normEmail = email.toLowerCase();
  const db = env.DB;

  const existing = await db.prepare(SELECT_ONE).bind(normEmail, audience).first();
  if (existing) return json(toDto(existing, true));

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    await db
      .prepare(
        "INSERT INTO waitlist_signups (id, email, audience, name, region, message, locale, source, created_at) " +
          "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
      )
      .bind(
        id,
        normEmail,
        audience,
        clean(body.name),
        cleanLower(body.region),
        clean(body.message),
        cleanLower(body.locale),
        clean(body.source),
        createdAt
      )
      .run();
  } catch (err) {
    // Lost a race against a concurrent identical signup — the unique index
    // caught it. Re-read and treat as already-on-list (matches the .NET path).
    const raced = await db.prepare(SELECT_ONE).bind(normEmail, audience).first();
    if (raced) return json(toDto(raced, true));
    throw err;
  }

  return json(toDto({ id, email: normEmail, audience, created_at: createdAt }, false));
}
