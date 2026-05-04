/**
 * server.js — Lightweight Express API for DB2 data
 * 
 * Serves dashboard stats, history, export, and run details
 * from the DB2 database. The Next.js frontend proxies to this.
 * 
 * Usage: node server.js
 * Runs on port 4000 by default.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

app.use(cors());
app.use(express.json());

// ─── Health Check ───────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const conn = await db.connect();
    conn.closeSync();
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: err.message });
  }
});

// ─── Dashboard Stats ────────────────────────────────────────────
app.get('/api/dashboard', async (req, res) => {
  try {
    const stats = await db.getDashboardStats();
    const history = await db.getHistory();
    res.json({ success: true, stats, history });
  } catch (err) {
    console.error('[DASHBOARD ERROR]', err.message);
    res.status(500).json({ error: 'Failed to load dashboard: ' + err.message });
  }
});

// ─── Export Clean CSV ───────────────────────────────────────────
app.get('/api/export-clean', async (req, res) => {
  try {
    const runId = parseInt(req.query.runId, 10);
    if (!runId) {
      return res.status(400).json({ error: 'runId parameter is required' });
    }

    const rows = await db.getValidRecordsForExport(runId);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No valid records found for this run' });
    }

    // Parse JSON RECORD_DATA and build CSV
    const parsedRecords = rows.map((r) => {
      try { return JSON.parse(r.RECORD_DATA); }
      catch { return {}; }
    });

    const headerSet = new Set();
    parsedRecords.forEach((rec) =>
      Object.keys(rec).forEach((k) => headerSet.add(k))
    );
    const headers = Array.from(headerSet);

    const csvLines = [headers.join(',')];
    parsedRecords.forEach((rec) => {
      const row = headers.map((h) => {
        const val = rec[h] || '';
        if (String(val).includes(',') || String(val).includes('"')) {
          return `"${String(val).replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvLines.push(row.join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="clean_data_run_${runId}.csv"`);
    res.send(csvLines.join('\n'));
  } catch (err) {
    console.error('[EXPORT ERROR]', err.message);
    res.status(500).json({ error: 'Export failed: ' + err.message });
  }
});

// ─── Run Details ────────────────────────────────────────────────
app.get('/api/run/:runId', async (req, res) => {
  try {
    const runId = parseInt(req.params.runId, 10);
    const details = await db.getRunDetails(runId);
    if (!details.run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    res.json({ success: true, ...details });
  } catch (err) {
    console.error('[RUN DETAILS ERROR]', err.message);
    res.status(500).json({ error: 'Failed to load run: ' + err.message });
  }
});

// ─── Start Server ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   DB2 Backend API Server                 ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║   Port: ${String(PORT).padEnd(32)}║`);
  console.log(`║   Status: Running                        ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});
