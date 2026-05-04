"use client";

import { useState } from "react";

export default function AiFixPanel({ errorRecords, domain }) {
  const [fixes, setFixes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);
  const [expanded, setExpanded] = useState({});

  const fetchFixes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorRecords, domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFixes(data.fixes);
      setSource(data.source);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (idx) => {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const downloadFixedCSV = () => {
    if (!fixes || fixes.length === 0) return;

    const headers = Object.keys(fixes[0].suggested);
    const csvLines = [headers.join(",")];

    fixes.forEach((fix) => {
      const row = headers.map((h) => {
        const val = fix.suggested[h] || "";
        if (String(val).includes(",") || String(val).includes('"')) {
          return `"${String(val).replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvLines.push(row.join(","));
    });

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai_fixed_records.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!fixes && !loading) {
    return (
      <div className="ai-fix-prompt">
        <div className="ai-fix-prompt-icon">🔧</div>
        <h3>AI Error Resolution</h3>
        <p>
          Let AI analyze your {errorRecords.length} error record
          {errorRecords.length !== 1 ? "s" : ""} and suggest specific fixes for
          each invalid field.
        </p>
        <button
          className="btn btn-primary"
          onClick={fetchFixes}
          id="generate-fixes-btn"
        >
          ✨ Generate AI Fixes
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ai-fix-prompt">
        <div className="ai-loading-dots">
          <span />
          <span />
          <span />
        </div>
        <p>AI is analyzing errors and generating fixes…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-fix-prompt">
        <p style={{ color: "var(--accent-rose)" }}>⚠ {error}</p>
        <button className="btn btn-outline btn-sm" onClick={fetchFixes}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="ai-fix-panel">
      <div className="ai-fix-header">
        <div>
          <h3 className="ai-fix-title">
            🔧 AI-Suggested Fixes
            <span className="ai-source-badge" style={{ marginLeft: 10, fontSize: 11 }}>
              {source === "ai" ? "🤖 Groq LLM" : "⚙ Rule Engine"}
            </span>
          </h3>
          <p className="ai-fix-subtitle">
            {fixes.length} record{fixes.length !== 1 ? "s" : ""} analyzed
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={downloadFixedCSV}
          id="download-fixed-btn"
        >
          ⬇ Download Fixed CSV
        </button>
      </div>

      <div className="ai-fix-list">
        {fixes.map((fix, idx) => (
          <div
            key={idx}
            className={`ai-fix-card ${expanded[idx] ? "expanded" : ""}`}
            onClick={() => toggleExpand(idx)}
          >
            <div className="ai-fix-card-header">
              <span className="ai-fix-row-badge">Row {fix.row}</span>
              <span className="ai-fix-chevron">
                {expanded[idx] ? "▾" : "▸"}
              </span>
            </div>

            <p className="ai-fix-explanation">{fix.explanation}</p>

            {expanded[idx] && (
              <div className="ai-fix-diff">
                <div className="ai-fix-diff-col">
                  <div className="ai-fix-diff-label original">Original</div>
                  {Object.entries(fix.original).map(([key, val]) => (
                    <div key={key} className="ai-fix-field">
                      <span className="ai-fix-field-key">{key}:</span>
                      <span
                        className={`ai-fix-field-val ${
                          fix.suggested[key] !== val ? "changed" : ""
                        }`}
                      >
                        {val || <em className="empty-val">(empty)</em>}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="ai-fix-diff-arrow">→</div>
                <div className="ai-fix-diff-col">
                  <div className="ai-fix-diff-label suggested">Suggested</div>
                  {Object.entries(fix.suggested).map(([key, val]) => (
                    <div key={key} className="ai-fix-field">
                      <span className="ai-fix-field-key">{key}:</span>
                      <span
                        className={`ai-fix-field-val ${
                          fix.original[key] !== val ? "highlight" : ""
                        }`}
                      >
                        {val || <em className="empty-val">(empty)</em>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
