//RUNVAL   JOB (ACCT),'DATA VALIDATE',
//             CLASS=A,MSGCLASS=X,
//             MSGLEVEL=(1,1),
//             NOTIFY=&SYSUID
//*================================================================
//* JCL: RUNVAL
//* PURPOSE: Execute COBOL validation program VALIDATE
//*          for multi-domain data validation.
//*          Domain is passed as PARM parameter.
//*================================================================
//*
//STEP01   EXEC PGM=VALIDATE,
//             PARM='BANKING'
//*------ Change PARM to 'HEALTH' or 'ECOM' as needed ------
//*
//STEPLIB  DD DSN=USER.LOADLIB,DISP=SHR
//*
//* INPUT DATASET - Uploaded data file
//INFILE   DD DSN=USER.INPUT.DATA,
//            DISP=SHR,
//            DCB=(RECFM=FB,LRECL=200,BLKSIZE=0)
//*
//* OUTPUT - Valid records
//VALFILE  DD DSN=USER.VALID.DATA,
//            DISP=(NEW,CATLG,DELETE),
//            SPACE=(CYL,(5,5),RLSE),
//            DCB=(RECFM=FB,LRECL=200,BLKSIZE=0)
//*
//* OUTPUT - Error records
//ERRFILE  DD DSN=USER.ERROR.DATA,
//            DISP=(NEW,CATLG,DELETE),
//            SPACE=(CYL,(5,5),RLSE),
//            DCB=(RECFM=FB,LRECL=300,BLKSIZE=0)
//*
//SYSOUT   DD SYSOUT=*
//SYSUDUMP DD SYSOUT=*
//*
