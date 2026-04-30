"use client";

import { useState, useEffect, useCallback } from "react";

const RISK_CONFIG = {
  LOW: { color: "var(--accent-emerald)", bg: "rgba(52, 211, 153, 0.1)", border: "rgba(52, 211, 153, 0.25)", icon: "🟢" },
  MEDIUM: { color: "var(--accent-amber)", bg: "rgba(251, 191, 36, 0.1)", border: "rgba(251, 191, 36, 0.25)", icon: "🟡" },
  HIGH: { color: "var(--accent-rose)", bg: "rgba(251, 113, 133, 0.1)", border: "rgba(251, 113, 133, 0.25)", icon: "🟠" },
  CRITICAL: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.25)", icon: "🔴" },
};

const GRADE_CONFIG = {
  "A+": { color: "#34d399", label: "Excellent" },
  A: { color: "#34d399", label: "Great" },
  B: { color: "#fbbf24", label: "Good" },
  C: { color: "#fb923c", label: "Fair" },
  D: { color: "#fb7185", label: "Poor" },
  F: { color: "#ef4444", label: "Critical" },
};

export default function AiInsightsPanel({ report }) {
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummary(data.summary);
      setAnalytics(data.analytics);
      setSource(data.source);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [report]);

  useEffect(() => {
    if (report) fetchSummary();
  }, [report, fetchSummary]);

  if (loading) {
    return (
      <div className="ai-panel">
        <div className="ai-panel-header">
          <div className="ai-panel-title">
            <span className="ai-icon-pulse">✨</span>
            AI Analysis
          </div>
        </div>
        <div className="ai-loading">
          <div className="ai-loading-dots">
            <span />
            <span />
            <span />
          </div>
          <p>Analyzing validation results…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-panel">
        <div className="ai-panel-header">
          <div className="ai-panel-title">
            <span>✨</span> AI Analysis
          </div>
        </div>
        <div className="ai-error">
          <p>⚠ {error}</p>
          <button className="btn btn-outline btn-sm" onClick={fetchSummary}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const risk = RISK_CONFIG[summary.risk_assessment] || RISK_CONFIG.MEDIUM;
  const grade = GRADE_CONFIG[summary.data_quality_grade] || GRADE_CONFIG.C;

  return (
    <div className="ai-panel" id="ai-insights-panel">
      {/* Header */}
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <span className="ai-icon-pulse">✨</span>
          AI-Powered Analysis
        </div>
        <div className="ai-source-badge">
          {source === "ai" ? "🤖 Groq LLM" : "⚙ Local Engine"}
        </div>
      </div>

      {/* Executive Summary */}
      <div className="ai-section">
        <div className="ai-exec-summary">{summary.executive_summary}</div>
      </div>

      {/* Grade + Risk Row */}
      <div className="ai-metrics-row">
        <div className="ai-metric-card">
          <div className="ai-metric-label">Data Quality Grade</div>
          <div
            className="ai-grade"
            style={{ color: grade.color }}
          >
            {summary.data_quality_grade}
          </div>
          <div className="ai-metric-sublabel">{grade.label}</div>
        </div>

        <div className="ai-metric-card">
          <div className="ai-metric-label">Risk Assessment</div>
          <div
            className="ai-risk-badge"
            style={{
              background: risk.bg,
              borderColor: risk.border,
              color: risk.color,
            }}
          >
            {risk.icon} {summary.risk_assessment}
          </div>
          <div className="ai-metric-sublabel">{summary.risk_explanation}</div>
        </div>
      </div>

      {/* Key Findings */}
      <div className="ai-section">
        <h4 className="ai-section-title">🔍 Key Findings</h4>
        <ul className="ai-list">
          {summary.key_findings?.map((finding, i) => (
            <li key={i} className="ai-list-item">
              <span className="ai-bullet finding" />
              {finding}
            </li>
          ))}
        </ul>
      </div>

      {/* Recommendations */}
      <div className="ai-section">
        <h4 className="ai-section-title">💡 Recommendations</h4>
        <ul className="ai-list">
          {summary.recommendations?.map((rec, i) => (
            <li key={i} className="ai-list-item">
              <span className="ai-bullet recommendation" />
              {rec}
            </li>
          ))}
        </ul>
      </div>

      {/* Trend Insight */}
      {summary.trend_insight && (
        <div className="ai-insight-callout">
          <span className="ai-callout-icon">📈</span>
          <p>{summary.trend_insight}</p>
        </div>
      )}
    </div>
  );
}
