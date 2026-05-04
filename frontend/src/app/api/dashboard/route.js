import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

/**
 * GET /api/dashboard
 * Proxies to the backend Express server which queries DB2.
 */
export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/dashboard`, {
      cache: "no-store",
    });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Backend error" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[DASHBOARD PROXY ERROR]", error);
    return NextResponse.json(
      {
        error:
          "Cannot connect to backend server. Make sure to run: node server.js (in the backend folder)",
      },
      { status: 502 }
    );
  }
}
