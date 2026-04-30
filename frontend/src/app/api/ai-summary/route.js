import { NextResponse } from "next/server";

/**
 * POST /api/ai-summary
 * Accepts the validation report JSON and returns an AI-generated
 * analysis summary + structured analytics data using Groq LLM.
 */
export async function POST(request) {
  try {
    const { report } = await request.json();

    if (!report) {
      return NextResponse.json(
        { error: "No report data provided" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "your_groq_api_key_here") {
      // Return a structured fallback summary when no API key is configured
      return NextResponse.json({
        success: true,
        summary: generateFallbackSummary(report),
        analytics: generateAnalytics(report),
        source: "fallback",
      });
    }

    // ── Build the prompt ──
    const prompt = buildPrompt(report);

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
              content: `You are an enterprise data quality analyst. Given a validation report from a mainframe batch job, produce a clear, professional analysis. Return your response as valid JSON with exactly these fields:
{
  "executive_summary": "A 2-3 sentence executive overview",
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "risk_assessment": "LOW | MEDIUM | HIGH | CRITICAL",
  "risk_explanation": "Brief explanation of risk level",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "data_quality_grade": "A+ | A | B | C | D | F",
  "trend_insight": "An insight about data patterns or quality trends observed"
}
Only respond with the JSON object, no markdown formatting or code blocks.`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 1024,
        }),
      }
    );

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("[AI-SUMMARY] Groq API error:", errText);
      // Fallback to local summary
      return NextResponse.json({
        success: true,
        summary: generateFallbackSummary(report),
        analytics: generateAnalytics(report),
        source: "fallback",
      });
    }

    const groqData = await groqRes.json();
    const rawContent = groqData.choices?.[0]?.message?.content || "";

    let aiSummary;
    try {
      aiSummary = JSON.parse(rawContent);
    } catch {
      console.warn("[AI-SUMMARY] Failed to parse AI response, using fallback");
      aiSummary = generateFallbackSummary(report);
    }

    return NextResponse.json({
      success: true,
      summary: aiSummary,
      analytics: generateAnalytics(report),
      source: "ai",
    });
  } catch (error) {
    console.error("[AI-SUMMARY ERROR]", error);
    return NextResponse.json(
      { error: "AI summary generation failed: " + error.message },
      { status: 500 }
    );
  }
}

// ── Build prompt from report data ──
function buildPrompt(report) {
  const errorSummaryMap = {};
  (report.errorRecords || []).forEach((rec) => {
    (rec.errors || []).forEach((err) => {
      // Extract field name from error message
      const fieldMatch = err.match(/^(\w+)/);
      const field = fieldMatch ? fieldMatch[1] : "UNKNOWN";
      errorSummaryMap[field] = (errorSummaryMap[field] || 0) + 1;
    });
  });

  return `
VALIDATION REPORT ANALYSIS REQUEST
===================================
Domain: ${report.domain}
File: ${report.fileName}
Run ID: ${report.runId}
Timestamp: ${report.timestamp}

SUMMARY METRICS:
- Total Records: ${report.summary.total}
- Valid Records: ${report.summary.valid}
- Invalid Records: ${report.summary.invalid}
- Quality Score: ${report.summary.score}%

ERROR BREAKDOWN BY FIELD:
${Object.entries(errorSummaryMap)
  .map(([field, count]) => `- ${field}: ${count} errors`)
  .join("\n")}

SAMPLE ERRORS (first 5):
${(report.errorRecords || [])
  .slice(0, 5)
  .map(
    (rec) => `  Row ${rec.row}: ${rec.errors.join("; ")}`
  )
  .join("\n")}

Please analyze this report and provide your structured assessment.`;
}

