'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Agreement_TransformSaveSyncedFuneral_Person_Data') IS NOT NULL
	--DROP PROCEDURE Agreement_TransformSaveSyncedFuneral_Person_Data


CREATE PROCEDURE [dbo].[Agreement_TransformSaveSyncedFuneral_Person_Data] (
	@ContractNumber NVARCHAR(50),
	@Sales_Id INT = NULL, --Sales_Id or Sales_Finanace_id(for the contracts that are available on HMIS) will be input parameter for the SP
	@ContractType NVARCHAR(10), --Cem or Funeral or HMIS
	@IsCemPortal BIT,
	@Username NVARCHAR(50) = NULL, --Cem or Funeral or HMIS
	@agreementId INT, --to habdle lines just for this one agreement
	@personId INT = NULL
	)
AS
BEGIN

	DECLARE @Object AS INT;
	DECLARE @ResponseText_Salt AS VARCHAR(8000);
	DECLARE @ResponseText_Opi AS VARCHAR(8000);
	DECLARE @ResponseText_Encrypted_SSN AS VARCHAR(8000);
	DECLARE @Body AS VARCHAR(8000)

	CREATE TABLE #AgreementPerson (
		Name_ID INT,
		NAME_TYPE_CD NVARCHAR(20),
		Suffix NVARCHAR(40),
		Title NVARCHAR(15),
		FirstName NVARCHAR(25),
		MiddleName NVARCHAR(25),
		LastName NVARCHAR(25),
		PhoneNumber NVARCHAR(20),
		SecondaryPhoneNumber NVARCHAR(20),
		Email NVARCHAR(100),
		Gender INT,
		Language_Cd NVARCHAR(10),
		LanguageDescr NVARCHAR(30),
		LanguageId INT,
		IsVerified BIT,
		DateOfBirth DATETIME,
		IsAlive BIT,
		AddressPlaceId INT,
		AgreementId INT,
		AgreementPersonId INT,
		RoleDesc NVARCHAR(100),
		AgreementRoleId INT,
		CreatedBy INT,
		UpdatedBy INT,
		CreatedAt DATETIME,
		UpdatedAt DATETIME,
		OnePortalPersonID INT,
		OnePortalPersonID_NEW INT,
		OnePortalAddressId INT,
		OnePortalPlaceId INT,
		Line1 NVARCHAR(510),
		Primary_Street_No NVARCHAR(200),
		Primary_Street_Name NVARCHAR(200),
		Primary_Street_Address NVARCHAR(200),
		STATE NVARCHAR(200),
		City NVARCHAR(200),
		ZipCode NVARCHAR(200),
		Country NVARCHAR(200),
		County_cd NVARCHAR(200),
		County NVARCHAR(200),
		UserName NVARCHAR(200),
		Sales_ID NVARCHAR(200),
		SP NVARCHAR(200),
		OnePortalPersonVerificationDetailsId INT,
		VerifiedBy INT,
		VerifiedAt DATETIME,
		OnePortalID NVARCHAR(255),
		SsnLastFour NVARCHAR(255),
		SsnSalt NVARCHAR(255),
		SsnEncrypted NVARCHAR(255),
		YearsAtResidentialAddress INT,
		LastTouchedAt DATETIMEOFFSET(7),
		Ssn NVARCHAR(255),
		Ssn_ToEncrypt NVARCHAR(255)
		)

	--all the persons linked in the contract
	INSERT INTO #AgreementPerson
	SELECT ON1.Name_ID,
		RTRIM(LTRIM(ON1.NAME_TYPE_CD)) AS NAME_TYPE_CD,
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
			END AS 'Gender', -- Tejo decided to mae it 3 
		L.Language_Cd AS Language_Cd,
		L.Descr AS LanguageDescr,
		One_L.ID AS LanguageId, -- Onportal [Language].ID
		1 AS IsVerified,
		convert(DATETIME, N.Lot_Born_Dt) AS DateOfBirth,
		CASE RTRIM(LTRIM(ON1.NAME_TYPE_CD))
			WHEN 'Deceased'
				THEN 0
			ELSE 1
			END AS IsAlive,
		NULL AS AddressPlaceId, --REFERENCES Place.ID, 1 for now
		@agreementId AS AgreementId,
		ISNULL(PAL.AgreementPersonid, NULL) AS AgreementPersonId,
		NULL AS RoleDesc,
		NULL AS AgreementRoleId,
		A.createdBy AS CreatedBy,
		A.UpdatedBy AS UpdatedBy,
		A.CreatedAt AS CreatedAt, --to have the initial date everywhere
		A.UpdatedAt AS UpdatedAt, --to have the initial date everywhere
		ISNULL(ISNULL(PAL.personId, PER.PersonId),-1) AS OnePortalPersonID, --to be updated later if found or inserted 
		- 1 AS OnePortalPersonID_NEW, --only for new added Persons
		- 1 AS OnePortalAddressId, --to be updated later, only for new added Addresses
		- 1 AS OnePortalPlaceId, --to be updated later, only for new added Place
		ltrim(isnull(rtrim(convert(VARCHAR, N.Primary_Street_No)), '') + ' ' + ltrim(isnull(N.Primary_Street_Name, '') + ' ' + isnull(N.Primary_Street_Address, ''))) AS Line1, --  => Adresses.Line1
		isnull(ltrim(rtrim(convert(VARCHAR, N.Primary_Street_No))), '') AS Primary_Street_No,
		ltrim(rtrim(isnull(N.Primary_Street_Name, ''))) AS Primary_Street_Name,
		ltrim(rtrim(isnull(N.Primary_Street_Address, ''))) AS Primary_Street_Address,
		isnull(N.Primary_State, '') AS State, --  => Adresses.State
		isnull(N.Primary_City, '') AS City, --  => Adresses.City
		isnull(N.Primary_Zip, '') AS ZipCode, --  => Adresses.ZipCode
		isnull(N.Primary_Country, '') AS Country,
		isnull(N.County_cd, '') AS County_cd,
		isnull([county].Descr, '') AS County,
		A.UserName,
		S.Sales_ID,
		object_name(@@PROCID) AS 'SP',
		/* PERSON VERIFICATION DETAILS */
		ISNULL(PAL.OnePortalPersonVerificationDetailsId, PER.PersonVerificationDetailsId) AS OnePortalPersonVerificationDetailsId,
		A.CreatedBy AS VerifiedBy,
		A.CreatedAt AS VerifiedAt,
		ISNULL(PVD.OnePortalId, PER.onePortalId) AS OnePortalID,
		ISNULL(CASE WHEN N.SS_Nbr <> 0
		THEN
		SUBSTRING(CAST(N.SS_Nbr AS VARCHAR), LEN(CAST(N.SS_Nbr AS VARCHAR))-4, 4)
		END, PER.ssnLastFour) AS SsnLastFour,
		ISNULL(PVD.SsnSalt, PER.ssnSalt) AS SsnSalt,
		ISNULL(PVD.SsnEncrypted, PER.ssnEncrypted) AS SsnEncrypted,
		NULL AS YearsAtResidentialAddress,
		A.UpdatedAt AS LastTouchedAt,
		CAST(NULL AS NVARCHAR(255)) AS Ssn,
		N.SS_Nbr AS Ssn_ToEncrypt
	FROM h_000.dbo.Sales S
	INNER JOIN H_000.DBO.OBJECT_NAME ON1
		ON S.Sales_ID = ON1.Object_ID
	INNER JOIN #Agreement A
		ON A.Sales_ID = @Sales_Id --just one row here 
	INNER JOIN h_000.dbo.[Name] N
		ON ON1.Name_ID = N.Name_ID
		AND ISNULL(N.Primary_First_Name, '') <> ''
	LEFT JOIN PersonAgreementHMISLog PAL
		ON  A.AgreementId = PAL.agreementId
		AND N.Name_ID = PAL.OldPersonID
		AND ON1.NAME_TYPE_CD = PAL.HMISRoleDesc
	LEFT JOIN PersonVerificationDetails PVD
			ON PVD.PersonId = PAL.PersonId
	OUTER APPLY (SELECT TOP 1 PR.PersonId,
			PVD.ID AS PersonVerificationDetailsId,
			PVD.onePortalId,
			PVD.ssnLastFour,
			PVD.ssnSalt,
			PVD.ssnEncrypted
		FROM AgreementPerson PR
		JOIN Person P
			ON P.Id = PR.PersonId
		LEFT JOIN PersonVerificationDetails PVD
			ON PVD.PersonId = PR.PersonId
		WHERE PR.AgreementId = A.AgreementId
		AND (ISNULL(P.firstName, '') + ' ' + ISNULL(P.middleName, '') = ISNULL(N.Primary_First_Name, '') OR ISNULL(P.firstName, '') = ISNULL(N.Primary_First_Name, ''))
			AND ISNULL(P.middleName, '') = ISNULL(N.Primary_Middle_Name, '')
			AND ISNULL(P.lastName, '') = ISNULL(N.Primary_Last_Name, '')
		ORDER BY PR.PersonId) PER
	LEFT OUTER JOIN h_000.dbo.[language] L
		ON L.Language_Cd = N.Language_Cd
	LEFT OUTER JOIN [Language] One_L
		ON One_L.[name] = L.Descr
	LEFT OUTER JOIN h_000.dbo.[county]
		ON [county].County_Cd = N.County_Cd
	WHERE ON1.OBJECT_TYPE_CD = 'Sales'
		AND ON1.NAME_TYPE_CD IN ('Purch', 'Deceased', 'Insured')
		AND S.Sales_Contract_Nbr = @ContractNumber
		AND S.SALES_ID = @SALES_ID

	-- add ID with identity for further cursor
	ALTER TABLE #AgreementPerson ADD ID INT identity (
		1,
		1
		)

	-- SELECT * FROM PersonAgreementHMISLog
	-- -----------------------------------------------------------------------------------
	-- -- to insert missing [Person] from Agreement based on #AgreementPerson
	-- -- to insert missing [Address] from Agreement based on #AgreementPerson
	-- -- to insert [AddressFuneralPortalLog] for each new Address
	-- -----------------------------------------------------------------------------------

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

	-- --update RoleID from Oneportal DB
	UPDATE U
	SET U.AgreementRoleId = A.Id,
		U.RoleDesc = A.name
	FROM #AgreementPerson U
	INNER JOIN AgreementRole A
		ON A.name = CASE U.NAME_TYPE_CD
				WHEN 'Co-Purch'
					THEN 'Co-purchaser'
				WHEN 'Purch'
					THEN 'Purchaser'
				WHEN 'Deceased'
					THEN 'Beneficiary' -- Even if the person is Deceased, agreement role for that person is 'Beneficiary'
				WHEN 'BENEFICARY'
					THEN 'Beneficiary' --different form
				WHEN 'INSURED'
					THEN 'Beneficiary'
				ELSE U.NAME_TYPE_CD
				END
	WHERE ISNULL(U.FirstName, '') <> ''
		AND U.AgreementRoleId IS NULL --we ignore person without firstName

	IF (@personId IS NOT NULL)
	BEGIN
		-- providing firstName because its needed to be valid for records to insert into agreement person table, firstName will not be stored in DB for this record
		INSERT INTO #AgreementPerson (
			Name_ID,
			Name_Type_Cd,
			Suffix,
			Title,
			FirstName,
			MiddleName,
			LastName,
			PhoneNumber,
			SecondaryPhoneNumber,
			Email,
			Gender,
			Language_Cd,
			LanguageDescr,
			LanguageId,
			IsVerified,
			DateOfBirth,
			IsAlive,
			AddressPlaceId,
			AGREEMENTID,
			AgreementPersonId,
			RoleDesc,
			AgreementRoleId,
			CreatedBy,
			UpdatedBy,
			CreatedAt,
			UpdatedAt,
			OnePortalPersonID,
			OnePortalPersonID_NEW,
			OnePortalAddressId,
			OnePortalPlaceId,
			Line1,
			Primary_Street_No,
			Primary_Street_Name,
			Primary_Street_Address,
			STATE,
			City,
			ZipCode,
			Country,
			County_cd,
			County,
			UserName,
			Sales_ID,
			SP
			)
		SELECT NULL,
			NULL,
			NULL,
			NULL,
			'Dummy',
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			@agreementId,
			NULL AS AgreementPersonId,
			AR.name,
			AR.id,
			NULL,
			NULL,
			GETDATE(),
			GETDATE(),
			@personId,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			NULL,
			@Sales_Id,
			NULL
		FROM AGREEMENTROLE AR
		WHERE AR.NAME = 'Beneficiary'
	END

	-- SELECT 'After inserting new rows checking temporary table' AS [MESSAGE]
	DECLARE @PersonAgreementHMISLog TABLE (
		AgreementPersonId INT,
		OnePortalPersonVerificationDetailsId INT,
		AgreementId INT,
		PersonID INT,
		OldPersonId INT,
		HMISRoleDesc NVARCHAR(100),
		RoleDesc NVARCHAR(100),
		Message NVARCHAR(500),
		Portal NVARCHAR(100)
		)

	-- -- insert all conntract persons into target table and log table at once with MERGE
	MERGE INTO AgreementPerson AS tgt
	USING (
		SELECT DISTINCT
			AgreementId,
			OnePortalPersonID,
			AgreementRoleId,
			createdBy,
			updatedBy,
			createdAt,
			updatedAt,
			OnePortalPersonVerificationDetailsId,
			Name_Id,
			NAME_TYPE_CD,
			RoleDesc
		FROM #AgreementPerson AP
		WHERE ISNULL(AP.firstName, '') <> '' --we ignore person without firstName
		) AS P
		ON TGT.agreementId = P.AgreementId
			AND TGT.personId = P.OnePortalPersonID
			AND TGT.roleId = P.AgreementRoleId -- WITH PERSON AND ROLE THERE SHOULD ALWAYS BE UNIQUE RECORDS IN AgreementPerson TABLE
	WHEN NOT MATCHED
		THEN
			INSERT (
				agreementId,
				personId,
				roleId,
				createdBy,
				updatedBy,
				createdAt,
				updatedAt
				)
			VALUES (
				AgreementId, --as 'agreementId'
				OnePortalPersonID, --as 'personId' --new and existing are here
				AgreementRoleId, -- as 'roleId'
				createdBy,
				updatedBy,
				createdAt,
				updatedAt
				)
	OUTPUT inserted.ID, --the new identity from AgreementPerson.ID
		P.AgreementId,
		P.OnePortalPersonID,
		P.OnePortalPersonVerificationDetailsId,
		P.Name_Id,
		P.NAME_TYPE_CD,
		P.RoleDesc,
		'Inserted New AgreementPerson',
		CASE 
			WHEN @IsCemPortal = 1
				THEN 'cemportal-hmis'
			ELSE 'funportal-hmis'
			END
	INTO @PersonAgreementHMISLog(AgreementPersonId, AgreementId, PersonID, OnePortalPersonVerificationDetailsId, OldPersonId, HMISRoleDesc, RoleDesc, [Message], Portal);

	MERGE INTO PersonAgreementHMISLog AS TGT
	USING (
		SELECT * FROM @PersonAgreementHMISLog
	) AS P 
	ON TGT.AgreementPersonId = P.AgreementPersonId 
	-- AND TGT.PersonId = P.PersonID AND TGT.OldPersonId = P.OldPersonId and TGT.RoleDesc = P.RoleDesc
	WHEN NOT MATCHED 
		THEN 
			INSERT (
				AgreementPersonId,
				AgreementId, 
				PersonID, 
				OldPersonId,
				OnePortalPersonVerificationDetailsId,
				HMISRoleDesc,
				RoleDesc, 
				[Message], 
				Portal
			)
		VALUES(
				P.AgreementPersonId,
				P.AgreementId,
				P.PersonID,
				P.OldPersonId,
				P.OnePortalPersonVerificationDetailsId,
				P.HMISRoleDesc,
				P.RoleDesc,
				P.[Message],
				P.Portal 
			)
		WHEN MATCHED
		THEN
			UPDATE
			SET AgreementPersonId = P.AgreementPersonId,
				AgreementId = P.AgreementId,
				PersonID = P.PersonID,
				OldPersonId = P.OldPersonId,
				OnePortalPersonVerificationDetailsId = P.OnePortalPersonVerificationDetailsId,
				HMISRoleDesc = P.HMISRoleDesc,
				RoleDesc = P.RoleDesc, 
				[Message] = P.[Message],
				Portal = P.Portal;

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
