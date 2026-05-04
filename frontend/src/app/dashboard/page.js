"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler
);

const DOMAIN_CONFIG = {
  BANKING: { icon: "🏦", color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  HEALTHCARE: { icon: "🏥", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  ECOMMERCE: { icon: "🛒", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "var(--accent-emerald)";
    if (score >= 50) return "var(--accent-amber)";
    return "var(--accent-rose)";
  };

  const getScoreClass = (score) => {
    if (score >= 80) return "excellent";
    if (score >= 50) return "good";
    return "poor";
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="bg-mesh" />
        <header className="app-header">
          <div className="header-inner">
            <Link href="/" className="logo" style={{ textDecoration: "none" }}>
              <div className="logo-icon">DV</div>
              <div className="logo-text">
                Data<span>Validator</span>
              </div>
            </Link>
            <div className="header-badge">
              <span className="dot" />
              Dashboard
            </div>
          </div>
        </header>
        <main className="main-content">
          <div className="dash-loading">
            <div className="spinner-container">
              <div className="spinner" />
              <div className="spinner-glow" />
            </div>
            <p>Loading dashboard from DB2…</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="bg-mesh" />
        <header className="app-header">
          <div className="header-inner">
            <Link href="/" className="logo" style={{ textDecoration: "none" }}>
              <div className="logo-icon">DV</div>
              <div className="logo-text">
                Data<span>Validator</span>
              </div>
            </Link>
          </div>
        </header>
        <main className="main-content">
          <div className="dash-error">
            <p>⚠ {error}</p>
            <button className="btn btn-primary" onClick={fetchDashboard}>
              Retry
            </button>
            <Link href="/" className="btn btn-outline" style={{ marginLeft: 12 }}>
              ← Back to Validator
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { stats, history } = data;
  const { totals, byDomain, recentRuns } = stats;

  // Chart: Domain Distribution Doughnut
  const domainChartData = {
    labels: byDomain.map((d) => d.DOMAIN),
    datasets: [
      {
        data: byDomain.map((d) => d.RUNS),
        backgroundColor: byDomain.map(
          (d) => DOMAIN_CONFIG[d.DOMAIN]?.bg || "rgba(148,163,184,0.3)"
        ),
        borderColor: byDomain.map(
          (d) => DOMAIN_CONFIG[d.DOMAIN]?.color || "#94a3b8"
        ),
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  // Chart: Score Trend Line
  const scoreTrendData = {
    labels: [...recentRuns].reverse().map((r) => {
      const d = new Date(r.RUN_DATE);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    }),
    datasets: [
      {
        label: "Quality Score",
        data: [...recentRuns].reverse().map((r) => parseFloat(r.SCORE)),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.1)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#6366f1",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  // Chart: Valid vs Invalid Bar
  const validInvalidData = {
    labels: byDomain.map((d) => d.DOMAIN),
    datasets: [
      {
        label: "Avg Score %",
        data: byDomain.map((d) => parseFloat(d.AVG_SCORE).toFixed(1)),
        backgroundColor: byDomain.map((d) =>
          parseFloat(d.AVG_SCORE) >= 80
            ? "rgba(52,211,153,0.6)"
            : parseFloat(d.AVG_SCORE) >= 50
            ? "rgba(251,191,36,0.6)"
            : "rgba(251,113,133,0.6)"
        ),
        borderColor: byDomain.map((d) =>
          parseFloat(d.AVG_SCORE) >= 80
            ? "#34d399"
            : parseFloat(d.AVG_SCORE) >= 50
            ? "#fbbf24"
            : "#fb7185"
        ),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#94a3b8",
          font: { family: "Inter, sans-serif", size: 12 },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: "rgba(17,24,39,0.95)",
        titleColor: "#f1f5f9",
        bodyColor: "#94a3b8",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
  };

  const lineOptions = {
    ...chartOptions,
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: { color: "#64748b", font: { size: 11 } },
      },
      y: {
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: { color: "#64748b", font: { size: 11 } },
        min: 0,
        max: 100,
      },
    },
  };

  const barOptions = {
    ...chartOptions,
    plugins: { ...chartOptions.plugins, legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#94a3b8", font: { size: 12, weight: 500 } },
      },
      y: {
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: { color: "#64748b", font: { size: 11 }, callback: (v) => v + "%" },
        min: 0,
        max: 100,
      },
    },
  };

  return (
    <div className="app-container">
      <div className="bg-mesh" />

      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <Link href="/" className="logo" style={{ textDecoration: "none" }}>
            <div className="logo-icon">DV</div>
            <div className="logo-text">
              Data<span>Validator</span>
            </div>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="header-badge">
              <span className="dot" />
              DB2 Connected
            </div>
            <Link href="/" className="btn btn-outline btn-sm">
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Hero */}
        <section className="hero-section" style={{ paddingBottom: 24 }}>
          <h1 className="hero-title" style={{ fontSize: "clamp(24px, 3vw, 36px)" }}>
            📊 Analytics Dashboard
          </h1>
          <p className="hero-subtitle">
            Historical validation data pulled directly from your IBM DB2 database
          </p>
        </section>

        {/* Overview Stats */}
        <div className="stats-grid" style={{ marginBottom: 32 }}>
          <div className="stat-card total">
            <div className="stat-label">Total Runs</div>
            <div className="stat-value">{totals.TOTAL_RUNS}</div>
          </div>
          <div className="stat-card valid">
            <div className="stat-label">Total Valid</div>
            <div className="stat-value">{totals.TOTAL_VALID}</div>
          </div>
          <div className="stat-card invalid">
            <div className="stat-label">Total Invalid</div>
            <div className="stat-value">{totals.TOTAL_INVALID}</div>
          </div>
          <div className="stat-card score">
            <div className="stat-label">Avg Score</div>
            <div className="stat-value">
              {parseFloat(totals.AVG_SCORE).toFixed(1)}
              <span className="stat-suffix">%</span>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid" style={{ marginBottom: 32 }}>
          {/* Score Trend */}
          <div className="chart-wrapper">
            <div className="chart-header">
              <h3 className="chart-title">Quality Score Trend</h3>
              <span className="chart-badge">Last {recentRuns.length} runs</span>
            </div>
            <div className="chart-canvas-container" style={{ height: 240 }}>
              {recentRuns.length > 1 ? (
                <Line data={scoreTrendData} options={lineOptions} />
              ) : (
                <div className="dash-empty-chart">
                  <p>Need 2+ runs to show trend</p>
                </div>
              )}
            </div>
          </div>

          {/* Domain Distribution */}
          <div className="chart-wrapper">
            <div className="chart-header">
              <h3 className="chart-title">Runs by Domain</h3>
              <span className="chart-badge">{byDomain.length} domains</span>
            </div>
            <div className="chart-canvas-container doughnut-size">
              {byDomain.length > 0 ? (
                <Doughnut
                  data={domainChartData}
                  options={{
                    ...chartOptions,
                    cutout: "65%",
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { ...chartOptions.plugins.legend, position: "bottom" },
                    },
                  }}
                />
              ) : (
                <div className="dash-empty-chart">
                  <p>No domain data yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Avg Score by Domain */}
        {byDomain.length > 0 && (
          <div className="chart-wrapper" style={{ marginBottom: 32 }}>
            <div className="chart-header">
              <h3 className="chart-title">Average Score by Domain</h3>
              <span className="chart-badge">Comparison</span>
            </div>
            <div className="chart-canvas-container bar-size">
              <Bar data={validInvalidData} options={barOptions} />
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="card-title">
            <span className="icon">📋</span> Validation History
          </div>
          {history && history.length > 0 ? (
            <div className="table-container">
              <table className="data-table" id="history-table">
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Domain</th>
                    <th>File</th>
                    <th>Total</th>
                    <th>Valid</th>
                    <th>Invalid</th>
                    <th>Score</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((run) => (
                    <tr key={run.RUN_ID}>
                      <td className="row-number">#{run.RUN_ID}</td>
                      <td>
                        <span
                          className="dash-domain-tag"
                          style={{
                            background: DOMAIN_CONFIG[run.DOMAIN]?.bg || "var(--bg-glass)",
                            color: DOMAIN_CONFIG[run.DOMAIN]?.color || "var(--text-secondary)",
                          }}
                        >
                          {DOMAIN_CONFIG[run.DOMAIN]?.icon || "📁"} {run.DOMAIN}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                        {run.FILE_NAME}
                      </td>
                      <td>{run.TOTAL_RECORDS}</td>
                      <td style={{ color: "var(--accent-emerald)" }}>{run.VALID_COUNT}</td>
                      <td style={{ color: "var(--accent-rose)" }}>{run.INVALID_COUNT}</td>
                      <td>
                        <span
                          className={`dash-score-pill ${getScoreClass(parseFloat(run.SCORE))}`}
                        >
                          {parseFloat(run.SCORE).toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {new Date(run.RUN_DATE).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = `/api/export-clean?runId=${run.RUN_ID}`;
                            a.download = `clean_data_run_${run.RUN_ID}.csv`;
                            a.click();
                          }}
                          title="Download clean records"
                        >
                          ⬇ Clean CSV
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              No validation runs found. Upload a file to get started!
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
