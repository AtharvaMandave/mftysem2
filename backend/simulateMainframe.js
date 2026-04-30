/**
 * simulateMainframe.js
 * 
 * Integration Layer — Runs compiled COBOL validation when
 * validate_batch(.exe) is present next to this script; otherwise uses
 * JavaScript rules that mirror the COBOL checks.
 * Writes backend/output/report.json.
 *
 * Optional: set COBOL_VALIDATE_EXE to the full path of the compiler output.
 * 
 * Usage: node simulateMainframe.js <domain> <inputFile>
 *   domain: BANKING | HEALTHCARE | ECOMMERCE
 *   inputFile: path to the uploaded CSV/text file
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ─── CLI Arguments ──────────────────────────────────────────────
const args = process.argv.slice(2);
const domain = (args[0] || 'BANKING').toUpperCase();
const inputFile = args[1] || path.join(__dirname, 'uploads', 'data.csv');
const outputDir = path.join(__dirname, 'output');
const reportPath = path.join(outputDir, 'report.json');

// ─── COBOL batch (GnuCOBOL) — if compile output exists, use it ----------
function resolveCobolExe() {
  const override = process.env.COBOL_VALIDATE_EXE;
  if (override && fs.existsSync(override)) return override;
  const name = process.platform === 'win32' ? 'validate_batch.exe' : 'validate_batch';
  const candidates = [
    path.join(__dirname, name),
    path.join(__dirname, '..', 'mainframe', 'cobol', name),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function runCobolValidator() {
  const exe = resolveCobolExe();
  if (!exe) return false;
  if (!fs.existsSync(inputFile)) return false;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const env = {
    ...process.env,
    VALIDATE_DOMAIN: domain,
    VALIDATE_INPUT: path.resolve(inputFile),
    VALIDATE_OUTPUT: path.resolve(reportPath),
  };
  if (process.platform === 'win32') {
    const ucrtBin = 'C:/msys64/ucrt64/bin';
    const configDir = 'C:/msys64/ucrt64/share/gnucobol/config';
    const copyDir = 'C:/msys64/ucrt64/share/gnucobol/copy';
    const defaultConf = path.join(configDir, 'default.conf');
    if (fs.existsSync(ucrtBin)) {
      const pathKey = Object.keys(env).find(k => k.toUpperCase() === 'PATH') || 'PATH';
      const currentPath = env[pathKey] || '';
      if (!currentPath.toLowerCase().includes('c:/msys64/ucrt64/bin')) {
        env[pathKey] = `${ucrtBin};${currentPath}`;
      }
    }
    if (!env.COB_CONFIG_DIR && fs.existsSync(defaultConf)) {
      env.COB_CONFIG_DIR = configDir;
    }
    if (!env.COB_COPY_DIR && fs.existsSync(copyDir)) {
      env.COB_COPY_DIR = copyDir;
    }
  }
  const r = spawnSync(exe, [], { encoding: 'utf8', env, maxBuffer: 8 * 1024 * 1024 });
  if (r.error) {
    console.error('[COBOL] spawn error:', r.error.message);
    return false;
  }
  if (r.status !== 0) {
    console.error('[COBOL] exit', r.status);
    if (r.stderr) console.error(r.stderr);
    if (r.stdout) console.error(r.stdout);
    return false;
  }
  console.log(`[MAINFRAME] Validation via COBOL: ${exe}`);
  console.log(`[OUTPUT] ${reportPath}`);
  process.exit(0);
}

if (!runCobolValidator()) {
  console.log('[MAINFRAME] Using JS fallback validator');
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// ─── Read Input File ────────────────────────────────────────────
if (!fs.existsSync(inputFile)) {
  console.error(`[ERROR] Input file not found: ${inputFile}`);
  process.exit(1);
}

const raw = fs.readFileSync(inputFile, 'utf-8');
const lines = raw.split(/\r?\n/).filter(line => line.trim() !== '');

if (lines.length === 0) {
  console.error('[ERROR] Input file is empty.');
  process.exit(1);
}

// First line is the header
const header = lines[0].split(',').map(h => h.trim().toUpperCase());
const dataLines = lines.slice(1);

console.log(`[MAINFRAME SIM] Domain: ${domain}`);
console.log(`[MAINFRAME SIM] Input:  ${inputFile}`);
console.log(`[MAINFRAME SIM] Total data rows: ${dataLines.length}`);
console.log(`[MAINFRAME SIM] Headers: ${header.join(', ')}`);

// ─── Parse Records ──────────────────────────────────────────────
function parseRecord(line) {
  const values = line.split(',').map(v => v.trim());
  const record = {};
  header.forEach((h, i) => {
    record[h] = values[i] || '';
  });
  return record;
}

// ─── Validation Rules ───────────────────────────────────────────

function validateBanking(record) {
  const errors = [];
  
  const age = parseInt(record['AGE'], 10);
  if (isNaN(age) || age < 18 || age > 65) {
    errors.push(`AGE out of range (18-65): got "${record['AGE']}"`);
  }

  const income = parseFloat(record['INCOME']);
  if (isNaN(income) || income <= 0) {
    errors.push(`INCOME must be > 0: got "${record['INCOME']}"`);
  }

  const credit = parseInt(record['CREDIT_SCORE'], 10);
  if (isNaN(credit) || credit < 300 || credit > 900) {
    errors.push(`CREDIT_SCORE out of range (300-900): got "${record['CREDIT_SCORE']}"`);
  }

  // Optional: validate NAME not empty
  if (!record['NAME'] || record['NAME'].trim() === '') {
    errors.push('NAME is required');
  }

  return errors;
}

function validateHealthcare(record) {
  const errors = [];
  const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  const age = parseInt(record['AGE'], 10);
  if (isNaN(age) || age < 0 || age > 120) {
    errors.push(`AGE out of range (0-120): got "${record['AGE']}"`);
  }

  const blood = (record['BLOOD_GROUP'] || '').trim().toUpperCase();
  if (!validBloodGroups.includes(blood)) {
    errors.push(`Invalid BLOOD_GROUP: got "${record['BLOOD_GROUP']}"`);
  }

  if (!record['NAME'] || record['NAME'].trim() === '') {
    errors.push('NAME (patient name) is required');
  }

  return errors;
}

function validateEcommerce(record) {
  const errors = [];

  const price = parseFloat(record['PRICE']);
  if (isNaN(price) || price <= 0) {
    errors.push(`PRICE must be > 0: got "${record['PRICE']}"`);
  }

  const stock = parseInt(record['STOCK'], 10);
  if (isNaN(stock) || stock < 0) {
    errors.push(`STOCK must be >= 0: got "${record['STOCK']}"`);
  }

  if (!record['PRODUCT'] || record['PRODUCT'].trim() === '') {
    errors.push('PRODUCT name is required');
  }

  return errors;
}

function validateRecord(record, domain) {
  switch (domain) {
    case 'BANKING':
      return validateBanking(record);
    case 'HEALTHCARE':
      return validateHealthcare(record);
    case 'ECOMMERCE':
      return validateEcommerce(record);
    default:
      return [`Unknown domain: ${domain}`];
  }
}

// ─── Process All Records ────────────────────────────────────────
const validRecords = [];
const errorRecords = [];

dataLines.forEach((line, index) => {
  const record = parseRecord(line);
  const errors = validateRecord(record, domain);

  if (errors.length === 0) {
    validRecords.push({
      row: index + 2, // +2 because: 1-indexed + header row
      data: record,
    });
  } else {
    errorRecords.push({
      row: index + 2,
      data: record,
      errors: errors,
    });
  }
});

// ─── Calculate Score ────────────────────────────────────────────
const total = dataLines.length;
const validCount = validRecords.length;
const invalidCount = errorRecords.length;
const score = total > 0 ? parseFloat(((validCount / total) * 100).toFixed(2)) : 0;

// ─── Build Report ───────────────────────────────────────────────
const report = {
  runId: `RUN-${Date.now()}`,
  domain: domain,
  fileName: path.basename(inputFile),
  timestamp: new Date().toISOString(),
  summary: {
    total,
    valid: validCount,
    invalid: invalidCount,
    score,
  },
  validRecords: validRecords,
  errorRecords: errorRecords,
};

// ─── Write Output ───────────────────────────────────────────────
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

console.log('');
console.log('╔══════════════════════════════════════════╗');
console.log('║     MAINFRAME BATCH JOB COMPLETE         ║');
console.log('╠══════════════════════════════════════════╣');
console.log(`║  Domain:      ${domain.padEnd(26)}║`);
console.log(`║  Total:       ${String(total).padEnd(26)}║`);
console.log(`║  Valid:       ${String(validCount).padEnd(26)}║`);
console.log(`║  Invalid:     ${String(invalidCount).padEnd(26)}║`);
console.log(`║  Score:       ${(score + '%').padEnd(26)}║`);
console.log('╚══════════════════════════════════════════╝');
console.log(`\n[OUTPUT] ${reportPath}`);

process.exit(0);
