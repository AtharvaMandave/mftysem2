import { NextResponse } from "next/server";

/**
 * POST /api/ai-fix
 * Accepts error records and returns AI-suggested fixes using Groq LLM.
 */
export async function POST(request) {
  try {
    const { errorRecords, domain } = await request.json();

    if (!errorRecords || errorRecords.length === 0) {
      return NextResponse.json(
        { error: "No error records provided" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "your_groq_api_key_here") {
      // Fallback: generate rule-based suggestions
      return NextResponse.json({
        success: true,
        fixes: generateFallbackFixes(errorRecords, domain),
        source: "fallback",
      });
    }

    // Limit to 10 error records for prompt size
    const subset = errorRecords.slice(0, 10);

    const prompt = `You are an enterprise data remediation specialist. Given these invalid records from a ${domain || "GENERAL"} dataset, suggest specific corrected values for each record.

ERROR RECORDS:
${subset
  .map(
    (rec, i) =>
      `Record ${i + 1} (Row ${rec.row}):
  Data: ${JSON.stringify(rec.data)}
  Errors: ${rec.errors.join("; ")}`
  )
  .join("\n\n")}

For each record, respond with a JSON array. Each element should have:
{
  "row": <row number>,
  "original": { <original field values> },
  "suggested": { <corrected field values with fixes applied> },
  "explanation": "Brief explanation of what was fixed and why"
}

Only respond with the JSON array, no markdown or code blocks.`;

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are a data quality engineer. You suggest specific, realistic fixes for invalid data records. Always respond with valid JSON only.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 2048,
        }),
      }
    );

    if (!groqRes.ok) {
      console.error("[AI-FIX] Groq API error:", await groqRes.text());
      return NextResponse.json({
        success: true,
        fixes: generateFallbackFixes(errorRecords, domain),
        source: "fallback",
      });
    }

    const groqData = await groqRes.json();
    const rawContent = groqData.choices?.[0]?.message?.content || "";

    let fixes;
    try {
      fixes = JSON.parse(rawContent);
    } catch {
      console.warn("[AI-FIX] Failed to parse AI response, using fallback");
      fixes = generateFallbackFixes(errorRecords, domain);
    }

    return NextResponse.json({
      success: true,
      fixes,
      source: "ai",
    });
  } catch (error) {
    console.error("[AI-FIX ERROR]", error);
    return NextResponse.json(
      { error: "AI fix generation failed: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * Rule-based fallback fix generator
 */
function generateFallbackFixes(errorRecords, domain) {
  return errorRecords.slice(0, 10).map((rec) => {
    const suggested = { ...rec.data };
    const explanations = [];

    rec.errors.forEach((err) => {
      if (err.includes("AGE") && err.includes("out of range")) {
        if (domain === "BANKING") {
          suggested.AGE = "25";
          explanations.push("AGE corrected to 25 (within 18-65 range)");
        } else {
          suggested.AGE = "30";
          explanations.push("AGE corrected to 30 (within valid range)");
        }
      }
      if (err.includes("INCOME") && err.includes("> 0")) {
        suggested.INCOME = "35000";
        explanations.push("INCOME set to 35000 (must be positive)");
      }
      if (err.includes("CREDIT_SCORE") && err.includes("out of range")) {
        suggested.CREDIT_SCORE = "650";
        explanations.push("CREDIT_SCORE corrected to 650 (within 300-900)");
      }
      if (err.includes("NAME") && err.includes("required")) {
        suggested.NAME = "Unknown";
        explanations.push("NAME set to placeholder 'Unknown' (required field)");
      }
      if (err.includes("BLOOD_GROUP") && err.includes("Invalid")) {
        suggested.BLOOD_GROUP = "O+";
        explanations.push("BLOOD_GROUP corrected to 'O+' (most common type)");
      }
      if (err.includes("PRICE") && err.includes("> 0")) {
        suggested.PRICE = "9.99";
        explanations.push("PRICE set to 9.99 (must be positive)");
      }
      if (err.includes("STOCK") && err.includes(">= 0")) {
        suggested.STOCK = "0";
        explanations.push("STOCK set to 0 (cannot be negative)");
      }
      if (err.includes("PRODUCT") && err.includes("required")) {
        suggested.PRODUCT = "Unnamed Product";
        explanations.push("PRODUCT set to placeholder (required field)");
      }
    });

    return {
      row: rec.row,
      original: rec.data,
      suggested,
      explanation:
        explanations.length > 0
          ? explanations.join(". ")
          : "Review record manually — no automatic fix available",
    };
  });
}
