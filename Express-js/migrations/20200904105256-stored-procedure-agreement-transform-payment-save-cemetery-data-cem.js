'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Agreement_TransformPaymentSaveCemetery_Data_Cem') IS NOT NULL
    --DROP PROCEDURE Agreement_TransformPaymentSaveCemetery_Data_Cem


    CREATE PROCEDURE Agreement_TransformPaymentSaveCemetery_Data_Cem
    AS
    BEGIN
      DECLARE @User_Id INT = (SELECT id FROM [User] WHERE EMAIL = 'a@gmail.com')
        SELECT
        P.paymentDetail as referenceNumber,
      P.receiptNo as ReceiptNumber,
      A.AgreementID,
      A.AgreementID AS resourceId,
      CONVERT(INT,NULL) AS PayorId,
      P.amount as amount,
      CASE WHEN P.paymentType in (6,12,13) THEN 1 
        WHEN P.paymentType in (2,8,9,10) THEN 4
        WHEN P.paymentType in (4,7) THEN NULL -- Putting NULL for adjustment types, not sure need to confirm
        ELSE 2 
        END AS PaymentType,
      A.createdBy AS createdBy, --P.lastupdateUser (check the mapping document) is a name of varachar but this is int, using A.createdby for now 
      P.lastUpdateDate AS createdAt,
      P.lastUpdateDate AS updatedAt,
      CONVERT(VARCHAR,NULL) AS OtherInfo, -- Need to confirm with tejo 
      CONVERT(INT,NULL) AS Sales_ID,
      CONVERT(INT,NULL) AS CashReceiptReferenceNbr,
      CONVERT(INT,NULL) AS CashReceiptNbr,
      CONVERT(INT,NULL) AS SalesDownPymtReceiptNbr,
      CONVERT(INT,NULL) AS SalesCashReceiptID,
      CONVERT(INT,NULL) AS SalesDownPymtSalesCashApplicationID,
      CONVERT(INT,NULL) AS SalesDownPymtSalesDownPymtID,
      CONVERT(INT,NULL) AS SalesCashApplicationID,
      CONVERT(INT,NULL) AS CashReceiptAmt,
      CONVERT(INT,NULL) as HmispaymentId,
      CONVERT(INT,NULL) AS organizationId,
      0 AS IsFinanceOption,
      P.id AS cemeteryPaymentId,
      A.TxnID as cemeteryTxnId,
      CPL.id AS CemeteryPaymentLogId,
      A.arrangementId as arrangementId,
      CPL.PaymentId,
      CONVERT(INT,NULL) AS FuneralCaseId,
      CONVERT(INT,NULL) AS FuneralPaymentId,
      CONVERT(INT,NULL) AS FuneralPaymentLogId,
      'success' as PaymentStatus
        INTO #AgreementPayment
      FROM  #Agreement A
      INNER JOIN cemportal.dbo.Payment P 
        ON A.TxnID = P.txn
      LEFT JOIN CemeteryPaymentLog CPL
        ON P.id = CPL.cemeteryPaymentId

      -- SELECT 'SELECTING PAYMENTS' AS MSG
      -- SELECT payorId from #AgreementPayment

      DECLARE @PAYOR_NAME VARCHAR(100)

      SELECT @PAYOR_NAME = P.payer FROM #AgreementPayment AP 
      INNER JOIN cemportal.dbo.Payment P 
        ON AP.cemeteryTxnId = P.txn 

      SELECT value INTO #PayorTemp from STRING_SPLIT(@PAYOR_NAME,' ')
      ALTER TABLE #PayorTemp  ADD ID INT identity (1,1)
      
      DECLARE @Payer_fname varchar(1000)
      DECLARE @Payer_lname varchar(1000)

      select  @Payer_fname = [value] from #PayorTemp where id = (SELECT MIN(id) FROM #PayorTemp)
      select  @Payer_lname = [value] from #PayorTemp where id = (SELECT MAX(id) FROM #PayorTemp)

      -- Update PayorID with already added Agreement personId 
      IF (@PAYOR_NAME IS NOT NULL)
      BEGIN
        DECLARE @Inserted_agreement_person_id_1 INT = NULL
        SELECT TOP 1 APR.agreementId,APR.personId,APR.roleId,AR.name AS AGREEMENTROLENAME,APR.createdAt,APR.updatedAt,APR.createdBy,APR.updatedBy INTO #AGREEMENTPAYOR
        FROM #AgreementPayment AP 
        INNER JOIN cemportal.dbo.Payment P 
          ON AP.cemeteryTxnId = P.txn 
        INNER JOIN AgreementPerson APR
          ON AP.agreementid = APR.agreementid
        INNER JOIN AgreementRole AR
          ON APR.roleId = AR.id
        INNER JOIN Person PR
          ON APR.personId = PR.Id
        WHERE PR.firstName =  @Payer_fname and 
          PR.lastName = @Payer_lname AND AR.NAME IN ('Purchaser', 'Co-purchaser')
        ORDER BY APR.id

        IF(SELECT AGREEMENTROLENAME FROM #AGREEMENTPAYOR) <> 'Payor'
        BEGIN
          -- Insert purchaser or co-purchaser as payor 
          INSERT INTO AGREEMENTPERSON(agreementId,personId,roleId,relationId,isOwner,createdAt,updatedAt,createdBy,updatedBy)
          SELECT agreementId,personId,(SELECT id FROM AGREEMENTROLE WHERE name = 'Payor'),NULL,0,createdAt,updatedAt,createdBy,updatedBy FROM #AGREEMENTPAYOR
          SET @Inserted_agreement_person_id_1 = @@IDENTITY
        END

        UPDATE AP 
        SET payorId = @Inserted_agreement_person_id_1
        FROM #AgreementPayment AP
      END
      -- ELSE 
      -- BEGIN
      -- 	-- Set payorid in oneportal as null if the payer is null in cemportal payment
      -- 	UPDATE AP 
      -- 	SET payorId = NULL
      -- 	FROM #AgreementPayment AP
      -- END
      -- SELECT 'AFTER ASSIGNING PAYORID' AS MSG
      -- SELECT payorId from #AgreementPayment
      IF (SELECT COUNT(1) from #AgreementPayment WHERE payorId IS NULL) > 0  AND (@PAYOR_NAME is not NULL)
      BEGIN 
      
        DECLARE @Inserted_person_id INT
        DECLARE @Inserted_agreement_person_id INT
        DECLARE @Object AS INT
        DECLARE @ResponseText_Opi AS VARCHAR(8000)
        DECLARE @OnePortalID NVARCHAR(255)
        DECLARE @currentDate DATETIME = GETDATE()
        EXEC sp_OACreate 'MSXML2.XMLHTTP',
        @Object OUT;

        /**** CALL API TO GENERATE UNIQUE INDENTIFIER ****/
        EXEC sp_OAMethod @Object,
          'open',
          NULL,
          'get',
          'http://dev-app01:9001/api/temp/opi', --Web Service Url
          'false'

        EXEC sp_OAMethod @Object,
          'send'

        EXEC sp_OAMethod @Object,
          'responseText',
          @ResponseText_Opi OUTPUT
        
        SET @OnePortalID = @ResponseText_Opi

        INSERT INTO [dbo].[Person] (
            [createdAt],
            [updatedAt],
            [createdBy],
            [updatedBy],
            [suffix],
            [title],
            [firstName],
            [middleName],
            [lastName],
            [phoneNumber],
            [secondaryPhoneNumber],
            [email],
            [gender],
            [languageId],
            [isVerified],
            [isAlive],
            [dateOfBirth],
            [addressPlaceId]
            )
          VALUES (
            @currentDate,
            @currentDate,
            @User_Id,
            @User_Id,
            NULL,
            NULL,
            @Payer_fname,
            NULL,
            @Payer_lname,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            1,
            NULL,
            NULL,
            NULL
          )

        SET @Inserted_person_id = @@IDENTITY

        INSERT INTO PERSONVERIFICATIONDETAILS(
          verifiedAt,
          verifiedBy,
          personId,
          onePortalId,
          lastTouchedAt,
          createdAt,
          updatedAt
        ) VALUES(@currentDate,@User_Id,@Inserted_person_id,@OnePortalID,@currentDate,@currentDate,@currentDate)

        INSERT INTO [dbo].[AgreementPerson](
          agreementId,
          personId,
          roleId,
          createdBy,
          updatedBy,
          createdAt,
          updatedAt,
          isOwner
        )
        select agreementId,@Inserted_person_id,(SELECT id FROM AGREEMENTROLE WHERE name = 'Payor'),NULL,NULL,@currentDate,@currentDate,0 from #AgreementPayment
        
        SET @Inserted_agreement_person_id = @@IDENTITY

        UPDATE AP 
        SET payorId = @Inserted_agreement_person_id
        FROM #AgreementPayment AP 

        INSERT INTO PurchaserPayorPersonCemPortalLog(
          PersonId,
          CallId,
          AgreementId,
          OldArrangmentId,
          OldPersonRelationId,
          OldTxnId,
          StartDateTime,
          StopDateTime
        ) SELECT @Inserted_person_id,CCPL.CallId,AP.agreementID,AP.arrangementId,PR.id,AP.cemeteryTxnId,GETDATE(),GETDATE() FROM #AgreementPayment AP
        INNER JOIN CallCemportalLog CCPL
          ON CCPL.OldArrangementId = AP.arrangementId 
        LEFT JOIN cemportal.dbo.PersonRelation PR 
          ON AP.arrangementID = PR.arrangement
        LEFT JOIN cemportal.dbo.Person P 
          ON PR.person = P.id
        WHERE P.fName = @Payer_fname and P.lName = @Payer_lname

      END 

      -- SELECT 'BEFORE INSERTING DATA' AS MSG
      -- SELECT * FROM #AgreementPayment
      -- SELECT @Inserted_agreement_person_id
      
      EXEC Insert_AgreementPaymentItem_Data

      -- select * from #AgreementPayment

      DROP TABLE #PayorTemp 

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
