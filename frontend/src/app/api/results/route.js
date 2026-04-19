import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const reportPath = path.join(
      process.cwd(),
      "..",
      "backend",
      "output",
      "report.json"
    );

    if (!fs.existsSync(reportPath)) {
      return NextResponse.json(
        { error: "No validation results found. Run a job first." },
        { status: 404 }
      );
    }

    const raw = fs.readFileSync(reportPath, "utf-8");
    const report = JSON.parse(raw);

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("[RESULTS ERROR]", error);
    return NextResponse.json(
      { error: "Failed to read results: " + error.message },
      { status: 500 }
    );
  }
}
