'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF OBJECT_ID('Agreement_TransformSaveSyncedCemetery_PropertyOwners_Data') IS NOT NULL
    --DROP PROCEDURE Agreement_TransformSaveSyncedCemetery_PropertyOwners_Data


    CREATE PROCEDURE [dbo].[Agreement_TransformSaveSyncedCemetery_PropertyOwners_Data]
    AS
    BEGIN
      DECLARE @Object AS INT;
      DECLARE @ResponseText_Salt AS VARCHAR(8000);
      DECLARE @ResponseText_Opi AS VARCHAR(8000);
      DECLARE @ResponseText_Encrypted_SSN AS VARCHAR(8000);
      DECLARE @Body AS VARCHAR(8000)

      SELECT DISTINCT AI.AgreementId,
        AI.Lot_Sell_Unit_ID,
        /*AGREEMENT PROPERTY OWNER*/
        CPO.OnePortalAgreementPropertyOwnerId AS OnePortalAgreementPropertyOwnerId,
        AI.OnePortalAgreementPropertyItemId AS OnePortalAgreementPropertyId,
        N.Name_Id AS Name_ID,
        ISNULL(CPO.OnePortalPersonId, ISNULL(PR.PersonId, -1)) AS OnePortalPersonId,
        NULL AS OnePortalPersonID_NEW,
        NULL AS addedInAddendumId,
        NULL AS deletedInAddendumId,
        AI.UpdatedBy,
        AI.UpdatedAt,
        AI.CreatedBy,
        AI.CreatedAt,
        NULL AS DeletedBy,
        CAST(NULL AS DATETIMEOFFSET(7)) AS DeletedAt,
        /* PERSON */
        N.Primary_Suffix AS Suffix,
        N.Primary_Prefix AS Title,
        N.Primary_First_Name AS FirstName,
        N.Primary_Middle_Name AS MiddleName,
        N.Primary_Last_Name AS LastName,
        N.Phone_1 AS PhoneNumber,
        N.Phone_2 AS SecondaryPhoneNumber,
        N.E_Mail_Addr AS Email,
        CASE N.Gender
          WHEN 'M'
            THEN 1
          WHEN 'F'
            THEN 2
          WHEN 'U'
            THEN 3
          END AS Gender,
        L.Language_Cd AS Language_Cd,
        L.Descr AS LanguageDescr,
        One_L.ID AS LanguageId,
        1 AS IsVerified,
        CONVERT(DATETIME, N.Lot_Born_Dt) AS DateOfBirth,
        CASE N.Deceased
          WHEN 1
            THEN 0
          ELSE 1
          END AS IsAlive,
        /* ADDRESS */
        CPO.OnePortalAddressId AS OnePortalAddressId,
        CPO.OnePortalPlaceId AS OnePortalPlaceId,
        LTRIM(ISNULL(RTRIM(CONVERT(VARCHAR, N.Primary_Street_No)), '') + ' ' + LTRIM(ISNULL(N.Primary_Street_Name, '') + ' ' + ISNULL(N.Primary_Street_Address, ''))) AS Line1,
        ISNULL(LTRIM(RTRIM(CONVERT(VARCHAR, N.Primary_Street_No))), '') AS Primary_Street_No,
        LTRIM(RTRIM(ISNULL(N.Primary_Street_Name, ''))) AS Primary_Street_Name,
        LTRIM(RTRIM(ISNULL(N.Primary_Street_Address, ''))) AS Primary_Street_Address,
        ISNULL(N.Primary_State, '') AS STATE,
        ISNULL(N.Primary_City, '') AS City,
        ISNULL(N.Primary_Zip, '') AS ZipCode,
        ISNULL(N.Primary_Country, '') AS Country,
        ISNULL(N.County_cd, '') AS County_cd,
        ISNULL([county].Descr, '') AS County,
        OBJECT_NAME(@@PROCID) AS 'SP',
        /* PERSON VERIFICATION DETAILS */
        ISNULL(CPO.OnePortalPersonVerificationDetailsId, PR.OnePortalPersonVerificationDetailsId) AS OnePortalPersonVerificationDetailsId,
        AI.CreatedBy AS VerifiedBy,
        AI.CreatedAt AS VerifiedAt,
        ISNULL(CPO.OnePortalID, PR.OnePortalId) AS OnePortalID,
        CASE WHEN N.SS_Nbr <> 0
        THEN
        SUBSTRING(CAST(N.SS_Nbr AS VARCHAR), LEN(CAST(N.SS_Nbr AS VARCHAR)) - 4, 4)
        END AS SsnLastFour,
        ISNULL(CPO.SsnSalt, PR.SsnSalt) AS SsnSalt,
        ISNULL(CPO.SsnEncrypted, PR.SsnEncrypted) AS SsnEncrypted,
        NULL AS YearsAtResidentialAddress,
        AI.UpdatedAt AS LastTouchedAt,
        CAST(NULL AS NVARCHAR(255)) AS Ssn,
        N.SS_Nbr AS Ssn_ToEncrypt
      INTO #AgreementPerson
      FROM h_000.DBO.Lot_Sell_Unit LSU
      INNER JOIN (
        SELECT DISTINCT AI.OnePortalAgreementPropertyItemId,
          AI.Lot_Sell_Unit_ID,
          A.CreatedBy,
          A.CreatedAt,
          A.UpdatedBy,
          A.UpdatedAt,
          A.AgreementId
        FROM #AgreementItems AI
        JOIN #Agreement A
          ON A.Sales_ID = AI.Sales_ID
        ) AI
        ON AI.Lot_Sell_Unit_ID = LSU.Lot_Sell_Unit_ID
      INNER JOIN h_000.DBO.Purchase P
        ON LSU.Purchase_ID = P.Purchase_ID
      INNER JOIN h_000.DBO.Object_Name ON1
        ON P.Purchase_ID = ON1.Object_ID
          AND ON1.Object_Type_Cd = 'Purchase'
          AND ON1.Name_Type_Cd IN ('Owner', 'Co-Owner')
      INNER JOIN h_000.DBO.[Name] N
        ON ON1.Name_ID = N.Name_ID
        AND ISNULL(N.Primary_First_Name, '') <> ''
      /** CONFIRM CONDITION TO GET ONEPORTAL PERSON ID **/
      OUTER APPLY (
        SELECT TOP 1 PR.PersonId,
          PVD.Id AS OnePortalPersonVerificationDetailsId,
          PR.OldPersonId,
          PR.AgreementId,
          PVD.OnePortalId,
          PVD.SsnLastFour,
          PVD.SsnSalt,
          PVD.SsnEncrypted
        FROM [dbo].[PersonAgreementHMISLog] PR
        LEFT JOIN PersonVerificationDetails PVD
          ON PVD.PersonId = PR.PersonId
        WHERE PR.OldPersonId = N.Name_Id
          AND PR.AgreementId = AI.AgreementId
        ORDER BY PR.PersonId
        ) PR
      LEFT OUTER JOIN h_000.dbo.[language] L
        ON L.Language_Cd = N.Language_Cd
      LEFT OUTER JOIN [Language] One_L
        ON One_L.[name] = L.Descr
      LEFT OUTER JOIN h_000.dbo.[county]
        ON [county].County_Cd = N.County_Cd
      LEFT OUTER JOIN [CemeteryPropertyOwnersLog] CPO
        ON CPO.OnePortalAgreementPropertyId = AI.OnePortalAgreementPropertyItemId
          AND CPO.Name_ID = N.Name_Id
      WHERE LSU.LSU_Status_Cd = 'S'
        AND AI.OnePortalAgreementPropertyItemId IS NOT NULL
        
      EXEC sp_OACreate 'MSXML2.XMLHTTP',
        @Object OUT;
      /* DECLARE FOR CURSOR OUTPUT */
      DECLARE @Name_ID INT,
        @OnePortalID NVARCHAR(255),
        @SsnLastFour NVARCHAR(255),
        @SsnSalt NVARCHAR(255),
        @SsnEncrypted NVARCHAR(255),
        @Ssn_ToEncrypt NVARCHAR(255)

      DECLARE Person_Curson CURSOR FAST_FORWARD
      FOR
      SELECT DISTINCT Name_ID,
        OnePortalID,
        SsnSalt,
        SsnEncrypted,
        Ssn_ToEncrypt
      FROM #AgreementPerson

      OPEN Person_Curson

      FETCH NEXT
      FROM Person_Curson
      INTO @Name_ID,
        @OnePortalID,
        @SsnSalt,
        @SsnEncrypted,
        @Ssn_ToEncrypt

      WHILE @@FETCH_STATUS = 0
      BEGIN
        IF @OnePortalID IS NULL
        BEGIN
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

          UPDATE #AgreementPerson
          SET OnePortalID = @ResponseText_Opi
          WHERE Name_ID = @Name_ID
          
          SET @OnePortalID = @ResponseText_Opi
        END

        IF @Ssn_ToEncrypt IS NOT NULL
          AND @Ssn_ToEncrypt <> 0
          AND @SsnEncrypted IS NULL
        BEGIN
          /**** CALL API TO GENERATE SALT ****/
          EXEC sp_OACreate 'MSXML2.XMLHTTP',
            @Object OUT;

          EXEC sp_OAMethod @Object,
            'open',
            NULL,
            'get',
            'http://dev-app01:9001/api/temp/generatesalt', --Web Service Url
            'false'

          EXEC sp_OAMethod @Object,
            'send'

          EXEC sp_OAMethod @Object,
            'responseText',
            @ResponseText_Salt OUTPUT

          SET @Body = '{
              "v": "' + @Ssn_ToEncrypt + '",
              "s": "' + @ResponseText_Salt + '",
              "e": "' + @OnePortalID + '"
          }'

          /**** CALL API TO GENERATE ENCRYPTED SSN ****/
          EXEC sp_OAMethod @Object,
            'open',
            NULL,
            'post',
            'http://dev-app01:9001/api/temp/encrypt', --Web Service Url
            'false'

          EXEC sp_OAMethod @Object,
            'setRequestHeader',
            NULL,
            'Content-Type',
            'application/json'

          EXEC sp_OAMethod @Object,
            'send',
            NULL,
            @body

          EXEC sp_OAMethod @Object,
            'responseText',
            @ResponseText_Encrypted_SSN OUTPUT

          UPDATE #AgreementPerson
          SET SsnSalt = @ResponseText_Salt,
            SsnEncrypted = @ResponseText_Encrypted_SSN
          WHERE Name_ID = @Name_ID
        END

        FETCH NEXT
        FROM Person_Curson
        INTO @Name_ID,
          @OnePortalID,
          @SsnSalt,
          @SsnEncrypted,
          @Ssn_ToEncrypt
      END

      CLOSE Person_Curson

      DEALLOCATE Person_Curson

      /* INSERT DATA INTO PERSON, ADDRESS AND PLACE TABLES */
      EXEC Insert_Person_Data

      /* INSERT DATA INTO PERSON VERIFICATION DETAILS TABLE */
      EXEC Insert_PersonVerificationDetails_Data

      /* INSERT DATA INTO AGREEMENT PROPERTY OWNER */
      EXEC Insert_AgreementPropertyOwner_Data

      MERGE INTO [CemeteryPropertyOwnersLog] AS TGT
      USING (
        SELECT *
        FROM #AgreementPerson
        ) AP
        ON TGT.[Name_ID] = AP.Name_ID
          AND TGT.[OnePortalAgreementPropertyId] = AP.OnePortalAgreementPropertyId
      WHEN NOT MATCHED
        THEN
          INSERT (
            [AgreementID],
            [Lot_Sell_Unit_ID],
            [Name_ID],
            [OnePortalAgreementPropertyOwnerId],
            [OnePortalAgreementPropertyId],
            [OnePortalPersonId],
            [OnePortalAddressId],
            [OnePortalPlaceId],
            [OnePortalPersonVerificationDetailsId],
            [OnePortalID],
            [SsnLastFour],
            [SsnSalt],
            [SsnEncrypted]
            )
          VALUES (
            AP.AgreementId,
            AP.Lot_Sell_Unit_ID,
            AP.Name_ID,
            AP.OnePortalAgreementPropertyOwnerId,
            AP.OnePortalAgreementPropertyId,
            AP.OnePortalPersonId,
            AP.OnePortalAddressId,
            AP.OnePortalPlaceId,
            AP.OnePortalPersonVerificationDetailsId,
            AP.OnePortalID,
            AP.SsnLastFour,
            AP.SsnSalt,
            AP.SsnEncrypted
            )
      WHEN MATCHED
        THEN
          UPDATE
          SET [AgreementID] = AP.AgreementId,
            [Lot_Sell_Unit_ID] = AP.Lot_Sell_Unit_ID,
            [Name_ID] = AP.Name_ID,
            [OnePortalAgreementPropertyOwnerId] = AP.OnePortalAgreementPropertyOwnerId,
            [OnePortalAgreementPropertyId] = AP.OnePortalAgreementPropertyId,
            [OnePortalPersonId] = AP.OnePortalPersonId,
            [OnePortalAddressId] = AP.OnePortalAddressId,
            [OnePortalPlaceId] = AP.OnePortalPlaceId,
            [OnePortalPersonVerificationDetailsId] = AP.OnePortalPersonVerificationDetailsId,
            [OnePortalID] = AP.OnePortalID,
            [SsnLastFour] = AP.SsnLastFour,
            [SsnSalt] = AP.SsnSalt,
            [SsnEncrypted] = AP.SsnEncrypted;

      EXEC sp_OADestroy @Object;
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
