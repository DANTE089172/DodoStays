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

  return new Response(JSON.stringify({ total: travellers + hosts, travellers, hosts }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
