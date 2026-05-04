import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

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

    let fileName = file.name;
    let fileContent = buffer;

    // Check if file is Excel
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      // Parse Excel and convert to CSV
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);
      fileContent = Buffer.from(csvContent, 'utf8');
      fileName = fileName.replace(/\.(xlsx|xls)$/i, '.csv');
    }

    // Write to backend/uploads/
    const uploadsDir = path.join(process.cwd(), "..", "backend", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, fileContent);

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      fileName: fileName,
      domain: domain,
      size: fileContent.length,
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
