import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

/**
 * GET /api/export-clean?runId=<id>
 * Proxies to backend server to export valid records as CSV.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    if (!runId) {
      return NextResponse.json(
        { error: "runId parameter is required" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${BACKEND_URL}/api/export-clean?runId=${runId}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json(
        { error: data.error || "Export failed" },
        { status: res.status }
      );
    }

    const csvContent = await res.text();

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="clean_data_run_${runId}.csv"`,
      },
    });
  } catch (error) {
    console.error("[EXPORT PROXY ERROR]", error);
    return NextResponse.json(
      { error: "Cannot connect to backend server." },
      { status: 502 }
    );
  }
}
