import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const domain = formData.get("domain");

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!domain) {
      return NextResponse.json(
        { error: "No domain specified" },
        { status: 400 }
      );
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Write to backend/uploads/
    const uploadsDir = path.join(process.cwd(), "..", "backend", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, file.name);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      fileName: file.name,
      domain: domain,
      size: buffer.length,
      path: filePath,
    });
  } catch (error) {
    console.error("[UPLOAD ERROR]", error);
    return NextResponse.json(
      { error: "Upload failed: " + error.message },
      { status: 500 }
    );
  }
}
