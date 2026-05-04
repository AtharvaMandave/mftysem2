"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import AiInsightsPanel from "./components/AiInsightsPanel";
import AiFixPanel from "./components/AiFixPanel";
import {
  ValidInvalidChart,
  ErrorsByFieldChart,
  ErrorTypeChart,
  ErrorDistributionChart,
} from "./components/Charts";

// ─── Domain Config ──────────────────────────────────────────────
const DOMAINS = [
  {
    id: "BANKING",
    label: "Banking",
    icon: "🏦",
    desc: "Validate customer financial records: age, income, credit score",
    className: "banking",
  },
  {
    id: "HEALTHCARE",
    label: "Healthcare",
    icon: "🏥",
    desc: "Validate patient data: age ranges, blood group validity",
    className: "healthcare",
  },
  {
    id: "ECOMMERCE",
    label: "E-Commerce",
    icon: "🛒",
    desc: "Validate product listings: pricing, stock levels",
    className: "ecommerce",
  },
];

// ─── Step Constants ─────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Select Domain" },
  { id: 2, label: "Upload Dataset" },
  { id: 3, label: "Run Validation" },
  { id: 4, label: "View Results" },
];

export default function Home() {
  // ── State ──
  const [domain, setDomain] = useState(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("errors");
  const [aiAnalytics, setAiAnalytics] = useState(null);
  const [resultsTab, setResultsTab] = useState("insights");

  const fileInputRef = useRef(null);

  // ── Derived step ──
  const currentStep = results ? 4 : processing ? 3 : uploaded ? 3 : file ? 2 : domain ? 2 : 1;

  // ── File handlers ──
  const handleFile = (f) => {
    if (f) {
      setFile(f);
      setUploaded(false);
      setResults(null);
      setError(null);
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  }, []);

  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const removeFile = () => {
    setFile(null);
    setUploaded(false);
    setResults(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Upload ──
  const handleUploadAndRun = async () => {
    if (!domain || !file) return;
    setError(null);

    // Step 1: Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("domain", domain);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      setUploaded(true);
      setUploading(false);

      // Step 2: Run job
      setProcessing(true);
      const jobRes = await fetch("/api/run-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, fileName: file.name }),
      });

      const jobData = await jobRes.json();
      if (!jobRes.ok) throw new Error(jobData.error);

      // Step 3: Get results
      const resultsRes = await fetch("/api/results");
      const resultsData = await resultsRes.json();
      if (!resultsRes.ok) throw new Error(resultsData.error);

      setResults(resultsData.data);
      setProcessing(false);

      // Step 4: Fetch AI analytics in background
      try {
        const aiRes = await fetch("/api/ai-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report: resultsData.data }),
        });
        const aiData = await aiRes.json();
        if (aiRes.ok) setAiAnalytics(aiData.analytics);
      } catch (aiErr) {
        console.warn("AI analytics fetch failed:", aiErr);
      }
    } catch (err) {
      setError(err.message);
      setUploading(false);
      setProcessing(false);
    }
  };

  // ── Reset ──
  const resetAll = () => {
    setDomain(null);
    setFile(null);
    setUploaded(false);
    setProcessing(false);
    setResults(null);
    setError(null);
    setActiveTab("errors");
    setAiAnalytics(null);
    setResultsTab("insights");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Score color ──
  const getScoreClass = (score) => {
    if (score >= 80) return "excellent";
    if (score >= 50) return "good";
    return "poor";
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    return (bytes / 1024).toFixed(1) + " KB";
  };

  // ═══ RENDER ═══════════════════════════════════════════════════
  return (
    <div className="app-container">
      <div className="bg-mesh" />

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">DV</div>
            <div className="logo-text">
              Data<span>Validator</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="header-badge">
              <span className="dot" />
              Mainframe Simulation Active
            </div>
            <Link href="/dashboard" className="btn btn-outline btn-sm" style={{ textDecoration: "none" }}>
              📊 Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main-content">
        {/* Hero */}
        <section className="hero-section">
          <div className="school-badge">
            <span className="icon">🎓</span> TY Semester 2 Project
          </div>
          <h1 className="hero-title">AI Data Validation System</h1>
          <p className="hero-subtitle">
            Multi-domain enterprise data validation with automated mainframe
            batch job processing. Select a domain, upload your dataset, and get
            comprehensive quality insights.
          </p>
        </section>

        {/* Steps */}
        <div className="steps">
          {STEPS.map((step, i) => (
            <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                className={`step ${
                  currentStep === step.id
                    ? "active"
                    : currentStep > step.id
                    ? "completed"
                    : ""
                }`}
              >
                <div className="step-dot">
                  {currentStep > step.id ? "✓" : step.id}
                </div>
                <span className="step-label">{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`step-line ${
                    currentStep > step.id ? "completed" : ""
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* ══ RESULTS VIEW ══ */}
        {results ? (
          <div className="results-section">
            <div className="results-header">
              <h2 className="results-title">📊 Validation Results</h2>
              <div className="run-info">
                <span className="run-tag domain-tag">
                  {DOMAINS.find((d) => d.id === results.domain)?.icon}{" "}
                  {results.domain}
                </span>
                <span className="run-tag time-tag">
                  🕐 {new Date(results.timestamp).toLocaleString()}
                </span>
                <button className="btn btn-outline" onClick={resetAll}>
                  ↻ New Validation
                </button>
                {results.validRecords && results.validRecords.length > 0 && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      // Build CSV from validRecords
                      const records = results.validRecords.map(r => r.data);
                      const headers = Object.keys(records[0]);
                      const csvLines = [headers.join(",")];
                      records.forEach(rec => {
                        const row = headers.map(h => {
                          const val = rec[h] || "";
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
                      a.download = `clean_${results.fileName || "data"}`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    id="download-clean-btn"
                  >
                    ⬇ Download Clean CSV
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
              <div className="stat-card total">
                <div className="stat-label">Total Records</div>
                <div className="stat-value">{results.summary.total}</div>
              </div>
              <div className="stat-card valid">
                <div className="stat-label">Valid</div>
                <div className="stat-value">{results.summary.valid}</div>
              </div>
              <div className="stat-card invalid">
                <div className="stat-label">Invalid</div>
                <div className="stat-value">{results.summary.invalid}</div>
              </div>
              <div className="stat-card score">
                <div className="stat-label">Quality Score</div>
                <div className="stat-value">
                  {results.summary.score}
                  <span className="stat-suffix">%</span>
                </div>
                <div className="score-bar-container">
                  <div className="score-bar-bg">
                    <div
                      className={`score-bar-fill ${getScoreClass(
                        results.summary.score
                      )}`}
                      style={{ width: `${results.summary.score}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Results Sub-navigation ── */}
            <div className="results-nav">
              <button
                className={`results-nav-btn ${resultsTab === "insights" ? "active" : ""}`}
                onClick={() => setResultsTab("insights")}
                id="tab-insights"
              >
                ✨ AI Insights
              </button>
              <button
                className={`results-nav-btn ${resultsTab === "charts" ? "active" : ""}`}
                onClick={() => setResultsTab("charts")}
                id="tab-charts"
              >
                📊 Analytics
              </button>
              <button
                className={`results-nav-btn ${resultsTab === "records" ? "active" : ""}`}
                onClick={() => setResultsTab("records")}
                id="tab-records"
              >
                📋 Records
              </button>
              {results.errorRecords && results.errorRecords.length > 0 && (
                <button
                  className={`results-nav-btn ${resultsTab === "fixes" ? "active" : ""}`}
                  onClick={() => setResultsTab("fixes")}
                  id="tab-fixes"
                >
                  🔧 AI Fixes
                </button>
              )}
            </div>

            {/* ═══ AI INSIGHTS TAB ═══ */}
            {resultsTab === "insights" && (
              <AiInsightsPanel report={results} />
            )}

            {/* ═══ CHARTS TAB ═══ */}
            {resultsTab === "charts" && (
              <div className="charts-section">
                <div className="charts-grid">
                  <ValidInvalidChart
                    valid={results.summary.valid}
                    invalid={results.summary.invalid}
                  />
                  {aiAnalytics?.errorsByType &&
                    Object.keys(aiAnalytics.errorsByType).length > 0 && (
                      <ErrorTypeChart errorsByType={aiAnalytics.errorsByType} />
                    )}
                </div>
                <div className="charts-grid">
                  {aiAnalytics?.errorsByField &&
                    Object.keys(aiAnalytics.errorsByField).length > 0 && (
                      <ErrorsByFieldChart
                        errorsByField={aiAnalytics.errorsByField}
                      />
                    )}
                  {aiAnalytics?.errorDistribution &&
                    aiAnalytics.errorDistribution.length > 0 && (
                      <ErrorDistributionChart
                        errorDistribution={aiAnalytics.errorDistribution}
                      />
                    )}
                </div>
                {!aiAnalytics && (
                  <div className="charts-loading">
                    <div className="ai-loading-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                    <p>Loading analytics data…</p>
                  </div>
                )}
              </div>
            )}

            {/* ═══ RECORDS TAB ═══ */}
            {resultsTab === "records" && (
            <div className="record-tabs-grid">
              <div className="card">
                <div className="tabs">
                  <button
                    className={`tab ${activeTab === "errors" ? "active" : ""}`}
                    onClick={() => setActiveTab("errors")}
                  >
                    ⚠ Errors ({results.errorRecords.length})
                  </button>
                  <button
                    className={`tab ${activeTab === "valid" ? "active" : ""}`}
                    onClick={() => setActiveTab("valid")}
                  >
                    ✓ Valid ({results.validRecords.length})
                  </button>
                </div>

                {activeTab === "errors" && results.errorRecords.length > 0 && (
                  <div className="table-container">
                    <table className="data-table" id="error-records-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Record Data</th>
                          <th>Error Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.errorRecords.map((rec, i) => (
                          <tr key={i}>
                            <td className="row-number">{rec.row}</td>
                            <td>
                              {Object.entries(rec.data)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" | ")}
                            </td>
                            <td>
                              {rec.errors.map((e, j) => (
                                <div className="error-msg" key={j}>
                                  {e}
                                </div>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === "errors" && results.errorRecords.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                    🎉 No errors found — all records are valid!
                  </div>
                )}

                {activeTab === "valid" && results.validRecords.length > 0 && (
                  <div className="table-container">
                    <table className="data-table" id="valid-records-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Record Data</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.validRecords.map((rec, i) => (
                          <tr key={i}>
                            <td className="row-number">{rec.row}</td>
                            <td>
                              {Object.entries(rec.data)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" | ")}
                            </td>
                            <td>
                              <span className="badge badge-valid">Valid</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === "valid" && results.validRecords.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                    No valid records found.
                  </div>
                )}
              </div>
            </div>
            )}

            {/* ═══ AI FIXES TAB ═══ */}
            {resultsTab === "fixes" && results.errorRecords && results.errorRecords.length > 0 && (
              <AiFixPanel errorRecords={results.errorRecords} domain={results.domain} />
            )}
          </div>
        ) : processing ? (
          /* ══ PROCESSING VIEW ══ */
          <div className="card">
            <div className="processing-overlay">
              <div className="spinner-container">
                <div className="spinner" />
                <div className="spinner-glow" />
              </div>
              <div className="processing-text">
                Executing Mainframe Batch Job…
              </div>
              <div className="processing-sub">
                Running COBOL validation on {domain} dataset
              </div>
            </div>
          </div>
        ) : (
          /* ══ INPUT VIEW ══ */
          <div className="sections-grid">
            {/* Domain selector */}
            <div className="card">
              <div className="card-title">
                <span className="icon">🎯</span> Select Domain
              </div>
              <div className="domain-grid">
                {DOMAINS.map((d) => (
                  <div
                    key={d.id}
                    id={`domain-${d.id.toLowerCase()}`}
                    className={`domain-option ${d.className} ${
                      domain === d.id ? "selected" : ""
                    }`}
                    onClick={() => setDomain(d.id)}
                  >
                    {domain === d.id && (
                      <div className="selected-badge">✓</div>
                    )}
                    <div className="domain-icon">{d.icon}</div>
                    <div className="domain-label">{d.label}</div>
                    <div className="domain-desc">{d.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload */}
            <div className="card">
              <div className="card-title">
                <span className="icon">📁</span> Upload Dataset
              </div>
              <div
                className={`upload-zone ${dragOver ? "drag-over" : ""}`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
                id="upload-zone"
              >
                <div className="upload-icon">☁️</div>
                <div className="upload-text">
                  Drag & drop your file here, or{" "}
                  <strong>browse</strong>
                </div>
                <div className="upload-hint">
                  Supported: CSV, TXT — Max 10MB
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden-input"
                  onChange={(e) => handleFile(e.target.files[0])}
                  id="file-input"
                />
              </div>

              {file && (
                <div className="file-info">
                  <span>📄</span>
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">
                    ({formatBytes(file.size)})
                  </span>
                  <button
                    className="file-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                    id="remove-file-btn"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Action */}
            <div
              className="action-bar"
              style={{ gridColumn: "1 / -1" }}
            >
              <button
                className="btn btn-primary btn-lg"
                disabled={!domain || !file || uploading}
                onClick={handleUploadAndRun}
                id="run-validation-btn"
              >
                {uploading ? "Uploading…" : "⚡ Run Validation"}
              </button>
            </div>

            {/* Error display */}
            {error && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: "16px 20px",
                  background: "rgba(251, 113, 133, 0.08)",
                  border: "1px solid rgba(251, 113, 133, 0.2)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--accent-rose)",
                  fontSize: "14px",
                  textAlign: "center",
                }}
              >
                ⚠ {error}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
