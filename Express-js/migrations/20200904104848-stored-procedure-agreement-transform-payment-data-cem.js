'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Agreement_TransformPayment_Data_Cem') IS NOT NULL
    --DROP PROCEDURE Agreement_TransformPayment_Data_Cem


    CREATE PROCEDURE Agreement_TransformPayment_Data_Cem
    AS
    BEGIN
      DECLARE @payorId INT = NULL
      SELECT CR.Reference_Nbr AS ReferenceNumber, -- HMIS: Cash_Receipt.Reference_Nbr
        CASE
          WHEN ISNULL(SDP.Receipt_Nbr, '') <> ''
            THEN ISNULL(SDP.Receipt_Nbr, '')
          WHEN ISNULL(CR.Cash_Receipt_NBR, '') <> ''
            THEN CR.Cash_Receipt_NBR
          ELSE ''
          END AS ReceiptNumber, --HMIS: Sales_Down_Pymt.Receipt_Nbr or Cash_Receipt.Cash_Receipt_NBR
        A.AgreementID,
        A.AgreementID AS resourceId, -- resourceId Developer info: Map AgreementId to this column"
        --subquery to use person with one of its roles:purchaser(4) or payor(5) (order doesnt matter)
        --Map Payor or Purchaser here from AgreementPerson table
        CONVERT(INT,NULL) AS PayorId,
        CR.Amt AS Amount, --HMIS: Cash_Receipt.Amt
        -- other info  jsonobject converst to json  - the type and description - Ex: {'paymentType':'AFCTS','paymentDescr':'AFCTS'}"
        (SELECT pt.Payment_Type_Cd AS 'paymentType',
          pt.Descr AS 'paymentDescr' FOR JSON PATH) AS 'otherInfo',
        --TODO 20200624 find Oneportal user from Sales_Finance.Update_User_id
        --select distinct Update_User_id from h_000..Sales_Finance
        --select top 100 * from OnePortalQAFixes..[User]
        --how to join it ?
        A.createdBy AS 'createdBy', --HMIS: Sales_Finance.Update_User_id  --funPortal: Payment.updateUser
        CASE WHEN SCA.Pmt_Applied_Dt IS NOT NULL THEN  convert(DATETIME, left(SCA.Pmt_Applied_Dt, 8)) ELSE convert(DATETIME, left(A.SalesFinanceLastUpdatedDate, 8)) END AS 'createdAt', --HMIS:  Sales_Finance.last_update_DT, funPortal: Payment.updateDatetime
        convert(DATETIME, left(A.SalesFinanceLastUpdatedDate, 8)) AS 'updatedAt', -- this is not nullable so it gets same as createdAt
        --paymentType mapping here 
        CASE CR.Payment_Type_Cd
          WHEN 'AFCTS'
            THEN 2
          WHEN 'AMEX'
            THEN 4
          WHEN 'APD'
            THEN 6
          WHEN 'CC'
            THEN 2
          WHEN 'CFT'
            THEN 2
          WHEN 'CHK'
            THEN 2
          WHEN 'CSH'
            THEN 1
          WHEN 'DISCOVER'
            THEN 4
          WHEN 'FORETHOUGH'
            THEN 2
          WHEN 'HOMESTEADE'
            THEN 2
          WHEN 'LBP'
            THEN 2
          WHEN 'MC'
            THEN 4
          WHEN 'MO'
            THEN 3
          WHEN 'NGL'
            THEN 2
          WHEN 'OTH_INS'
            THEN 2
          WHEN 'PAD'
            THEN 6
          WHEN 'SYS'
            THEN 2
          WHEN 'Visa'
            THEN 4
          END AS PaymentType,
        /*
        --https://docs.google.com/spreadsheets/d/1gR-SC54EZ1aOpAQMthZnzX5SnMfktdQnbT5aBsSz0mA/edit#gid=1611360813
        id	paymentType
        1	Cash
        2	Check
        3	Money order
        4	Card
        5	Anticipated payment
        6	Pre Authorized Deductions
        */
        --columns for log input
        
        -- A.AgreementID,
        A.Sales_ID AS Sales_ID,
        CR.Reference_Nbr AS CashReceiptReferenceNbr,
        CR.Cash_Receipt_NBR AS CashReceiptNbr,
        SDP.Receipt_Nbr AS SalesDownPymtReceiptNbr,
        SCA.Cash_Receipt_ID AS SalesCashReceiptID,
        SDP.Sales_Cash_Application_ID AS SalesDownPymtSalesCashApplicationID,
        NULL AS SalesDownPymtSalesDownPymtID,
        SCA.Sales_Cash_Application_ID AS SalesCashApplicationID,
        CR.Amt AS CashReceiptAmt,
        CPL.PaymentId AS HmisPaymentId, -- TODO: Duplicate column remove it
        CONVERT(INT,NULL) AS cemeteryPaymentId,
        CONVERT(INT,NULL) as cemeteryTxnId,
        CONVERT(INT,NULL) AS FuneralCaseId,
        CONVERT(INT,NULL) AS FuneralPaymentId,
        CONVERT(INT,NULL) AS FuneralPaymentLogId,
        CPL.PaymentId,
        CPL.id AS CemeteryPaymentLogId,
        CASE WHEN SCA.INTEREST_AMT > 0 THEN 1 ELSE 0 END AS IsFinanceOption,
        NULL AS organizationId, -- THIS IS NOT APPLICABLE IN CEMPORTAL JUST TO MAINTAIN THE COLUMNS THIS COLUMN IS INTIALIZED WITH DEFAULT VALUE
        'success' as PaymentStatus
        -- A.createdAT AS CreatedAt --to have the same datetime in PAYMENT_LOG
      INTO #AgreementPayment
      FROM  #Agreement A
      INNER JOIN h_000.DBO.Sales_Cash_Application SCA
        ON A.SALES_ID = SCA.Sales_ID
      INNER JOIN h_000.DBO.Cash_Receipt CR
        ON SCA.Cash_Receipt_ID = CR.Cash_Receipt_ID AND isnull(CR.Amt, 0) <> 0
      LEFT OUTER JOIN (SELECT DISTINCT Sales_Cash_Application_ID,Sales_ID,Receipt_Nbr FROM  h_000.DBO.Sales_Down_Pymt) SDP
        ON A.SALES_ID = SDP.Sales_ID 
          AND SCA.Sales_Cash_Application_ID = SDP.Sales_Cash_Application_ID
      INNER JOIN h_000.dbo.Payment_Type PT
        ON PT.Payment_Type_Cd = CR.Payment_Type_Cd
      LEFT JOIN CemeteryPaymentLog CPL
        ON SCA.Sales_Cash_Application_ID = CPL.HMISSalesCashApplicationID
      -- WHERE S.SALES_ID = 41895733 --45358501

      -- SELECT * FROM #AgreementPayment

      SET @payorId = (SELECT TOP 1  AP.ID
      FROM AgreementPerson AP
        INNER JOIN AgreementRole AR
          ON AP.RoleId = AR.ID
        INNER JOIN #AgreementPayment APY
          ON AP.agreementId = APY.AgreementID
      WHERE AR.NAME IN ('Payor')
      ORDER BY AP.ID)

      IF @payorId IS NULL
      BEGIN
        SET @payorId =	(SELECT TOP 1 PERSONID
            FROM (
              SELECT AP.PERSONID,
                CASE 
                  WHEN AR.Name = 'Purchaser'
                    THEN 1
                  WHEN AR.Name = 'Co-purchaser'
                    THEN 2
                  END AS RANKID
              FROM #AgreementPayment APY
              INNER JOIN AgreementPerson AP
                ON APY.AGREEMENTID = AP.agreementId
              INNER JOIN AgreementRole AR
                ON AP.RoleId = AR.ID
              WHERE AR.NAME IN ('Purchaser', 'Co-purchaser')
                AND AP.agreementId = APY.AgreementId
              ) ARR
            ORDER BY RANKID)
        DECLARE @USERID INT
        SELECT @USERID = id FROM [User] WHERE email = 'a@gmail.com'
        -- Insert purchaser or co-purchaser as payor 
        INSERT INTO AGREEMENTPERSON(agreementId,personId,roleId,relationId,isOwner,createdAt,updatedAt,createdBy,updatedBy)
        SELECT DISTINCT AGREEMENTID,@payorId,(SELECT id FROM AGREEMENTROLE WHERE name = 'Payor'),NULL,0,GETDATE(),GETDATE(),@USERID,@USERID FROM #AgreementPayment
        SET @payorId = @@IDENTITY
      END

      UPDATE APY
      SET APY.PayorId = @payorId
      FROM #AgreementPayment APY

      -- SELECT 'AFTER UPDATING PAYOR'
      -- SELECT * FROM #AgreementPayment

      -- Insert payment data into SP
      EXEC Insert_AgreementPaymentItem_Data

      DECLARE @agreement_Total_Paid DECIMAL(10,2) = 0.00
      SELECT @agreement_Total_Paid = SUM(Amount) FROM #AgreementPayment

      SET @agreement_Total_Paid = ISNULL(@agreement_Total_Paid, 0.00)

      UPDATE A 
      SET A.TotalPaid = @agreement_Total_Paid,
        A.due = A.totalCashPrice - A.totalPaid
      FROM #Agreement A

      DROP TABLE #AgreementPayment
    END`,)
    return true
  },

  down: (queryInterface, Sequelize) => {
    // TODO: DB: Add method to drop all the log tables.
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkDelete('People', null, {});
    */
  }
};
