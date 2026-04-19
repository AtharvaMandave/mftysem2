import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request) {
  try {
    const { domain, fileName } = await request.json();

    if (!domain || !fileName) {
      return NextResponse.json(
        { error: "Domain and fileName are required" },
        { status: 400 }
      );
    }

    const backendDir = path.join(process.cwd(), "..", "backend");
    const scriptPath = path.join(backendDir, "simulateMainframe.js");
    const inputPath = path.join(backendDir, "uploads", fileName);

    console.log(`[RUN-JOB] Executing mainframe simulation...`);
    console.log(`[RUN-JOB] Domain: ${domain}`);
    console.log(`[RUN-JOB] Input:  ${inputPath}`);

    const { stdout, stderr } = await execAsync(
      `node "${scriptPath}" "${domain}" "${inputPath}"`,
      { cwd: backendDir, timeout: 30000 }
    );

    if (stderr) {
      console.warn("[RUN-JOB STDERR]", stderr);
    }

    console.log("[RUN-JOB STDOUT]", stdout);

    return NextResponse.json({
      success: true,
      message: "Mainframe batch job completed",
      output: stdout,
    });
  } catch (error) {
    console.error("[RUN-JOB ERROR]", error);
    return NextResponse.json(
      {
        error: "Job execution failed: " + error.message,
        stderr: error.stderr || "",
      },
      { status: 500 }
    );
  }
}
