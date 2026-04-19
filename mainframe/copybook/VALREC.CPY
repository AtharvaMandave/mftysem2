      *================================================================
      * COPYBOOK: VALREC
      * PURPOSE:  Common record layouts for validation program
      *================================================================

       01 BANKING-RECORD.
           05 BANK-CUST-NAME    PIC X(30).
           05 BANK-AGE          PIC 9(3).
           05 BANK-INCOME       PIC 9(10)V99.
           05 BANK-CREDIT-SCORE PIC 9(3).
           05 BANK-ACCOUNT-TYPE PIC X(10).
           05 FILLER            PIC X(142).

       01 HEALTHCARE-RECORD.
           05 HLTH-PATIENT-NAME PIC X(30).
           05 HLTH-AGE          PIC 9(3).
           05 HLTH-BLOOD-GROUP  PIC X(5).
           05 HLTH-DIAGNOSIS    PIC X(50).
           05 FILLER            PIC X(112).

       01 ECOMMERCE-RECORD.
           05 ECOM-PRODUCT-NAME PIC X(30).
           05 ECOM-PRICE        PIC 9(8)V99.
           05 ECOM-STOCK-QTY    PIC 9(6).
           05 ECOM-CATEGORY     PIC X(20).
           05 FILLER            PIC X(134).