// ── Structured analytics derived from report ──
function generateAnalytics(report) {
  // Error breakdown by field
  const errorsByField = {};
  const errorsByType = {};

  (report.errorRecords || []).forEach((rec) => {
    (rec.errors || []).forEach((err) => {
      // Extract field name
      const fieldMatch = err.match(/^(\w+)/);
      const field = fieldMatch ? fieldMatch[1] : "OTHER";
      errorsByField[field] = (errorsByField[field] || 0) + 1;

      // Categorize error type
      if (err.includes("out of range")) {
        errorsByType["Out of Range"] = (errorsByType["Out of Range"] || 0) + 1;
      } else if (err.includes("must be")) {
        errorsByType["Invalid Value"] =
          (errorsByType["Invalid Value"] || 0) + 1;
      } else if (err.includes("required")) {
        errorsByType["Missing Required"] =
          (errorsByType["Missing Required"] || 0) + 1;
      } else if (err.includes("Invalid")) {
        errorsByType["Invalid Format"] =
          (errorsByType["Invalid Format"] || 0) + 1;
      } else {
        errorsByType["Other"] = (errorsByType["Other"] || 0) + 1;
      }
    });
  });

  // Row-level distribution (for sparkline-style data)
  const batchSize = Math.max(
    1,
    Math.ceil((report.errorRecords || []).length / 10)
  );
  const errorDistribution = [];
  const totalRows = report.summary.total;
  const chunkCount = Math.min(10, totalRows);

  for (let i = 0; i < chunkCount; i++) {
    const start = Math.floor((i * totalRows) / chunkCount) + 1;
    const end = Math.floor(((i + 1) * totalRows) / chunkCount);
    const errorsInChunk = (report.errorRecords || []).filter(
      (rec) => rec.row >= start + 1 && rec.row <= end + 1
    ).length;
    errorDistribution.push({
      label: `${start}-${end}`,
      errors: errorsInChunk,
    });
  }

  return {
    errorsByField,
    errorsByType,
    errorDistribution,
    validVsInvalid: {
      valid: report.summary.valid,
      invalid: report.summary.invalid,
    },
  };
}

// ── Fallback summary when AI is unavailable ──
function generateFallbackSummary(report) {
  const score = report.summary.score;
  const total = report.summary.total;
  const invalid = report.summary.invalid;

  let riskLevel, riskExplanation, grade;
  if (score >= 95) {
    riskLevel = "LOW";
    riskExplanation =
      "Dataset has excellent quality with minimal validation failures.";
    grade = "A+";
  } else if (score >= 85) {
    riskLevel = "LOW";
    riskExplanation =
      "Dataset quality is strong with only minor issues detected.";
    grade = "A";
  } else if (score >= 70) {
    riskLevel = "MEDIUM";
    riskExplanation =
      "Notable number of validation failures detected that may impact downstream processing.";
    grade = "B";
  } else if (score >= 50) {
    riskLevel = "HIGH";
    riskExplanation =
      "Significant data quality issues found. Immediate attention recommended.";
    grade = "C";
  } else {
    riskLevel = "CRITICAL";
    riskExplanation =
      "Majority of records failed validation. Dataset should not be used without remediation.";
    grade = "F";
  }

  // Identify top error fields
  const fieldCounts = {};
  (report.errorRecords || []).forEach((rec) => {
    (rec.errors || []).forEach((err) => {
      const fieldMatch = err.match(/^(\w+)/);
      const field = fieldMatch ? fieldMatch[1] : "UNKNOWN";
      fieldCounts[field] = (fieldCounts[field] || 0) + 1;
    });
  });
  const topFields = Object.entries(fieldCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return {
    executive_summary: `The ${report.domain} dataset "${report.fileName}" was validated with a quality score of ${score}%. Out of ${total} records, ${invalid} failed validation checks. ${score >= 80 ? "The overall data quality is acceptable for downstream processing." : "The dataset requires attention before further processing."}`,
    key_findings: [
      `${report.summary.valid} of ${total} records (${score}%) passed all validation rules`,
      topFields.length > 0
        ? `Most common error field: ${topFields[0][0]} with ${topFields[0][1]} occurrences`
        : "No specific error pattern identified",
      `Dataset was processed under the ${report.domain} domain ruleset`,
    ],
    risk_assessment: riskLevel,
    risk_explanation: riskExplanation,
    recommendations: [
      invalid > 0
        ? `Review and correct the ${invalid} invalid records before processing`
        : "No immediate action required — all records are valid",
      topFields.length > 0
        ? `Focus data cleanup on the ${topFields[0][0]} field which has the highest error rate`
        : "Continue monitoring data quality metrics",
      "Implement upstream data validation to catch issues before batch submission",
    ],
    data_quality_grade: grade,
    trend_insight: `The validation run processed ${total} records with a ${score >= 80 ? "healthy" : score >= 50 ? "concerning" : "critical"} pass rate. ${topFields.length > 1 ? `Error concentration across ${topFields.length} fields suggests ${topFields.length <= 2 ? "focused" : "systemic"} data quality issues.` : "Error patterns suggest isolated data quality issues that can be addressed individually."}`,
  };
}
