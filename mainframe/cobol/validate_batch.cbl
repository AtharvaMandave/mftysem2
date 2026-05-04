*> GnuCOBOL: cobc -free -x -o validate_batch.exe validate_batch.cbl
      *> Place validate_batch.exe in mftysem2/backend/
      *> Node sets env: VALIDATE_DOMAIN, VALIDATE_INPUT, VALIDATE_OUTPUT
       IDENTIFICATION DIVISION.
       PROGRAM-ID. validate-batch.

       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT INPUT-FILE ASSIGN TO DYNAMIC WS-INPATH
               ORGANIZATION IS LINE SEQUENTIAL.
           SELECT REPORT-FILE ASSIGN TO DYNAMIC WS-OUTPATH
               ORGANIZATION IS LINE SEQUENTIAL.

       DATA DIVISION.
       FILE SECTION.
       FD  INPUT-FILE.
       01  INPUT-LINE                     PIC X(8000).
       FD  REPORT-FILE.
       01  REPORT-LINE                    PIC X(32000).

       WORKING-STORAGE SECTION.
       *> --- Numeric-edited pictures for clean JSON-safe strings ---
       01  WS-EDIT-7                      PIC Z(6)9.
       01  WS-EDIT-SCR                    PIC ZZ9.99.

       *> --- String versions of summary counters ---
       01  WS-TOTAL-STR                   PIC X(10).
       01  WS-VALID-STR                   PIC X(10).
       01  WS-INVALID-STR                 PIC X(10).
       01  WS-SCORE-STR                   PIC X(12).

       *> --- String version of row number for JSON embedding ---
       01  WS-ROW-STR                     PIC X(10).

       01  WS-INPATH                      PIC X(512).
       01  WS-OUTPATH                     PIC X(512).
       01  WS-DOMAIN                      PIC X(20).
       01  WS-EOF                         PIC X VALUE 'N'.
           88 END-INPUT                   VALUE 'Y'.

       01  WS-H-COUNT                     PIC 99.
       01  WS-COMMA-N                     PIC 9(4).
       01  WS-F-COUNT                     PIC 99.
       01  WS-FIELDS.
           05 WS-FIELD OCCURS 16 TIMES    PIC X(512).
       01  WS-HDR-NORM OCCURS 16 TIMES    PIC X(48).

       01  WS-ROW-NUM                     PIC 9(7).
       01  WS-TOTAL                       PIC 9(7).
       01  WS-VALID-C                     PIC 9(7).
       01  WS-INVALID-C                   PIC 9(7).
       01  WS-SCORE-N                     PIC 9(3)V99.

       01  WS-RUN-ID                      PIC X(48).
       01  WS-TIMESTAMP                   PIC X(32).
       01  WS-DATE-RAW                    PIC 9(8).
       01  WS-TIME-RAW                    PIC 9(6).
       01  WS-BASE-NAME                   PIC X(512).

       01  WS-I                           PIC 99.
       01  WS-J                           PIC 99.
       01  WS-PTR                         PIC 9(5).
       01  WS-MAX-ROWS                    PIC 9(5) VALUE 800.

       01  WS-REC-OK                      PIC X.
       01  WS-ERR-CNT                     PIC 99.
       01  WS-ERR-R OCCURS 20 TIMES       PIC X(512).
       01  WS-TEMP-MSG                    PIC X(512).

       01  WS-NAME-IX                     PIC 99.
       01  WS-AGE-IX                      PIC 99.
       01  WS-INCOME-IX                   PIC 99.
       01  WS-CREDIT-IX                   PIC 99.
       01  WS-BLOOD-IX                    PIC 99.
       01  WS-DIAG-IX                     PIC 99.
       01  WS-PROD-IX                     PIC 99.
       01  WS-PRICE-IX                    PIC 99.
       01  WS-STOCK-IX                    PIC 99.
       01  WS-ACCNO-IX                   PIC 99.
       01  WS-EMP-IX                      PIC 99.
       01  WS-TXN-IX                      PIC 99.
       01  WS-PCODE-IX                    PIC 99.

       01  WS-NUMVAL                      PIC 9(12)V9999.
       01  WS-INTVAL                      PIC S9(9).
       01  WS-BLOOD-UC                    PIC X(5).
       01  WS-CHK-SRC                     PIC X(80).

       01  WS-NUM-OK                      PIC X VALUE 'N'.
           88 NUM-IS-OK                   VALUE 'Y'.
           88 NUM-IS-BAD                  VALUE 'N'.

       01  WS-VR-L OCCURS 800 TIMES       PIC X(16000).
       01  WS-ER-L OCCURS 800 TIMES       PIC X(16000).
       01  WS-VRC                         PIC 9(5).
       01  WS-ERC                         PIC 9(5).

       01  WS-DATA-JSON                   PIC X(12000).
       01  WS-ESC-IN                      PIC X(512).
       01  WS-ESC-OUT                     PIC X(1024).
       01  WS-EOUT-P                      PIC 9(5).
       01  WS-EC                          PIC 999.
       01  WS-FIRST-FLAG                  PIC X.
       01  WS-LINE-WORK                   PIC X(8000).

       *> JSON fragments
       01  J-H1  PIC X(16)  VALUE '{"runId":"'.
       01  J-H2  PIC X(16)  VALUE '","domain":"'.
       01  J-H3  PIC X(18)  VALUE '","fileName":"'.
       01  J-H4  PIC X(20)  VALUE '","timestamp":"'.
       01  J-H5  PIC X(22)  VALUE '","summary":{"total":'.
       01  J-H6  PIC X(12)  VALUE ',"valid":'.
       01  J-H7  PIC X(14)  VALUE ',"invalid":'.
       01  J-H8  PIC X(12)  VALUE ',"score":'.
       01  J-H9  PIC X(22)  VALUE '},"validRecords":['.
       01  J-HA  PIC X(22)  VALUE '],"errorRecords":['.

       PROCEDURE DIVISION.
       MAIN.
           ACCEPT WS-DOMAIN  FROM ENVIRONMENT "VALIDATE_DOMAIN"
           ACCEPT WS-INPATH  FROM ENVIRONMENT "VALIDATE_INPUT"
           ACCEPT WS-OUTPATH FROM ENVIRONMENT "VALIDATE_OUTPUT"
           IF WS-DOMAIN = SPACES OR WS-INPATH = SPACES
                   OR WS-OUTPATH = SPACES
               DISPLAY "Missing env VALIDATE_*"
               STOP RUN RETURNING 1
           END-IF
           INSPECT WS-DOMAIN CONVERTING "abcdefghijklmnopqrstuvwxyz"
               TO   "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
           MOVE ZERO TO WS-VRC WS-ERC WS-TOTAL WS-VALID-C WS-INVALID-C
           PERFORM META-BASE
           OPEN INPUT INPUT-FILE
           READ INPUT-FILE
               AT END DISPLAY "Empty CSV"
                   CLOSE INPUT-FILE
                   STOP RUN RETURNING 2
           END-READ
           MOVE INPUT-LINE TO WS-LINE-WORK
           PERFORM SPLIT-CSV
           MOVE WS-F-COUNT TO WS-H-COUNT
           PERFORM NORM-HEADER
           PERFORM HDR-IX
           MOVE 1 TO WS-ROW-NUM

           PERFORM UNTIL END-INPUT
               READ INPUT-FILE
                   AT END SET END-INPUT TO TRUE
                   NOT AT END
                       MOVE INPUT-LINE TO WS-LINE-WORK
                       IF FUNCTION LENGTH(FUNCTION TRIM(WS-LINE-WORK
                               TRAILING)) > ZERO
                           ADD 1 TO WS-ROW-NUM
                           ADD 1 TO WS-TOTAL
                           PERFORM SPLIT-CSV
                           IF WS-F-COUNT NOT = WS-H-COUNT
                               MOVE 'N' TO WS-REC-OK
                               MOVE ZERO TO WS-ERR-CNT
                               MOVE "Column count mismatch with header"
                                   TO WS-TEMP-MSG
                               PERFORM ADD-ERR-ONE
                               PERFORM STORE-RESULT
                           ELSE
                               PERFORM DO-VAL
                           END-IF
                       END-IF
               END-READ
           END-PERFORM

           CLOSE INPUT-FILE

           IF WS-TOTAL = ZERO
               MOVE ZERO TO WS-SCORE-N
           ELSE
               COMPUTE WS-SCORE-N ROUNDED =
                   (WS-VALID-C * 100) / WS-TOTAL
           END-IF

           *> --- Convert summary numerics to clean JSON-safe strings ---
           MOVE WS-TOTAL     TO WS-EDIT-7
           MOVE FUNCTION TRIM(WS-EDIT-7 LEADING) TO WS-TOTAL-STR

           MOVE WS-VALID-C   TO WS-EDIT-7
           MOVE FUNCTION TRIM(WS-EDIT-7 LEADING) TO WS-VALID-STR

           MOVE WS-INVALID-C TO WS-EDIT-7
           MOVE FUNCTION TRIM(WS-EDIT-7 LEADING) TO WS-INVALID-STR

           MOVE WS-SCORE-N   TO WS-EDIT-SCR
           MOVE FUNCTION TRIM(WS-EDIT-SCR LEADING) TO WS-SCORE-STR

           PERFORM WRITE-JSON
           STOP RUN RETURNING 0.

       META-BASE.
           ACCEPT WS-DATE-RAW FROM DATE YYYYMMDD
           ACCEPT WS-TIME-RAW FROM TIME
           STRING "RUN-" WS-DATE-RAW "-" WS-TIME-RAW
               INTO WS-RUN-ID
           END-STRING
           STRING WS-DATE-RAW(1:4) "-" WS-DATE-RAW(5:2) "-"
                   WS-DATE-RAW(7:2) "T" WS-TIME-RAW(1:2) ":"
                   WS-TIME-RAW(3:2) ":" WS-TIME-RAW(5:2) "Z"
                   INTO WS-TIMESTAMP
           END-STRING
           MOVE WS-INPATH TO WS-BASE-NAME
           INSPECT WS-BASE-NAME CONVERTING "\" TO "/"
           MOVE ZERO TO WS-PTR
           PERFORM VARYING WS-I FROM 512 BY -1 UNTIL WS-I < 1
               IF WS-BASE-NAME(WS-I:1) = '/'
                   COMPUTE WS-PTR = WS-I + 1
                   EXIT PERFORM
               END-IF
           END-PERFORM
           IF WS-PTR > ZERO
               MOVE WS-BASE-NAME(WS-PTR:480) TO WS-BASE-NAME
           END-IF
           MOVE FUNCTION TRIM(WS-BASE-NAME) TO WS-BASE-NAME.

       SPLIT-CSV.
           MOVE SPACES TO WS-FIELDS
           MOVE ZERO TO WS-COMMA-N
           INSPECT WS-LINE-WORK TALLYING WS-COMMA-N FOR ALL ","
           COMPUTE WS-F-COUNT = WS-COMMA-N + 1
           IF WS-F-COUNT > 16
               MOVE 16 TO WS-F-COUNT
           END-IF
           MOVE 1 TO WS-PTR
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > WS-F-COUNT
               IF WS-I < WS-F-COUNT
                   UNSTRING WS-LINE-WORK DELIMITED BY ","
                       INTO WS-FIELD(WS-I) WITH POINTER WS-PTR
                   END-UNSTRING
               ELSE
                   MOVE WS-LINE-WORK(WS-PTR:) TO WS-FIELD(WS-I)
               END-IF
           END-PERFORM
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > WS-F-COUNT
               MOVE FUNCTION TRIM(WS-FIELD(WS-I) TRAILING)
                   TO WS-FIELD(WS-I)
           END-PERFORM.

       NORM-HEADER.
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > WS-H-COUNT
               MOVE WS-FIELD(WS-I) TO WS-HDR-NORM(WS-I)
               INSPECT WS-HDR-NORM(WS-I) CONVERTING
                   "abcdefghijklmnopqrstuvwxyz"
                   TO "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
           END-PERFORM.

       HDR-IX.
           MOVE ZERO TO WS-NAME-IX WS-AGE-IX WS-INCOME-IX WS-CREDIT-IX
               WS-BLOOD-IX WS-DIAG-IX WS-PROD-IX WS-PRICE-IX WS-STOCK-IX
               WS-ACCNO-IX WS-EMP-IX WS-TXN-IX
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > WS-H-COUNT
               EVALUATE FUNCTION TRIM(WS-HDR-NORM(WS-I) TRAILING)
                   WHEN "NAME"         MOVE WS-I TO WS-NAME-IX
                   WHEN "AGE"          MOVE WS-I TO WS-AGE-IX
                   WHEN "INCOME"       MOVE WS-I TO WS-INCOME-IX
                   WHEN "CREDIT_SCORE" MOVE WS-I TO WS-CREDIT-IX
                   WHEN "BLOOD_GROUP"  MOVE WS-I TO WS-BLOOD-IX
                   WHEN "DIAGNOSIS"    MOVE WS-I TO WS-DIAG-IX
                   WHEN "PRODUCT"      MOVE WS-I TO WS-PROD-IX
                   WHEN "PRICE"        MOVE WS-I TO WS-PRICE-IX
                   WHEN "STOCK"        MOVE WS-I TO WS-STOCK-IX
                   WHEN "ACCOUNT_NUMBER" MOVE WS-I TO WS-ACCNO-IX
                   WHEN "EMPLOYEE_ID"     MOVE WS-I TO WS-EMP-IX
                   WHEN "TRANSACTION_CODE" MOVE WS-I TO WS-TXN-IX
                   WHEN "PRODUCT_CODE" MOVE WS-I TO WS-PCODE-IX
               END-EVALUATE
           END-PERFORM.

       DO-VAL.
           MOVE 'Y' TO WS-REC-OK
           MOVE ZERO TO WS-ERR-CNT
           EVALUATE WS-DOMAIN
               WHEN "BANKING"    PERFORM VAL-BANK
               WHEN "HEALTHCARE" PERFORM VAL-HLTH
               WHEN "ECOMMERCE"  PERFORM VAL-ECOM
               WHEN OTHER
                   MOVE "Unknown domain" TO WS-TEMP-MSG
                   PERFORM ADD-ERR-ONE
           END-EVALUATE
           IF WS-ERR-CNT > ZERO
               MOVE 'N' TO WS-REC-OK
           END-IF
           PERFORM STORE-RESULT.

       ADD-ERR-ONE.
           ADD 1 TO WS-ERR-CNT
           IF WS-ERR-CNT <= 20
               MOVE WS-TEMP-MSG TO WS-ERR-R(WS-ERR-CNT)
           END-IF.

       STORE-RESULT.
           IF WS-REC-OK = 'Y'
               ADD 1 TO WS-VALID-C
               PERFORM PUSH-VALID
           ELSE
               ADD 1 TO WS-INVALID-C
               PERFORM PUSH-ERR
           END-IF.

       VAL-BANK.
           IF WS-AGE-IX = ZERO OR WS-INCOME-IX = ZERO
                   OR WS-CREDIT-IX = ZERO OR WS-NAME-IX = ZERO
               MOVE "Required banking columns missing from header"
                   TO WS-TEMP-MSG
               PERFORM ADD-ERR-ONE
               EXIT PARAGRAPH
           END-IF
           IF FUNCTION LENGTH(FUNCTION TRIM(WS-FIELD(WS-NAME-IX)
               TRAILING)) = ZERO
               MOVE "NAME is needed" TO WS-TEMP-MSG
               PERFORM ADD-ERR-ONE
           END-IF

           IF WS-ACCNO-IX = ZERO
               MOVE "ACCOUNT_NUMBER column missing from header"
                   TO WS-TEMP-MSG
               PERFORM ADD-ERR-ONE
           ELSE
               IF FUNCTION LENGTH(FUNCTION TRIM(
                       WS-FIELD(WS-ACCNO-IX) TRAILING)) = ZERO
                   MOVE "ACCOUNT_NUMBER is required" TO WS-TEMP-MSG
                   PERFORM ADD-ERR-ONE
               ELSE
                   MOVE WS-FIELD(WS-ACCNO-IX) TO WS-CHK-SRC
                   PERFORM CHK-HEX
                   IF NUM-IS-BAD
                       STRING "ACCOUNT_NUMBER must be packed-hex "
                           "X'<digits>F/C/D': got "
                           FUNCTION TRIM(WS-CHK-SRC TRAILING)
                           INTO WS-TEMP-MSG
                       END-STRING
                       PERFORM ADD-ERR-ONE
                   END-IF
               END-IF
           END-IF
           MOVE WS-FIELD(WS-AGE-IX) TO WS-CHK-SRC
           PERFORM CHK-INT
           IF NUM-IS-BAD
               STRING "AGE out of range (18-65): got "
                   FUNCTION TRIM(WS-CHK-SRC TRAILING)
                   INTO WS-TEMP-MSG
               END-STRING
               PERFORM ADD-ERR-ONE
           ELSE
               IF WS-INTVAL < 18 OR WS-INTVAL > 65
                   STRING "AGE out of range (18-65): got "
                       FUNCTION TRIM(WS-CHK-SRC TRAILING)
                       INTO WS-TEMP-MSG
                   END-STRING
                   PERFORM ADD-ERR-ONE
               END-IF
           END-IF
           MOVE WS-FIELD(WS-INCOME-IX) TO WS-CHK-SRC
           PERFORM CHK-FLOAT
           IF NUM-IS-BAD
               STRING "INCOME must be > 0: got "
                   FUNCTION TRIM(WS-CHK-SRC TRAILING)
                   INTO WS-TEMP-MSG
               END-STRING
               PERFORM ADD-ERR-ONE
           ELSE
               IF WS-NUMVAL <= ZERO
                   STRING "INCOME must be > 0: got "
                       FUNCTION TRIM(WS-CHK-SRC TRAILING)
                       INTO WS-TEMP-MSG
                   END-STRING
                   PERFORM ADD-ERR-ONE
               END-IF
           END-IF
           MOVE WS-FIELD(WS-CREDIT-IX) TO WS-CHK-SRC
           PERFORM CHK-INT
           IF NUM-IS-BAD
               STRING "CREDIT_SCORE out of range (300-900): got "
                   FUNCTION TRIM(WS-CHK-SRC TRAILING)
                   INTO WS-TEMP-MSG
               END-STRING
               PERFORM ADD-ERR-ONE
           ELSE
               IF WS-INTVAL < 300 OR WS-INTVAL > 900
                   STRING "CREDIT_SCORE out of range (300-900): got "
                       FUNCTION TRIM(WS-CHK-SRC TRAILING)
                       INTO WS-TEMP-MSG
                   END-STRING
                   PERFORM ADD-ERR-ONE
               END-IF
           END-IF

           *> --- EMPLOYEE_ID: exactly 6 digits, no decimals ---
           IF WS-EMP-IX > ZERO
               IF FUNCTION LENGTH(FUNCTION TRIM(
                       WS-FIELD(WS-EMP-IX) TRAILING)) > ZERO
                   MOVE WS-FIELD(WS-EMP-IX) TO WS-CHK-SRC
                   PERFORM CHK-STRICT-INT
                   IF NUM-IS-BAD
                       MOVE "EMPLOYEE_ID must be 6-digit integer"
                           TO WS-TEMP-MSG
                       PERFORM ADD-ERR-ONE
                   ELSE
                       MOVE FUNCTION TRIM(WS-FIELD(WS-EMP-IX) TRAILING)
                           TO WS-CHK-SRC
                       IF FUNCTION LENGTH(
                               FUNCTION TRIM(WS-CHK-SRC TRAILING))
                               NOT = 6
                           STRING "EMPLOYEE_ID must be exactly 6 digits: got "
                               FUNCTION TRIM(WS-CHK-SRC TRAILING)
                               INTO WS-TEMP-MSG
                           END-STRING
                           PERFORM ADD-ERR-ONE
                       END-IF
                   END-IF
               END-IF
           END-IF

           *> --- TRANSACTION_CODE: must be CR, DR, or TF ---
           IF WS-TXN-IX > ZERO
               IF FUNCTION LENGTH(FUNCTION TRIM(
                       WS-FIELD(WS-TXN-IX) TRAILING)) = ZERO
                   MOVE "TRANSACTION_CODE is required" TO WS-TEMP-MSG
                   PERFORM ADD-ERR-ONE
               ELSE
                   MOVE FUNCTION TRIM(WS-FIELD(WS-TXN-IX) TRAILING)
                       TO WS-BLOOD-UC
                   INSPECT WS-BLOOD-UC CONVERTING
                       "abcdefghijklmnopqrstuvwxyz"
                       TO "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                   IF WS-BLOOD-UC NOT = "CR" AND WS-BLOOD-UC NOT = "DR"
                           AND WS-BLOOD-UC NOT = "TF"
                       STRING "TRANSACTION_CODE must be CR/DR/TF: got "
                           FUNCTION TRIM(WS-FIELD(WS-TXN-IX) TRAILING)
                           INTO WS-TEMP-MSG
                       END-STRING
                       PERFORM ADD-ERR-ONE
                   END-IF
               END-IF
           END-IF.

       VAL-HLTH.
           IF WS-AGE-IX = ZERO OR WS-BLOOD-IX = ZERO
                   OR WS-NAME-IX = ZERO
               MOVE "Required healthcare columns missing from header"
                   TO WS-TEMP-MSG
               PERFORM ADD-ERR-ONE
               EXIT PARAGRAPH
           END-IF
           IF FUNCTION LENGTH(FUNCTION TRIM(WS-FIELD(WS-NAME-IX)
               TRAILING)) = ZERO
               MOVE "NAME (patient name) is required" TO WS-TEMP-MSG
               PERFORM ADD-ERR-ONE
           ELSE
               MOVE WS-FIELD(WS-NAME-IX) TO WS-CHK-SRC
               PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 50
                   IF WS-CHK-SRC(WS-I:1) >= '0'
                       AND WS-CHK-SRC(WS-I:1) <= '9'
                       MOVE "NAME should not contain numbers"
                           TO WS-TEMP-MSG
                       PERFORM ADD-ERR-ONE
                       EXIT PERFORM
                   END-IF
               END-PERFORM
           END-IF.
           MOVE WS-FIELD(WS-AGE-IX) TO WS-CHK-SRC
           PERFORM CHK-INT
           IF NUM-IS-BAD
               STRING "AGE out of range (0-120): got "
                   FUNCTION TRIM(WS-CHK-SRC TRAILING)
                   INTO WS-TEMP-MSG
               END-STRING
               PERFORM ADD-ERR-ONE
           ELSE
               IF WS-INTVAL < ZERO OR WS-INTVAL > 120
                   STRING "AGE out of range (0-120): got "
                       FUNCTION TRIM(WS-CHK-SRC TRAILING)
                       INTO WS-TEMP-MSG
                   END-STRING
                   PERFORM ADD-ERR-ONE
               END-IF
           END-IF
           MOVE FUNCTION TRIM(WS-FIELD(WS-BLOOD-IX) TRAILING)
               TO WS-BLOOD-UC
           INSPECT WS-BLOOD-UC CONVERTING "abcdefghijklmnopqrstuvwxyz"
               TO "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
           IF WS-BLOOD-UC NOT = "A+"  AND WS-BLOOD-UC NOT = "A-"
                   AND WS-BLOOD-UC NOT = "B+"  AND WS-BLOOD-UC NOT = "B-"
                   AND WS-BLOOD-UC NOT = "O+"  AND WS-BLOOD-UC NOT = "O-"
                   AND WS-BLOOD-UC NOT = "AB+" AND WS-BLOOD-UC NOT = "AB-"
               STRING "Invalid BLOOD_GROUP: got "
                   FUNCTION TRIM(WS-FIELD(WS-BLOOD-IX) TRAILING)
                   INTO WS-TEMP-MSG
               END-STRING
               PERFORM ADD-ERR-ONE
           END-IF.
           *> --- DIAGNOSIS validation ---
           IF WS-DIAG-IX = ZERO
               MOVE "DIAGNOSIS column missing from header"
                   TO WS-TEMP-MSG
               PERFORM ADD-ERR-ONE
           ELSE
               IF FUNCTION LENGTH(FUNCTION TRIM(
                       WS-FIELD(WS-DIAG-IX) TRAILING)) < 3
                   STRING "DIAGNOSIS too short: got "
                       FUNCTION TRIM(WS-FIELD(WS-DIAG-IX) TRAILING)
                       INTO WS-TEMP-MSG
                   END-STRING
                   PERFORM ADD-ERR-ONE
               END-IF
           END-IF.

       VAL-ECOM.
           IF WS-PRICE-IX = ZERO OR WS-STOCK-IX = ZERO
                   OR WS-PROD-IX = ZERO
               MOVE "Required e-commerce columns missing from header"
                   TO WS-TEMP-MSG
               PERFORM ADD-ERR-ONE
               EXIT PARAGRAPH
           END-IF
           IF FUNCTION LENGTH(FUNCTION TRIM(WS-FIELD(WS-PROD-IX)
               TRAILING)) = ZERO
               MOVE "PRODUCT name is required" TO WS-TEMP-MSG
               PERFORM ADD-ERR-ONE
           END-IF
           *> --- PRODUCT length validation ---
           IF FUNCTION LENGTH(FUNCTION TRIM(
                   WS-FIELD(WS-PROD-IX) TRAILING)) < 3
               MOVE "PRODUCT name too short" TO WS-TEMP-MSG
               PERFORM ADD-ERR-ONE
           END-IF.
           MOVE WS-FIELD(WS-PRICE-IX) TO WS-CHK-SRC
           PERFORM CHK-FLOAT
           IF NUM-IS-BAD
               STRING "PRICE must be > 0: got "
                   FUNCTION TRIM(WS-CHK-SRC TRAILING)
                   INTO WS-TEMP-MSG
               END-STRING
               PERFORM ADD-ERR-ONE
           ELSE
               IF WS-NUMVAL <= ZERO
                   STRING "PRICE must be > 0: got "
                       FUNCTION TRIM(WS-CHK-SRC TRAILING)
                       INTO WS-TEMP-MSG
                   END-STRING
                   PERFORM ADD-ERR-ONE
               END-IF
               *> --- PRICE upper bound ---
              IF WS-NUMVAL > 1000000
                  MOVE "PRICE too large (>1000000)" TO WS-TEMP-MSG
                  PERFORM ADD-ERR-ONE
              END-IF
           END-IF
           MOVE WS-FIELD(WS-STOCK-IX) TO WS-CHK-SRC
           PERFORM CHK-INT
           IF NUM-IS-BAD
               STRING "STOCK must be >= 0: got "
                   FUNCTION TRIM(WS-CHK-SRC TRAILING)
                   INTO WS-TEMP-MSG
               END-STRING
               PERFORM ADD-ERR-ONE
           ELSE
               IF WS-INTVAL < ZERO
                   STRING "STOCK must be >= 0: got "
                       FUNCTION TRIM(WS-CHK-SRC TRAILING)
                       INTO WS-TEMP-MSG
                   END-STRING
                   PERFORM ADD-ERR-ONE
               END-IF
               *> --- STOCK upper limit ---
              IF WS-INTVAL > 10000
                  MOVE "STOCK too large (>10000)" TO WS-TEMP-MSG
                  PERFORM ADD-ERR-ONE
              END-IF
              *> --- PRODUCT_CODE hex validation ---
              IF WS-PCODE-IX > ZERO
                  MOVE WS-FIELD(WS-PCODE-IX) TO WS-CHK-SRC
                  PERFORM CHK-HEX
                  IF NUM-IS-BAD
                      MOVE "PRODUCT_CODE must be hexadecimal"
                          TO WS-TEMP-MSG
                      PERFORM ADD-ERR-ONE
                  END-IF
              END-IF
           END-IF.

       
       CHK-HEX.
      *> Valid : X'<4-16 hex digits><F|C|D>'
      *> Inner digits (excluding sign nibble) must be even count
      *> e.g.  X'00012345F'  (8 digits + F = ok, even)
      *> e.g.  X'1A2BF'      (4 digits + F = ok, even)
      *> Invalid: X'1F' (too short), X'123F' odd before nibble NOT checked
           MOVE 'N' TO WS-NUM-OK
           MOVE FUNCTION TRIM(WS-CHK-SRC TRAILING) TO WS-CHK-SRC
           IF WS-CHK-SRC = SPACES
               EXIT PARAGRAPH
           END-IF

           *> Must start with X'
           IF WS-CHK-SRC(1:2) NOT = "X'"
               EXIT PARAGRAPH
           END-IF

           *> Must end with '
           MOVE FUNCTION LENGTH(FUNCTION TRIM(WS-CHK-SRC TRAILING))
               TO WS-EC
           IF WS-CHK-SRC(WS-EC:1) NOT = "'"
               EXIT PARAGRAPH
           END-IF

           *> Inner length = total - 3  (X' + ')
           COMPUTE WS-I = WS-EC - 3
           IF WS-I < 2
               EXIT PARAGRAPH
           END-IF

           *> Inner must be 2-17 chars (1-16 hex digits + 1 sign nibble)
           IF WS-I < 2 OR WS-I > 17
               EXIT PARAGRAPH
           END-IF

           *> Last inner char = sign nibble: must be F, C, or D
           MOVE WS-CHK-SRC(WS-EC - 1:1) TO WS-BLOOD-UC
           INSPECT WS-BLOOD-UC CONVERTING "fcd" TO "FCD"
           IF WS-BLOOD-UC NOT = 'F' AND WS-BLOOD-UC NOT = 'C'
                   AND WS-BLOOD-UC NOT = 'D'
               EXIT PARAGRAPH
           END-IF

           *> Digit count before sign nibble must be >= 1
           COMPUTE WS-J = WS-I - 1
           IF WS-J < 1
               EXIT PARAGRAPH
           END-IF

           *> Digit count before sign nibble must be ODD
           *> (packed decimal: each byte = 2 nibbles, last byte = digit+sign)
           *> So total nibbles = even, meaning digits before sign = odd
           IF FUNCTION MOD(WS-J, 2) = 0
               EXIT PARAGRAPH
           END-IF

           *> All inner chars (positions 3 to EC-1) must be 0-9 or A-F
           PERFORM VARYING WS-J FROM 3 BY 1 UNTIL WS-J > WS-EC - 1
               MOVE WS-CHK-SRC(WS-J:1) TO WS-BLOOD-UC
               INSPECT WS-BLOOD-UC CONVERTING "abcdef" TO "ABCDEF"
               IF (WS-BLOOD-UC < '0' OR WS-BLOOD-UC > '9')
                       AND (WS-BLOOD-UC < 'A' OR WS-BLOOD-UC > 'F')
                   EXIT PARAGRAPH
               END-IF
           END-PERFORM
           MOVE 'Y' TO WS-NUM-OK.

       CHK-INT.
           MOVE 'N' TO WS-NUM-OK
           MOVE FUNCTION TRIM(WS-CHK-SRC TRAILING) TO WS-CHK-SRC
           IF WS-CHK-SRC = SPACES
               EXIT PARAGRAPH
           END-IF
           COMPUTE WS-INTVAL = FUNCTION NUMVAL(WS-CHK-SRC)
           MOVE 'Y' TO WS-NUM-OK.

       CHK-FLOAT.
           MOVE 'N' TO WS-NUM-OK
           MOVE FUNCTION TRIM(WS-CHK-SRC TRAILING) TO WS-CHK-SRC
           IF WS-CHK-SRC = SPACES
               EXIT PARAGRAPH
           END-IF
           COMPUTE WS-NUMVAL = FUNCTION NUMVAL(WS-CHK-SRC)
           MOVE 'Y' TO WS-NUM-OK.

       CHK-STRICT-INT.
           MOVE 'N' TO WS-NUM-OK
           MOVE FUNCTION TRIM(WS-CHK-SRC TRAILING) TO WS-CHK-SRC
           IF WS-CHK-SRC = SPACES
               EXIT PARAGRAPH
           END-IF
           PERFORM VARYING WS-J FROM 1 BY 1 UNTIL WS-J > 80
               IF WS-CHK-SRC(WS-J:1) = '.'
                   EXIT PARAGRAPH
               END-IF
               IF WS-CHK-SRC(WS-J:1) = SPACE
                   EXIT PERFORM
               END-IF
           END-PERFORM
           COMPUTE WS-INTVAL = FUNCTION NUMVAL(WS-CHK-SRC)
           MOVE 'Y' TO WS-NUM-OK.

       *> Convert WS-ROW-NUM → WS-ROW-STR with no leading zeros/spaces
       MAKE-ROW-STR.
           MOVE WS-ROW-NUM  TO WS-EDIT-7
           MOVE FUNCTION TRIM(WS-EDIT-7 LEADING) TO WS-ROW-STR.

       PUSH-VALID.
           IF WS-VRC >= WS-MAX-ROWS
               EXIT PARAGRAPH
           END-IF
           ADD 1 TO WS-VRC
           PERFORM MAKE-ROW-STR
           PERFORM BUILD-DATA-JSON
           MOVE SPACES TO WS-VR-L(WS-VRC)
           STRING '{"row":' DELIMITED SIZE
               FUNCTION TRIM(WS-ROW-STR TRAILING) DELIMITED BY SIZE
               ',"data":' DELIMITED SIZE
               FUNCTION TRIM(WS-DATA-JSON TRAILING) DELIMITED BY SIZE
               '}' DELIMITED SIZE
               INTO WS-VR-L(WS-VRC)
           END-STRING.

       PUSH-ERR.
           IF WS-ERC >= WS-MAX-ROWS
               EXIT PARAGRAPH
           END-IF
           ADD 1 TO WS-ERC
           PERFORM MAKE-ROW-STR
           PERFORM BUILD-DATA-JSON
           MOVE SPACES TO WS-ER-L(WS-ERC)
           STRING '{"row":' DELIMITED SIZE
               FUNCTION TRIM(WS-ROW-STR TRAILING) DELIMITED BY SIZE
               ',"data":' DELIMITED SIZE
               FUNCTION TRIM(WS-DATA-JSON TRAILING) DELIMITED BY SIZE
               ',"errors":[' DELIMITED SIZE
               INTO WS-ER-L(WS-ERC)
           END-STRING
           MOVE 'Y' TO WS-FIRST-FLAG
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > WS-ERR-CNT
               IF WS-ERR-R(WS-I) NOT = SPACES
                   IF WS-FIRST-FLAG = 'N'
                       STRING FUNCTION TRIM(WS-ER-L(WS-ERC) TRAILING)
                           "," DELIMITED SIZE
                           INTO WS-ER-L(WS-ERC)
                       END-STRING
                   END-IF
                   MOVE 'N' TO WS-FIRST-FLAG
                   MOVE FUNCTION TRIM(WS-ERR-R(WS-I) TRAILING)
                       TO WS-ESC-IN
                   PERFORM JSON-ESC
                   STRING FUNCTION TRIM(WS-ER-L(WS-ERC) TRAILING)
                       '"' DELIMITED SIZE
                       FUNCTION TRIM(WS-ESC-OUT TRAILING) DELIMITED BY SIZE
                       '"' DELIMITED SIZE
                       INTO WS-ER-L(WS-ERC)
                   END-STRING
               END-IF
           END-PERFORM
           STRING FUNCTION TRIM(WS-ER-L(WS-ERC) TRAILING)
               "]}" DELIMITED SIZE
               INTO WS-ER-L(WS-ERC)
           END-STRING.

       BUILD-DATA-JSON.
           MOVE SPACES TO WS-DATA-JSON
           MOVE "{" TO WS-DATA-JSON
           MOVE 'Y' TO WS-FIRST-FLAG
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > WS-H-COUNT
               IF FUNCTION LENGTH(FUNCTION TRIM(WS-HDR-NORM(WS-I)
                   TRAILING)) > ZERO
                   IF WS-FIRST-FLAG = 'N'
                       STRING FUNCTION TRIM(WS-DATA-JSON TRAILING) ","
                           DELIMITED SIZE
                           INTO WS-DATA-JSON
                       END-STRING
                   END-IF
                   MOVE 'N' TO WS-FIRST-FLAG
                   MOVE FUNCTION TRIM(WS-FIELD(WS-I) TRAILING)
                       TO WS-ESC-IN
                   PERFORM JSON-ESC
                   STRING FUNCTION TRIM(WS-DATA-JSON TRAILING) '"'
                       FUNCTION TRIM(WS-HDR-NORM(WS-I) TRAILING)
                       DELIMITED BY SIZE '":"'
                       FUNCTION TRIM(WS-ESC-OUT TRAILING) DELIMITED BY SIZE
                       '"' DELIMITED SIZE
                       INTO WS-DATA-JSON
                   END-STRING
               END-IF
           END-PERFORM
           STRING FUNCTION TRIM(WS-DATA-JSON TRAILING) "}"
               DELIMITED SIZE
               INTO WS-DATA-JSON
           END-STRING.

       JSON-ESC.
           MOVE SPACES TO WS-ESC-OUT
           MOVE 1 TO WS-EOUT-P
           PERFORM VARYING WS-EC FROM 1 BY 1 UNTIL WS-EC > 500
               IF WS-ESC-IN(WS-EC:1) = SPACE AND
                       WS-ESC-IN(WS-EC:500) = SPACES
                   EXIT PERFORM
               END-IF
               EVALUATE WS-ESC-IN(WS-EC:1)
                   WHEN '"'
                       STRING FUNCTION CHAR(92) FUNCTION CHAR(34)
                           INTO WS-ESC-OUT WITH POINTER WS-EOUT-P
                   WHEN '\'
                       STRING FUNCTION CHAR(92) FUNCTION CHAR(92)
                           INTO WS-ESC-OUT WITH POINTER WS-EOUT-P
                   WHEN X'0A'
                       STRING FUNCTION CHAR(92) "n"
                           INTO WS-ESC-OUT WITH POINTER WS-EOUT-P
                   WHEN X'0D'
                       STRING FUNCTION CHAR(92) "r"
                           INTO WS-ESC-OUT WITH POINTER WS-EOUT-P
                   WHEN X'09'
                       STRING FUNCTION CHAR(92) "t"
                           INTO WS-ESC-OUT WITH POINTER WS-EOUT-P
                   WHEN OTHER
                       IF FUNCTION ORD(WS-ESC-IN(WS-EC:1)) < 32
                           CONTINUE
                       ELSE
                           STRING WS-ESC-IN(WS-EC:1)
                               INTO WS-ESC-OUT WITH POINTER WS-EOUT-P
                       END-IF
               END-EVALUATE
           END-PERFORM.

       WRITE-JSON.
           OPEN OUTPUT REPORT-FILE
           MOVE SPACES TO REPORT-LINE

           STRING J-H1 DELIMITED BY SIZE
               FUNCTION TRIM(WS-RUN-ID)
               J-H2 DELIMITED BY SIZE
               FUNCTION TRIM(WS-DOMAIN)
               J-H3 DELIMITED BY SIZE
               FUNCTION TRIM(WS-BASE-NAME)
               J-H4 DELIMITED BY SIZE
               FUNCTION TRIM(WS-TIMESTAMP)
               J-H5 DELIMITED BY SIZE
               FUNCTION TRIM(WS-TOTAL-STR)
               J-H6 DELIMITED BY SIZE
               FUNCTION TRIM(WS-VALID-STR)
               J-H7 DELIMITED BY SIZE
               FUNCTION TRIM(WS-INVALID-STR)
               J-H8 DELIMITED BY SIZE
               FUNCTION TRIM(WS-SCORE-STR)
               J-H9 DELIMITED BY SIZE
               INTO REPORT-LINE
           END-STRING

           WRITE REPORT-LINE

           *> ---------- VALID RECORDS ----------
           MOVE 'Y' TO WS-FIRST-FLAG
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > WS-VRC
               IF WS-FIRST-FLAG = 'N'
                   MOVE "," TO REPORT-LINE
                   WRITE REPORT-LINE
               END-IF
               MOVE 'N' TO WS-FIRST-FLAG
               WRITE REPORT-LINE FROM WS-VR-L(WS-I)
           END-PERFORM

           *> ---------- ERROR RECORDS ----------
           MOVE SPACES TO REPORT-LINE
           STRING J-HA DELIMITED BY SIZE
               INTO REPORT-LINE
           END-STRING
           WRITE REPORT-LINE

           MOVE 'Y' TO WS-FIRST-FLAG
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > WS-ERC
               IF WS-FIRST-FLAG = 'N'
                   MOVE "," TO REPORT-LINE
                   WRITE REPORT-LINE
               END-IF
               MOVE 'N' TO WS-FIRST-FLAG
               WRITE REPORT-LINE FROM WS-ER-L(WS-I)
           END-PERFORM

           *> ---------- CLOSE JSON ----------
           MOVE "]}" TO REPORT-LINE
           WRITE REPORT-LINE

           CLOSE REPORT-FILE.
           