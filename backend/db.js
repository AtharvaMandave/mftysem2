require('dotenv').config();
const ibmdb = require('ibm_db');

const connStr = process.env.DB2_CONN_STRING || `DATABASE=${process.env.DB2_DATABASE};HOSTNAME=${process.env.DB2_HOSTNAME};PORT=${process.env.DB2_PORT};PROTOCOL=TCPIP;UID=${process.env.DB2_UID};PWD=${process.env.DB2_PWD};`;

async function connect() {
  return new Promise((resolve, reject) => {
    ibmdb.open(connStr, (err, conn) => {
      if (err) {
        console.error('[DB2 ERROR] Failed to connect to DB2:', err.message);
        reject(err);
      } else {
        conn.query('SET SCHEMA "ATHARVA MANDAVE"', (err2) => {
          if (err2) {
            console.error('[DB2 ERROR] Failed to set schema:', err2.message);
            reject(err2);
          } else {
            console.log('[DB2 SUCCESS] Connected to DB2 database');
            resolve(conn);
          }
        });
      }
    });
  });
}

async function saveValidationRun(domain, fileName, total, valid, invalid, score) {
  let conn;
  try {
    conn = await connect();
    const query = `
      INSERT INTO DATASET_RUN (DOMAIN, FILE_NAME, TOTAL_RECORDS, VALID_COUNT, INVALID_COUNT, SCORE, STATUS)
      VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED')
    `;
    const params = [domain, fileName, total, valid, invalid, score];
    
    // We need to return the inserted ID. DB2 usually needs us to query it back or use identity.
    // For simplicity, we just insert first.
    return new Promise((resolve, reject) => {
      conn.queryResult(query, params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          // Unfortunately getting the identity via ibm_db requires querying IDENTITY_VAL_LOCAL()
          conn.query("SELECT IDENTITY_VAL_LOCAL() AS RUN_ID FROM SYSIBM.SYSDUMMY1", (errId, resultId) => {
            conn.close();
            if (errId) {
              reject(errId);
            } else {
              const runId = resultId[0].RUN_ID;
              resolve(runId);
            }
          });
        }
      });
    });
  } catch (error) {
    if (conn) conn.closeSync();
    throw error;
  }
}

async function saveValidRecords(runId, validRecords) {
  if (!validRecords || validRecords.length === 0) return;
  let conn;
  try {
    conn = await connect();
    const query = `INSERT INTO VALID_RECORDS (RUN_ID, RECORD_DATA) VALUES (?, ?)`;
    
    // For batch inserts we loop or use prepare
    for (const record of validRecords) {
      const recordData = JSON.stringify(record.data);
      await new Promise((resolve, reject) => {
        conn.query(query, [runId, recordData], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    conn.closeSync();
  } catch (error) {
    if (conn) conn.closeSync();
    throw error;
  }
}

async function saveErrorRecords(runId, errorRecords) {
  if (!errorRecords || errorRecords.length === 0) return;
  let conn;
  try {
    conn = await connect();
    const query = `INSERT INTO ERROR_RECORDS (RUN_ID, RECORD_DATA, ERROR_MSG) VALUES (?, ?, ?)`;
    
    for (const record of errorRecords) {
      const recordData = JSON.stringify(record.data);
      const errorMsg = record.errors.join(' | ');
      await new Promise((resolve, reject) => {
        conn.query(query, [runId, recordData, errorMsg], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    conn.closeSync();
  } catch (error) {
    if (conn) conn.closeSync();
    throw error;
  }
}

async function getHistory() {
  let conn;
  try {
    conn = await connect();
    return new Promise((resolve, reject) => {
      conn.query(
        `SELECT RUN_ID, DOMAIN, FILE_NAME, TOTAL_RECORDS, VALID_COUNT, INVALID_COUNT, SCORE, RUN_DATE, STATUS
         FROM DATASET_RUN ORDER BY RUN_DATE DESC FETCH FIRST 50 ROWS ONLY`,
        (err, rows) => {
          conn.closeSync();
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  } catch (error) {
    if (conn) conn.closeSync();
    throw error;
  }
}

async function getRunDetails(runId) {
  let conn;
  try {
    conn = await connect();

    const run = await new Promise((resolve, reject) => {
      conn.query(
        `SELECT * FROM DATASET_RUN WHERE RUN_ID = ?`, [runId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows[0] || null);
        }
      );
    });

    const validRecords = await new Promise((resolve, reject) => {
      conn.query(
        `SELECT RECORD_ID, RECORD_DATA FROM VALID_RECORDS WHERE RUN_ID = ?`, [runId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const errorRecords = await new Promise((resolve, reject) => {
      conn.query(
        `SELECT ERROR_ID, RECORD_DATA, ERROR_MSG FROM ERROR_RECORDS WHERE RUN_ID = ?`, [runId],
        (err, rows) => {
          conn.closeSync();
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    return { run, validRecords, errorRecords };
  } catch (error) {
    if (conn) conn.closeSync();
    throw error;
  }
}

async function getValidRecordsForExport(runId) {
  let conn;
  try {
    conn = await connect();
    return new Promise((resolve, reject) => {
      conn.query(
        `SELECT RECORD_DATA FROM VALID_RECORDS WHERE RUN_ID = ?`, [runId],
        (err, rows) => {
          conn.closeSync();
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  } catch (error) {
    if (conn) conn.closeSync();
    throw error;
  }
}

async function getDashboardStats() {
  let conn;
  try {
    conn = await connect();

    const totals = await new Promise((resolve, reject) => {
      conn.query(
        `SELECT COUNT(*) AS TOTAL_RUNS,
                COALESCE(SUM(TOTAL_RECORDS), 0) AS TOTAL_RECORDS,
                COALESCE(SUM(VALID_COUNT), 0) AS TOTAL_VALID,
                COALESCE(SUM(INVALID_COUNT), 0) AS TOTAL_INVALID,
                COALESCE(AVG(SCORE), 0) AS AVG_SCORE
         FROM DATASET_RUN`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows[0]);
        }
      );
    });

    const byDomain = await new Promise((resolve, reject) => {
      conn.query(
        `SELECT DOMAIN,
                COUNT(*) AS RUNS,
                COALESCE(SUM(TOTAL_RECORDS), 0) AS RECORDS,
                COALESCE(AVG(SCORE), 0) AS AVG_SCORE
         FROM DATASET_RUN GROUP BY DOMAIN ORDER BY RUNS DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const recentRuns = await new Promise((resolve, reject) => {
      conn.query(
        `SELECT RUN_ID, DOMAIN, FILE_NAME, SCORE, RUN_DATE
         FROM DATASET_RUN ORDER BY RUN_DATE DESC FETCH FIRST 10 ROWS ONLY`,
        (err, rows) => {
          conn.closeSync();
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    return { totals, byDomain, recentRuns };
  } catch (error) {
    if (conn) conn.closeSync();
    throw error;
  }
}

module.exports = {
  connect,
  saveValidationRun,
  saveValidRecords,
  saveErrorRecords,
  getHistory,
  getRunDetails,
  getValidRecordsForExport,
  getDashboardStats
};
