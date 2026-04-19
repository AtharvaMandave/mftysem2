/**
 * simulateMainframe.js
 * 
 * Integration Layer — Simulates COBOL mainframe batch job processing.
 * Reads an uploaded dataset, applies domain-specific validation rules,
 * and writes results to backend/output/report.json.
 * 
 * Usage: node simulateMainframe.js <domain> <inputFile>
 *   domain: BANKING | HEALTHCARE | ECOMMERCE
 *   inputFile: path to the uploaded CSV/text file
 */

const fs = require('fs');
const path = require('path');

// ─── CLI Arguments ──────────────────────────────────────────────
const args = process.argv.slice(2);
const domain = (args[0] || 'BANKING').toUpperCase();
const inputFile = args[1] || path.join(__dirname, 'uploads', 'data.csv');
const outputDir = path.join(__dirname, 'output');

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
const outputPath = path.join(outputDir, 'report.json');
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

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
console.log(`\n[OUTPUT] ${outputPath}`);

process.exit(0);
