'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF OBJECT_ID('Agreement_TransformSaveSyncedFuneral_Data') IS NOT NULL
	--DROP PROCEDURE Agreement_TransformSaveSyncedFuneral_Data


CREATE PROCEDURE [dbo].[Agreement_TransformSaveSyncedFuneral_Data] @ContractNumber NVARCHAR(50),
	@Sales_Finance_ID INT,
	@Sales_Id INT,
	@caseid INT = NULL,
	@ContractType NVARCHAR(10), --Cem or Funeral or HMIS  
	@Username NVARCHAR(50) = NULL
AS
BEGIN
	SET NOCOUNT ON

	DECLARE @agreementId INT
	DECLARE @casestatus NVARCHAR(20)
	DECLARE @Datasync_USERID INT
	DECLARE @TransactionID INT
	DECLARE @SP VARCHAR(1000)
	DECLARE @CreatedAt DATETIME = GETDATE() --the only source of datetime in whole transfer  
	DECLARE @ErrorStr NVARCHAR(4000)

	SELECT @SP = OBJECT_NAME(@@PROCID) --name of this SP to ba passed to next procedures  

	--store the IS of user a@gmail.com.com  
	SELECT @Datasync_USERID = ID
	FROM [User]
	WHERE email = 'a@gmail.com.com'

	--drop temporary tables if exits   
	IF OBJECT_ID('tempdb..#Agreement') IS NOT NULL
	BEGIN
		DROP TABLE #Agreement
	END

	IF OBJECT_ID('tempdb..#AgreementItems') IS NOT NULL
	BEGIN
		DROP TABLE #AgreementItems
	END

	SELECT AFPL.AgreementId, --to filled with inserted/updated Agreement.ID
		S.Sales_ID,
		SF.Sales_Finance_id,
		ST.ID AS SaleTypeId, --Using that sales_type, in oneportal    DB, salesType table and code column you can get salesTypeId 
		S.Sales_Contract_Nbr AS ContractNumber,
		'Submitted' AS SaleStatus,
		1 AS IsValidated,
		L.ID AS LocationId,
		ATY.ID AS AgreementType,
		ANT.ID AS AgreementNeedType,
		E.ID AS ArrangerId,
		SC.Sales_Counselor_ID, -- h_000.dbo.Sales_Counselor.Sales_Counselor_ID 
		@Datasync_USERID AS CreatedBy,
		@Datasync_USERID AS UpdatedBy,
		@CreatedAt AS CreatedAt,
		@CreatedAt AS UpdatedAt,
		SF.Purchase_Price AS TotalPrice, --HMIS: Sales_Finance.Purchase_Price  
		SF.Purchase_Price + SF.Adjustments AS TotalCashPrice, -- totalPurchaserPrice + totalAdjustment 
		SF.Sales_Tax AS TotalTax, --HMIS: Sales_Finance.Sales_Tax  
		SF.Purchase_Price + SF.Sales_Tax AS TotalPurchasePrice, -- totalPrice + totalTax  
		SF.Adjustments AS TotalAdjustment, -- HMIS: Sales_Finance.Adjustments -- "AgreementAdjustment table 1) Discount is -ve 2) Previous balance is +ve, Check if data is available in HMIS"  
		SF.Balance_Due AS Due, -- HMIS: Sales_Finance.Balance_Due  
		SF.Total_of_Pymts + SF.Down_Pymt AS TotalPaid, --"HMIS: Sales_Finance.Total_of_Pymts + Sales_Finance.Down_Pymt"
		NULL AS ArrangementId,
		NULL AS TxnID,
		NULL AS AgreementCemPortalLogID,
		C.ID AS CaseID,
		T.ID AS TransactionID,
		AFPL.ID AS AgreementFuneralPortalLogID,
		@Username AS Username,
		@ContractType AS ContractType,
		SF.last_update_DT AS SalesFinanceLastUpdatedDate,
		object_name(@@PROCID) AS SQLSP
	--FUNPORTAL
	/*
		NULL AS OldLocationID,
		NULL AS DecedentId,
		NULL AS PackageId,
		NULL AS EmployeeID,
		NULL AS CaseEmployeeId
		*/
	INTO #AGREEMENT
	FROM h_000.dbo.Sales S
	INNER JOIN h_000.dbo.Sales_Finance SF
		ON S.Sales_ID = SF.Sales_ID
			AND SF.Active = 1
	INNER JOIN SaleType ST
		ON ST.code = S.Sales_Type_Cd
	LEFT JOIN funportal_local.dbo.[Case] C
		ON C.ID = @CaseID
	LEFT JOIN funportal_local.dbo.[Transaction] T
		ON T.isActive = 1
			AND T.caseid = C.id
	LEFT JOIN funportal_local.DBO.[LOCATION] FL
		ON C.locationId = FL.id
	LEFT JOIN [Location] L
		ON FL.campus = L.campus
	LEFT JOIN AgreementTypes ATY
		ON ATY.[Type] = 'funeral'
	LEFT JOIN AgreementNeedTypes ANT
		ON ANT.[Type] = S.[Sales_Need_Type_Cd]
	LEFT JOIN h_000.dbo.Sales_Sales_Counselor AS ssc
		ON S.Sales_ID = ssc.Sales_ID
		AND SSC.Primary_Sales_Counselor = 1
	LEFT JOIN h_000.dbo.Sales_Counselor sc
		ON ssc.Sales_Counselor_ID = sc.Sales_Counselor_ID
	LEFT JOIN Employee E
		ON E.salesCounselorId = sc.Sales_Counselor_ID --left outer join to have contract with missing employees  
	LEFT JOIN AgreementFuneralPortalLog AFPL
		ON AFPL.OldCaseId = C.ID
	WHERE S.Sales_ID = @Sales_ID

	--20200623 overwrite the input parameter @ContractNumber from [sales].Sales_Contract_Nbr - just from funportal-HMIS  
	--20200623 #Agreement.[contractNumber] comes from Sales.Sales_Contract_Nbr  
	SELECT @ContractNumber = [contractNumber]
	FROM #Agreement

	--insert Agreement row based on #Agreement, @agreementId is outpout parameter with new Agreement.ID  
	EXEC Insert_Agreement_Data @agreementId OUTPUT,
		@isCemportal = 0,
		@SP = @SP

	--one procedure to populate [AgreementLocationItem] and [AgreementItemPrice] 
	EXEC Agreement_TransformSaveSyncedFuneral_AgreementItem_Data @ContractNumber = @ContractNumber,
		@Sales_Finance_ID = @Sales_Finance_ID,
		@Sales_ID = @Sales_ID,
		@ContractType = @ContractType,
		@Username = @Username,
		@agreementId = @agreementId

	--populates: Person(if missing), AgreementPerson  
	EXEC Agreement_TransformSaveSyncedFuneral_Person_Data @ContractNumber = @ContractNumber,
		@Sales_ID = @Sales_ID,
		@ContractType = @ContractType,
		@IsCemPortal = 0,
		@Username = @Username,
		@agreementId = @agreementId

	--populates [Payment] and Payment_log  
	EXEC Agreement_TransformSyncedFuneral_Payment_Data
	
	UPDATE A SET
		A.TotalPrice = A1.TotalPrice,
		A.totalTax = A1.totalTax,
        A.totalPurchasePrice = A1.totalPurchasePrice,
        A.totalCashPrice = A1.TotalCashPrice,
		A.TotalPaid = A1.TotalPaid,
        A.due = A1.due,
        A.totalAdjustment = A1.totalAdjustment
    FROM Agreement A
        INNER JOIN #AGREEMENT A1
            ON A.id = A1.AgreementId

	--Handles Funeral Scheduling from funportal
	EXEC Agreement_TransformSaveFuneralScheduling_Data

	IF OBJECT_ID('tempdb..#Agreement') IS NOT NULL
	BEGIN
		DROP TABLE #Agreement
	END

	IF OBJECT_ID('tempdb..#AgreementItems') IS NOT NULL
	BEGIN
		DROP TABLE #AgreementItems
	END

	RETURN 0
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
