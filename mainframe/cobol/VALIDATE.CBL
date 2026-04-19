       IDENTIFICATION DIVISION.
       PROGRAM-ID. VALIDATE.
       AUTHOR. AI-DATA-VALIDATION-SYSTEM.
       DATE-WRITTEN. 2026-04-14.
      *================================================================
      * PROGRAM: VALIDATE
      * PURPOSE: Reads input dataset, applies domain-based validation
      *          rules (Banking/Healthcare/E-Commerce), and writes
      *          valid/invalid records to output datasets.
      *          Results are inserted into DB2 tables.
      *================================================================

       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT INPUT-FILE  ASSIGN TO INFILE
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-INPUT-STATUS.
           SELECT VALID-FILE  ASSIGN TO VALFILE
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-VALID-STATUS.
           SELECT ERROR-FILE  ASSIGN TO ERRFILE
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-ERROR-STATUS.

       DATA DIVISION.
       FILE SECTION.

       FD INPUT-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS.
       01 INPUT-RECORD.
           05 INP-DATA          PIC X(200).

       FD VALID-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS.
       01 VALID-RECORD.
           05 VAL-DATA          PIC X(200).

       FD ERROR-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS.
       01 ERROR-RECORD.
           05 ERR-DATA          PIC X(200).
           05 ERR-MSG           PIC X(100).

       WORKING-STORAGE SECTION.

       01 WS-INPUT-STATUS       PIC XX.
       01 WS-VALID-STATUS       PIC XX.
       01 WS-ERROR-STATUS       PIC XX.
       01 WS-EOF                PIC X VALUE 'N'.
           88 END-OF-FILE       VALUE 'Y'.

      * Counters
       01 WS-TOTAL-RECORDS      PIC 9(7)  VALUE 0.
       01 WS-VALID-COUNT        PIC 9(7)  VALUE 0.
       01 WS-INVALID-COUNT      PIC 9(7)  VALUE 0.
       01 WS-SCORE              PIC 9(3)V99 VALUE 0.

      * Domain parameter (BANKING / HEALTH / ECOM)
       01 WS-DOMAIN             PIC X(10) VALUE SPACES.

      * Banking fields
       01 WS-BANK-REC.
           05 WS-BANK-NAME      PIC X(30).
           05 WS-BANK-AGE       PIC 9(3).
           05 WS-BANK-INCOME    PIC 9(10)V99.
           05 WS-BANK-CREDIT    PIC 9(3).

      * Healthcare fields
       01 WS-HEALTH-REC.
           05 WS-HLTH-NAME      PIC X(30).
           05 WS-HLTH-AGE       PIC 9(3).
           05 WS-HLTH-BLOOD     PIC X(5).

      * E-Commerce fields
       01 WS-ECOM-REC.
           05 WS-ECOM-PRODUCT   PIC X(30).
           05 WS-ECOM-PRICE     PIC 9(8)V99.
           05 WS-ECOM-STOCK     PIC 9(6).

       01 WS-ERROR-MESSAGE      PIC X(100) VALUE SPACES.
       01 WS-RECORD-VALID       PIC X VALUE 'Y'.

      * DB2 variables
           EXEC SQL INCLUDE SQLCA END-EXEC.

       01 DB2-RUN-ID            PIC S9(9) COMP.

       PROCEDURE DIVISION.
       0000-MAIN-PARA.
           ACCEPT WS-DOMAIN FROM JCL-PARM.

           PERFORM 1000-OPEN-FILES.
           PERFORM 2000-PROCESS-RECORDS
               UNTIL END-OF-FILE.
           PERFORM 3000-CALCULATE-SCORE.
           PERFORM 4000-INSERT-DB2-RUN.
           PERFORM 5000-CLOSE-FILES.
           STOP RUN.

       1000-OPEN-FILES.
           OPEN INPUT  INPUT-FILE.
           OPEN OUTPUT VALID-FILE.
           OPEN OUTPUT ERROR-FILE.

       2000-PROCESS-RECORDS.
           READ INPUT-FILE
               AT END SET END-OF-FILE TO TRUE
               NOT AT END
                   ADD 1 TO WS-TOTAL-RECORDS
                   MOVE 'Y' TO WS-RECORD-VALID
                   MOVE SPACES TO WS-ERROR-MESSAGE

                   EVALUATE WS-DOMAIN
                       WHEN 'BANKING'
                           PERFORM 2100-VALIDATE-BANKING
                       WHEN 'HEALTH'
                           PERFORM 2200-VALIDATE-HEALTH
                       WHEN 'ECOM'
                           PERFORM 2300-VALIDATE-ECOM
                       WHEN OTHER
                           MOVE 'UNKNOWN DOMAIN' TO WS-ERROR-MESSAGE
                           MOVE 'N' TO WS-RECORD-VALID
                   END-EVALUATE

                   IF WS-RECORD-VALID = 'Y'
                       WRITE VALID-RECORD FROM INPUT-RECORD
                       ADD 1 TO WS-VALID-COUNT
                   ELSE
                       MOVE INP-DATA TO ERR-DATA
                       MOVE WS-ERROR-MESSAGE TO ERR-MSG
                       WRITE ERROR-RECORD
                       ADD 1 TO WS-INVALID-COUNT
                   END-IF
           END-READ.

       2100-VALIDATE-BANKING.
           MOVE INP-DATA TO WS-BANK-REC.
           IF WS-BANK-AGE < 18 OR WS-BANK-AGE > 65
               STRING 'AGE OUT OF RANGE (18-65): '
                   WS-BANK-AGE
                   DELIMITED BY SIZE INTO WS-ERROR-MESSAGE
               MOVE 'N' TO WS-RECORD-VALID
           END-IF.
           IF WS-BANK-INCOME <= 0
               MOVE 'INCOME MUST BE > 0' TO WS-ERROR-MESSAGE
               MOVE 'N' TO WS-RECORD-VALID
           END-IF.
           IF WS-BANK-CREDIT < 300 OR WS-BANK-CREDIT > 900
               MOVE 'CREDIT SCORE OUT OF RANGE (300-900)'
                   TO WS-ERROR-MESSAGE
               MOVE 'N' TO WS-RECORD-VALID
           END-IF.

       2200-VALIDATE-HEALTH.
           MOVE INP-DATA TO WS-HEALTH-REC.
           IF WS-HLTH-AGE < 0 OR WS-HLTH-AGE > 120
               MOVE 'AGE OUT OF RANGE (0-120)'
                   TO WS-ERROR-MESSAGE
               MOVE 'N' TO WS-RECORD-VALID
           END-IF.
           IF WS-HLTH-BLOOD NOT = 'A+'
               AND WS-HLTH-BLOOD NOT = 'A-'
               AND WS-HLTH-BLOOD NOT = 'B+'
               AND WS-HLTH-BLOOD NOT = 'B-'
               AND WS-HLTH-BLOOD NOT = 'O+'
               AND WS-HLTH-BLOOD NOT = 'O-'
               AND WS-HLTH-BLOOD NOT = 'AB+'
               AND WS-HLTH-BLOOD NOT = 'AB-'
               MOVE 'INVALID BLOOD GROUP' TO WS-ERROR-MESSAGE
               MOVE 'N' TO WS-RECORD-VALID
           END-IF.

       2300-VALIDATE-ECOM.
           MOVE INP-DATA TO WS-ECOM-REC.
           IF WS-ECOM-PRICE <= 0
               MOVE 'PRICE MUST BE > 0' TO WS-ERROR-MESSAGE
               MOVE 'N' TO WS-RECORD-VALID
           END-IF.
           IF WS-ECOM-STOCK < 0
               MOVE 'STOCK MUST BE >= 0' TO WS-ERROR-MESSAGE
               MOVE 'N' TO WS-RECORD-VALID
           END-IF.

       3000-CALCULATE-SCORE.
           IF WS-TOTAL-RECORDS > 0
               COMPUTE WS-SCORE =
                   (WS-VALID-COUNT / WS-TOTAL-RECORDS) * 100
           END-IF.

       4000-INSERT-DB2-RUN.
           EXEC SQL
               INSERT INTO DATASET_RUN
                   (DOMAIN, FILE_NAME, TOTAL_RECORDS,
                    VALID_COUNT, INVALID_COUNT, SCORE, STATUS)
               VALUES
                   (:WS-DOMAIN, 'INPUT-DATA',
                    :WS-TOTAL-RECORDS,
                    :WS-VALID-COUNT,
                    :WS-INVALID-COUNT,
                    :WS-SCORE, 'COMPLETED')
           END-EXEC.

           IF SQLCODE NOT = 0
               DISPLAY 'DB2 INSERT FAILED: ' SQLCODE
           END-IF.

       5000-CLOSE-FILES.
           CLOSE INPUT-FILE.
           CLOSE VALID-FILE.
           CLOSE ERROR-FILE.
