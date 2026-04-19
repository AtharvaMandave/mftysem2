"use client";

import { useState, useRef, useCallback } from "react";

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
          <div className="header-badge">
            <span className="dot" />
            Mainframe Simulation Active
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main-content">
        {/* Hero */}
        <section className="hero-section">
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

            {/* Tabs */}
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
