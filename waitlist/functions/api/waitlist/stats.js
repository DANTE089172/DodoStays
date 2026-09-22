/* GET /api/waitlist/stats — aggregate counts for social proof (no PII).
   Mirrors the .NET GetStatsAsync: { total, travellers, hosts }. */

export async function onRequestGet({ env }) {
  const rows = await env.DB.prepare(
    "SELECT audience, COUNT(*) AS c FROM waitlist_signups GROUP BY audience"
  ).all();

  let travellers = 0;
  let hosts = 0;
  for (const r of rows.results ?? []) {
    if (r.audience === 0) travellers = r.c;
    else if (r.audience === 1) hosts = r.c;
  }

  // Launch social-proof baseline. Real signups increment on top of these seed
  // numbers, so the counts only ever grow — and because the offset lives here
  // (not in the static HTML/JS) the page never ships a hard-coded figure.
  const baseTravellers = Number(env.WAITLIST_BASELINE_TRAVELLERS ?? 0);
  const baseHosts = Number(env.WAITLIST_BASELINE_HOSTS ?? 0);
  if (Number.isFinite(baseTravellers)) travellers += baseTravellers;
  if (Number.isFinite(baseHosts)) hosts += baseHosts;

  return new Response(JSON.stringify({ total: travellers + hosts, travellers, hosts }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
