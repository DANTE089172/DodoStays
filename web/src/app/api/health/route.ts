import { NextResponse } from "next/server";

export async function GET() {
  const apiBase = process.env.API_BASE_URL ?? "http://localhost:5080";
  try {
    const res = await fetch(`${apiBase}/health/ready`, { cache: "no-store" });
    const body = await res.json();
    return NextResponse.json({ web: "ok", api: body }, { status: res.ok ? 200 : 503 });
  } catch (err) {
    return NextResponse.json(
      { web: "ok", api: "unreachable", error: (err as Error).message },
      { status: 503 }
    );
  }
}
