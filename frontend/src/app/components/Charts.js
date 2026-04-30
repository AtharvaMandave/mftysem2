"use client";

import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Filler,
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Filler
);

// ─── Shared Defaults ────────────────────────────────────────────
const CHART_COLORS = {
  indigo: "#6366f1",
  cyan: "#22d3ee",
  emerald: "#34d399",
  rose: "#fb7185",
  amber: "#fbbf24",
  violet: "#a78bfa",
  pink: "#f472b6",
  teal: "#2dd4bf",
};

const PALETTE = Object.values(CHART_COLORS);

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: "#94a3b8",
        font: { family: "Inter, sans-serif", size: 12, weight: 500 },
        padding: 16,
        usePointStyle: true,
        pointStyle: "circle",
      },
    },
    tooltip: {
      backgroundColor: "rgba(17, 24, 39, 0.95)",
      titleColor: "#f1f5f9",
      bodyColor: "#94a3b8",
      borderColor: "rgba(255, 255, 255, 0.1)",
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      titleFont: { family: "Inter, sans-serif", size: 13, weight: 600 },
      bodyFont: { family: "Inter, sans-serif", size: 12 },
      displayColors: true,
      boxPadding: 6,
    },
  },
};

// ─── Valid vs Invalid Doughnut ───────────────────────────────────
export function ValidInvalidChart({ valid, invalid }) {
  const data = {
    labels: ["Valid Records", "Invalid Records"],
    datasets: [
      {
        data: [valid, invalid],
        backgroundColor: [
          "rgba(52, 211, 153, 0.8)",
          "rgba(251, 113, 133, 0.8)",
        ],
        borderColor: ["rgba(52, 211, 153, 1)", "rgba(251, 113, 133, 1)"],
        borderWidth: 2,
        hoverBackgroundColor: [
          "rgba(52, 211, 153, 1)",
          "rgba(251, 113, 133, 1)",
        ],
        hoverBorderWidth: 3,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    ...baseOptions,
    cutout: "68%",
    plugins: {
      ...baseOptions.plugins,
      legend: {
        ...baseOptions.plugins.legend,
        position: "bottom",
      },
    },
  };

  return (
    <div className="chart-wrapper">
      <div className="chart-header">
        <h3 className="chart-title">Record Distribution</h3>
        <span className="chart-badge">
          {((valid / (valid + invalid)) * 100).toFixed(1)}% pass rate
        </span>
      </div>
      <div className="chart-canvas-container doughnut-size">
        <Doughnut data={data} options={options} />
        <div className="doughnut-center-label">
          <span className="doughnut-center-value">{valid + invalid}</span>
          <span className="doughnut-center-text">Total</span>
        </div>
      </div>
    </div>
  );
}

// ─── Errors by Field Bar Chart ──────────────────────────────────
export function ErrorsByFieldChart({ errorsByField }) {
  const labels = Object.keys(errorsByField);
  const values = Object.values(errorsByField);

  const data = {
    labels,
    datasets: [
      {
        label: "Errors",
        data: values,
        backgroundColor: labels.map(
          (_, i) => `${PALETTE[i % PALETTE.length]}cc`
        ),
        borderColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: labels.map(
          (_, i) => PALETTE[i % PALETTE.length]
        ),
      },
    ],
  };

  const options = {
    ...baseOptions,
    indexAxis: "y",
    plugins: {
      ...baseOptions.plugins,
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { color: "rgba(255, 255, 255, 0.04)", drawBorder: false },
        ticks: {
          color: "#64748b",
          font: { family: "Inter, sans-serif", size: 11 },
          precision: 0,
        },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: "#94a3b8",
          font: { family: "Inter, sans-serif", size: 12, weight: 500 },
        },
      },
    },
  };

  return (
    <div className="chart-wrapper">
      <div className="chart-header">
        <h3 className="chart-title">Errors by Field</h3>
        <span className="chart-badge">{labels.length} fields affected</span>
      </div>
      <div className="chart-canvas-container bar-size">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}

// ─── Error Type Distribution ────────────────────────────────────
export function ErrorTypeChart({ errorsByType }) {
  const labels = Object.keys(errorsByType);
  const values = Object.values(errorsByType);
  const total = values.reduce((a, b) => a + b, 0);

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: labels.map(
          (_, i) => `${PALETTE[i % PALETTE.length]}99`
        ),
        borderColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    ...baseOptions,
    cutout: "60%",
    plugins: {
      ...baseOptions.plugins,
      legend: {
        ...baseOptions.plugins.legend,
        position: "bottom",
      },
    },
  };

  return (
    <div className="chart-wrapper">
      <div className="chart-header">
        <h3 className="chart-title">Error Categories</h3>
        <span className="chart-badge">{total} total errors</span>
      </div>
      <div className="chart-canvas-container doughnut-size">
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
}

// ─── Error Distribution Across Rows ─────────────────────────────
export function ErrorDistributionChart({ errorDistribution }) {
  const labels = errorDistribution.map((d) => `Rows ${d.label}`);
  const values = errorDistribution.map((d) => d.errors);

  const data = {
    labels,
    datasets: [
      {
        label: "Errors in range",
        data: values,
        backgroundColor: "rgba(99, 102, 241, 0.5)",
        borderColor: "#6366f1",
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#64748b",
          font: { family: "Inter, sans-serif", size: 10 },
          maxRotation: 45,
        },
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.04)", drawBorder: false },
        ticks: {
          color: "#64748b",
          font: { family: "Inter, sans-serif", size: 11 },
          precision: 0,
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="chart-wrapper">
      <div className="chart-header">
        <h3 className="chart-title">Error Distribution Across Dataset</h3>
        <span className="chart-badge">Row-level heatmap</span>
      </div>
      <div className="chart-canvas-container bar-size">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
