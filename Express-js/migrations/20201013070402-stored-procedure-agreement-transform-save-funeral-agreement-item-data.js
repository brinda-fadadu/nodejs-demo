'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Agreement_TransformSaveFuneral_AgreementItem_Data') IS NOT NULL
	--DROP PROCEDURE Agreement_TransformSaveFuneral_AgreementItem_Data


CREATE PROCEDURE [dbo].[Agreement_TransformSaveFuneral_AgreementItem_Data] @ContractNumber NVARCHAR(50),
	@Sales_Finance_ID INT = NULL, --Sales_Finanace_id(for the contracts that are available on HMIS) will be input parameter for the SP
	@Sales_id INT = NULL, --Sales_Id (for the contracts that are available on HMIS) will be input parameter for the SP
	@ContractType NVARCHAR(10), --Cem or Funeral or HMIS
	@Username NVARCHAR(50) = NULL, --Cem or Funeral or HMIS
	@AgreementId INT --To handle lines just for this one agreement
AS
BEGIN
	SET NOCOUNT ON

	DECLARE @tax_pct NUMERIC(18, 5) = NULL --tax percent
	DECLARE @tax_hmis_itemcodelist VARCHAR(100) = ''
	DECLARE @taxhmis_Sales_Item_IDlist VARCHAR(100) = ''

	SELECT I.code AS ItemCode,
		I.[description] AS ItemDescription,
		I.code AS Item_Cd,
		I.Id AS FuneralItemId,
		I.LocationId AS FuneralItemLocationId,
		I.code AS Product_Item_CD,
		CASE 
			WHEN FAL.ID IS NULL
				THEN 
					ISNULL(IR.NewItemCode, LTRIM(RTRIM(SUBSTRING(I.code, 4, LEN(I.code)))))
			ELSE FAL.OnePortalItemCode
		END AS ProductItemCode,
		CAST(NULL AS NVARCHAR(50)) AS ReplacedItemCode,
		CASE 
			WHEN A.AgreementNeedType = 2 /* PN */
				THEN 'CFS'
			ELSE CASE 
					WHEN FAL.ID IS NULL
						THEN LTRIM(RTRIM(SUBSTRING(I.code, 1, 3)))
					ELSE FAL.LocationCode
					END
			END AS ProductItemLocationCode,
		I.[description] AS Item_Cd_desc,
		NULL AS Update_User_ID,
		I.[description] AS ItemDescr,
		CONVERT(INT, NULL) AS OnePortalItemId,
		CONVERT(NVARCHAR(20), NULL) AS OnePortalItemCode,
		CONVERT(NVARCHAR(510), NULL) AS OnePortalItemName,
		CONVERT(INT, NULL) AS OnePortalItemCategoryId,
		CONVERT(NVARCHAR(510), NULL) AS OnePortalItemCategoryName,
		CONVERT(NVARCHAR(40), NULL) AS OnePortalLinkContract_ItemHelperItemType,
		CONVERT(INT, NULL) AS OnePortalLocationItemId,
		CONVERT(NVARCHAR(510), NULL) AS OnePortalLocationCode,
		CONVERT(INT, NULL) AS OnePortalLocationId,
		A.CreatedBy AS CreatedBy, --#Agreement.CreatedBy so we have the time same everywhere for same Agreement
		A.UpdatedBy AS UpdatedBy, --#Agreement.UpdatedBy so we have the time same everywhere for same Agreement
		A.CreatedAt AS CreatedAt, --#Agreement.CreatedAt so we have the time same everywhere for same Agreement
		A.UpdatedAt AS UpdatedAt, --#Agreement.UpdatedAt so we have the time same everywhere for same Agreement
		CONVERT(INT, NULL) AS OnePortalAgreementItemPriceID, -- updated in Insert_AgreementItemPrice_Data
		CONVERT(INT, NULL) AS OnePortalAgreementLocationItemID, -- updated in Insert_AgreementLocationItem_Data
		CONVERT(INT, NULL) AS OnePortalAgreementCashAdvancedItemID, -- updated in Insert_AgreementCashAdvanceItem_Data
		CONVERT(INT, NULL) AS OnePortalAgreementPackageID, -- updated in Insert_Agreement_DataPackage
		CONVERT(INT, NULL) AS OnePortalAgreementPackageItemID, -- updated in Insert_AgreementPackageItem_Data
		CONVERT(INT, NULL) AS OnePortalPackageId, -- updated here from Package.ID
		CONVERT(INT, NULL) AS OnePortalAgreementAdjustmentID,
		A.AgreementFuneralPortalLogID AS OnePortalAgreementFuneralPortalLogID,
		CONVERT(INT, NULL) AS OnePortalAgreementMamorialId,
		CONVERT(INT, NULL) AS OnePortalAgreementMamorialItemId,
		CONVERT(INT, NULL) AS OnePortalAgreementCemeteryPortalLogId,
		CONVERT(INT, NULL) AS TxnLineId,
		CONVERT(INT, NULL) AS TxnId,
		NULL AS Sales_Item_ID,
		NULL AS Lot_Sell_Unit_ID,
		TL.Quantity AS Quantity,
		TL.SalesPrice AS UnitPrice,
		TL.quantity * TL.salesPrice AS TotalPrice,
		ROUND(I.isTaxable * T.Tax / 100 * TL.SalesPrice, 2) AS UnitTax,
		ROUND(TL.Quantity * I.isTaxable * T.Tax / 100 * TL.SalesPrice, 2) AS TotalTax,
		NULL AS EndowmentCareFund,
		T.Tax AS Tax_Pct,
		I.isTaxable AS Taxable,
		NULL AS SalesItemAmountPaid,
		NULL AS SalesItemDiscount,
		A.AgreementId,
		NULL AS SalesContractNbr,
		NULL AS SalesFinanceId,
		NULL AS SalesFinanceSalesTax,
		NULL AS AgreementCemPortalLogID,
		NULL AS IsHMISItemActive,
		CASE 
			WHEN PLS.id IS NOT NULL
				THEN I.Code
			ELSE NULL
			END AS PackageItemCode,
		P.Name AS PackageName,
		P.Code AS PackageCode,
		TL.UpdateUser AS TransactionlineUpdateUser,
		CASE 
			WHEN I.code = 'X'
				THEN 1
			ELSE NULL
			END AS IsFinanceCharge,
		NULL AS IsIntermentRight,
		NULL AS Sales_ID,
		NULL AS SalesDeliveryDate,
		NULL AS IsAdjustment,
		CONVERT(INT, NULL) AS ItemUsedStatus,
		CONVERT(INT, NULL) AS DecedentId,
		CONVERT(NVARCHAR(30), NULL) AS ItemUsageResourceType,
		CONVERT(INT, NULL) AS ItemUsageResourceId,
		CONVERT(BIT, NULL) AS IsItemPriceInsert,
		CONVERT(BIT, NULL) AS IsAgreementCashAdvancedItem,
		CONVERT(INT, NULL) AS IntermentRightPropertyId,
		CONVERT(INT, NULL) AS OnePortalmemorialTypeAttributeValueId,
		CONVERT(BIT, NULL) AS IsAgreementLocationItem,
		CONVERT(BIT, NULL) AS IsAgreementPackage,
		CASE 
			WHEN PLS.id IS NOT NULL
				THEN 1
			ELSE 0
			END AS IsAgreementPackageItem,
		CASE 
			WHEN IC.[description] = 'Discount'
				THEN TL.quantity * TL.salesPrice
			ELSE 0
			END AS Adjustment, --only discounts
		A.CaseID,
		A.TransactionID,
		TL.ID AS TransactionlineId,
		OBJECT_NAME(@@PROCID) AS SQLSP
	INTO #AgreementItems
	FROM funportal_local.dbo.[Transaction] T
	INNER JOIN funportal_local.dbo.[Transactionline] TL
		ON TL.transactionId = T.ID
	INNER JOIN funportal_local.dbo.Item I
		ON TL.itemId = I.id
	INNER JOIN funportal_local.dbo.ItemClass IC
		ON I.itemClassId = IC.id
	INNER JOIN #Agreement A
		ON T.caseid = A.CaseID --single row here 
	LEFT OUTER JOIN funportal_local.dbo.PackageLocationService PLS
		ON PLS.ItemID = I.ID
			AND PLS.locationId = I.LocationId
	LEFT OUTER JOIN funportal_local.dbo.Package P
		ON P.ID = PLS.packageId
	LEFT OUTER JOIN FuneralAdhocItemsLog FAL
		ON FAL.FuneralItemId = I.Id
	LEFT OUTER JOIN ItemReplacement IR
		ON IR.OldItemCode = LTRIM(RTRIM(SUBSTRING(I.code, 4, LEN(I.code))))
	WHERE T.isActive = 1
		AND TL.isActive = 1
		AND TL.Quantity > 0

	UPDATE #AgreementItems
	SET ReplacedItemCode = ProductItemCode
	WHERE ProductItemCode <> LTRIM(RTRIM(SUBSTRING(Product_Item_CD, 4, LEN(Product_Item_CD))))

	--update #AgreementItems with Oneportal data
	--missing items will have nulls and -1's
	UPDATE AI
	SET OnePortalItemId = I.ID,
		OnePortalItemCode = I.code,
		OnePortalItemName = I.[Name],
		OnePortalItemCategoryId = I.itemCategoryId,
		OnePortalItemCategoryName = IC.[Name],
		OnePortalLocationItemId = LI.ID,
		OnePortalLocationCode = L.code,
		OnePortalLocationId = L.ID,
		OnePortalAgreementLocationItemId = FCIL.AgreementLocationItemID,
		OnePortalAgreementItemPriceId = FCIL.AgreementItemPriceID,
		IsItemPriceInsert = 1,
		IsAgreementLocationItem = CASE 
			WHEN IC.[Name] = 'Cash Advance'
				THEN 0
			ELSE 1
			END,
		IsAgreementCashAdvancedItem = CASE 
			WHEN IC.[Name] = 'Cash Advance'
				THEN 1
			ELSE 0
			END
	FROM #AgreementItems AI
	INNER JOIN Item I
		ON I.code = ProductItemCode --we drop the first 3 characters
	LEFT JOIN ItemCategory IC
		ON I.itemCategoryId = IC.id
	INNER JOIN [Location] L
		ON L.code = ProductItemLocationCode
	INNER JOIN [LocationItem] LI
		ON I.ID = LI.itemId
			AND L.id = LI.locationId
	LEFT JOIN FuneralContractItemsLog FCIL
		ON FCIL.OldTransactionLineId = AI.TransactionLineId

	--update #AgreementItems with Oneportal..[LinkContract_ItemHelper] data, 
	--this must be separate update as TAXes are not in Onportal..Items, so not updated with above update
	UPDATE AI
	SET OnePortalLinkContract_ItemHelperItemType = ISNULL(IH.ItemType, NULL),
		IsAdjustment = CASE 
			WHEN IH.ItemType = 'Discount'
				THEN 1
			ELSE 0
			END,
		IsAgreementLocationItem = 0,
		AI.OnePortalAgreementAdjustmentId = FCIL.AgreementAdjustmentID,
		IsItemPriceInsert = 0
	FROM #AgreementItems AI
	INNER JOIN [LinkContract_ItemHelper] IH
		ON IH.ItemCode = AI.Item_Cd
	INNER JOIN #Agreement A
		ON AI.AgreementId = A.AgreementId
	LEFT JOIN FuneralContractItemsLog FCIL
		ON FCIL.OldTransactionLineId = AI.TransactionLineId --just one row here

	/* Exclude Package Items from LocationItems, CashAdvancedItems And AgreementItemPrice */
	UPDATE AI
	SET AI.IsAgreementLocationItem = 0,
		AI.IsItemPriceInsert = 0,
		AI.IsAgreementCashAdvancedItem = 0,
		AI.IsAdjustment = 0
	FROM #AgreementItems AI
	INNER JOIN funportal_local.dbo.PackageLocationService PLS
		ON PLS.ItemID = AI.FuneralItemId
			AND PLS.locationId = AI.FuneralItemLocationId

	--update the packageID matched by !CODE! and location
	UPDATE AI
	SET AI.OnePortalPackageId = P.id
	FROM #AgreementItems AI
	INNER JOIN Package P
		ON P.locationID = AI.OnePortalLocationId
			AND P.[code] = AI.PackageCode

	--to have some PK here for future cursor usage
	ALTER TABLE #AgreementItems ADD ID INT identity (
		1,
		1
		)

	-- Discounts from agreement items table will be copied into this table
	CREATE TABLE #AgreementAdjustment (
		OnePortalAgreementAdjustmentId INT,
		AdjustmentId INT,
		Item_Cd_desc NVARCHAR(200),
		AgreementId INT,
		UnitPrice DECIMAL(10, 2),
		AdjustmentStatus NVARCHAR(40),
		HMISItemCode NVARCHAR(100),
		OnePortalLinkContract_ItemHelperItemType NVARCHAR(100),
		Sales_Adjustment_Id INT,
		Sales_Item_ID INT,
		CaseID INT,
		TransactionID INT,
		TransactionlineId INT,
		TxnLineId INT,
		Version INT,
		CreatedBy INT,
		CreatedAt DATETIME,
		UpdatedAt DATETIME,
		Update_User_ID NVARCHAR(200),
		SRC NVARCHAR(200),
		IsAdjustment BIT,
		CemeteryContractAdjustmentLogId INT,
		FuneralContractAdjustmentLogId INT
		)

	INSERT INTO #AgreementAdjustment (
		OnePortalAgreementAdjustmentId,
		AdjustmentId,
		Item_Cd_desc,
		AgreementId,
		UnitPrice,
		AdjustmentStatus,
		HMISItemCode,
		OnePortalLinkContract_ItemHelperItemType,
		Sales_Adjustment_Id,
		Sales_Item_ID,
		CaseID,
		TransactionID,
		TransactionlineId,
		TxnLineId,
		Version,
		CreatedBy,
		CreatedAt,
		UpdatedAt,
		Update_User_ID,
		SRC,
		IsAdjustment,
		CemeteryContractAdjustmentLogId,
		FuneralContractAdjustmentLogId
		)
	SELECT AI.OnePortalAgreementAdjustmentId,
		ADJ.ID AS AdjustmentId, --INT HMIS: Sales_Item.Product_Item_CD Map adjustment Id using  stored in Adjustment.product_item_cd table
		AI.Item_Cd_desc, --NVARCHAR	NULL	HMIS: Sales_Item.Item_Cd_Desc
		AI.AgreementId, --INT	Map AgreementId for this transaction
		--For discount items in sales_price column the data available is the calculated total tax for items ordered for that contract
		AI.[unitPrice] * -1, --DECIMAL(10,2)	 HMIS: Sales_item.Sales_price			
		--If adjustment.isApprovalNeeded then 'Requires Approval' else 'Approved'
		CASE ADJ.isApprovalNeeded
			WHEN 1
				THEN 'Requires Approval'
			ELSE 'Approved'
			END AS AdjustmentStatus,
		ADJ.HMISItemCode,
		AI.OnePortalLinkContract_ItemHelperItemType,
		NULL AS Sales_Adjustment_Id,
		AI.Sales_Item_ID,
		AI.CaseID,
		AI.TransactionID,
		AI.TransactionlineId,
		AI.TxnLineId,
		1 AS Version,
		AI.CreatedBy,
		AI.CreatedAt,
		AI.UpdatedAt,
		AI.Update_User_ID,
		'FUNPORTAL' AS SRC,
		AI.IsAdjustment,
		NULL AS CemeteryContractAdjustmentLogId,
		NULL AS FuneralContractAdjustmentLogId
	FROM Adjustment ADJ
	INNER JOIN #AgreementItems AI
		ON AI.[Item_Cd] = ADJ.HMISItemCode
	WHERE isnull(AI.OnePortalLinkContract_ItemHelperItemType, '') = 'Discount'
	
	
	DECLARE @total_adjustment DECIMAL(10,2) 
	
	SELECT @total_adjustment = SUM(AI.unitprice)
	FROM #Agreement A 
	INNER JOIN #AgreementAdjustment AI 
		ON A.agreementId = AI.AgreementId
		
	SET @total_adjustment = ISNULL(@total_adjustment, 0.00)
	-- Update purchase and tax information of agreement
	
	UPDATE A 
	SET A.totalPurchasePrice = A.totalprice + A.TotalTax,
		A.totalCashPrice = A.totalprice + A.TotalTax - @total_adjustment,
		A.TotalAdjustment = @total_adjustment
	FROM #Agreement A

	--calculate the tax for Insert_AgreementItemPrice_Data
	--find the tax percent based on tax item on same contract, tax items are in  marked as [One.LinkContract_ItemHelper.ItemType]='Tax'
	/*SELECT @tax_pct = isnull(([h_000.Item.Tax_Pct] / 100), 0),
		@taxhmis_Sales_Item_IDlist = @taxhmis_Sales_Item_IDlist + ' ' + ltrim(convert(VARCHAR(10), [h_000.Sales_Item.Sales_Item_ID])) --collect the IDs
		,
		@tax_hmis_itemcodelist = @tax_hmis_itemcodelist + ' ' + ltrim(convert(VARCHAR(10), [h_000.Item.Item_Cd])) --collect the codes
	FROM #AgreementItems
	WHERE [One.LinkContract_ItemHelper.ItemType] = 'Tax'*/
	--update tax columns using calculated @tax_pct
	/*IF @tax_pct > 0
	BEGIN
		UPDATE #AgreementItems
		SET unitTax = round(isnull(@tax_pct, 0) * [h_000.Item.Taxable] * totalPrice, 2) --[totalTax] --summary item tax based on Item.tax_pct ?
			,
			totalTax = round(isnull(@tax_pct, 0) * [h_000.Item.Taxable] * totalPrice, 2)
	END*/
	/**** CREATE ADDITIONAL FAKE RECORD FOR AGREEMENT PACKAGE THAT WILL BE INSERTED IN AgreementItemPrice TABLE *****/
	INSERT INTO #AgreementItems (
		ItemCode,
		ItemDescription,
		Item_Cd,
		FuneralItemId,
		FuneralItemLocationId,
		Product_Item_CD,
		ProductItemCode,
		ProductItemLocationCode,
		Item_Cd_desc,
		Update_User_ID,
		ItemDescr,
		OnePortalItemId,
		OnePortalItemCode,
		OnePortalItemName,
		OnePortalItemCategoryId,
		OnePortalItemCategoryName,
		OnePortalLinkContract_ItemHelperItemType,
		OnePortalLocationItemId,
		OnePortalLocationCode,
		OnePortalLocationId,
		CreatedBy,
		UpdatedBy,
		CreatedAt,
		UpdatedAt,
		OnePortalAgreementItemPriceID,
		OnePortalAgreementLocationItemID,
		OnePortalAgreementCashAdvancedItemID,
		OnePortalAgreementPackageID,
		OnePortalAgreementPackageItemID,
		OnePortalPackageId,
		OnePortalAgreementAdjustmentID,
		OnePortalAgreementFuneralPortalLogID,
		OnePortalAgreementMamorialId,
		OnePortalAgreementMamorialItemId,
		OnePortalAgreementCemeteryPortalLogId,
		TxnLineId,
		TxnId,
		Sales_Item_ID,
		Lot_Sell_Unit_ID,
		Quantity,
		UnitPrice,
		UnitTax,
		TotalPrice,
		TotalTax,
		EndowmentCareFund,
		Tax_Pct,
		Taxable,
		SalesItemAmountPaid,
		SalesItemDiscount,
		AgreementID,
		SalesContractNbr,
		SalesFinanceId,
		SalesFinanceSalesTax,
		SQLSP,
		AgreementCemPortalLogID,
		IsHMISItemActive,
		PackageItemCode,
		PackageName,
		PackageCode,
		CaseID,
		TransactionID,
		TransactionlineId,
		TransactionlineUpdateUser,
		IsFinanceCharge,
		IsIntermentRight,
		Sales_ID,
		salesDeliveryDate,
		IsAdjustment,
		ItemUsedStatus,
		DecedentId,
		ItemUsageResourceType,
		ItemUsageResourceId,
		IsItemPriceInsert,
		IsAgreementCashAdvancedItem,
		IntermentRightPropertyId,
		OnePortalmemorialTypeAttributeValueId,
		IsAgreementLocationItem,
		IsAgreementPackage,
		IsAgreementPackageItem
		)
	SELECT '' AS ItemCode,
		'Package Level Fake Record' AS ItemDescription,
		'' AS Item_Cd,
		0 AS FuneralItemId,
		0 AS FuneralItemLocationId,
		'' AS Product_Item_CD,
		'' AS ProductItemCode,
		'' AS ProductItemLocationCode,
		'' AS Item_Cd_desc,
		0 AS Update_User_ID,
		'' AS ItemDescr,
		NULL AS OnePortalItemId,
		NULL AS OnePortalItemCode,
		NULL AS OnePortalItemName,
		NULL AS OnePortalItemCategoryId,
		NULL AS OnePortalItemCategoryName,
		NULL AS OnePortalLinkContract_ItemHelperItemType,
		NULL AS OnePortalLocationItemId,
		NULL AS OnePortalLocationCode,
		NULL AS OnePortalLocationId,
		MAX(CreatedBy) AS CreatedBy,
		MAX(UpdatedBy) AS UpdatedBy,
		MAX(CreatedAt) AS CreatedAt,
		MAX(UpdatedAt) AS UpdatedAt,
		NULL AS OnePortalAgreementItemPriceID,
		NULL AS OnePortalAgreementLocationItemID,
		NULL AS OnePortalAgreementCashAdvancedItemID,
		NULL AS OnePortalAgreementPackageID,
		NULL AS OnePortalAgreementPackageItemID,
		MAX(OnePortalPackageId) AS OnePortalPackageId,
		NULL AS OnePortalAgreementAdjustmentID,
		MAX(OnePortalAgreementFuneralPortalLogID) AS OnePortalAgreementFuneralPortalLogID,
		NULL AS OnePortalAgreementMamorialId,
		NULL AS OnePortalAgreementMamorialItemId,
		NULL AS OnePortalAgreementCemeteryPortalLogId,
		NULL AS TxnLineId,
		NULL AS TxnId,
		0 AS Sales_Item_ID,
		NULL AS Lot_Sell_Unit_ID,
		1 AS Quantity,
		SUM(UnitPrice) AS UnitPrice,
		SUM(UnitTax) AS UnitTax,
		SUM(TotalPrice) AS TotalPrice,
		SUM(TotalTax) AS TotalTax,
		NULL AS EndowmentCareFund,
		0 AS Tax_Pct,
		0 AS Taxable,
		0 AS SalesItemAmountPaid,
		0 AS SalesItemDiscount,
		MAX(AgreementID) AS AgreementID,
		'' AS SalesContractNbr,
		MAX(SalesFinanceId) AS SalesFinanceId,
		0 AS SalesFinanceSalesTax,
		MAX(SQLSP),
		NULL AS AgreementCemPortalLogID,
		1 AS IsHMISItemActive,
		'' AS PackageItemCode,
		MAX(PackageName) AS PackageName,
		MAX(PackageCode) AS PackageCode,
		MAX(CaseID) AS CaseID,
		MAX(TransactionID) AS TransactionID,
		-1 AS TransactionlineId,
		NULL AS TransactionlineUpdateUser,
		NULL AS IsFinanceCharge,
		NULL AS IsIntermentRight,
		MAX(Sales_ID) AS Sales_ID,
		MAX(salesDeliveryDate) AS salesDeliveryDate,
		NULL AS IsAdjustment,
		NULL AS ItemUsedStatus,
		NULL AS DecedentId,
		NULL AS ItemUsageResourceType,
		NULL AS ItemUsageResourceId,
		1 AS IsItemPriceInsert,
		0 AS IsAgreementCashAdvancedItem,
		NULL AS IntermentRightPropertyId,
		NULL AS OnePortalmemorialTypeAttributeValueId,
		0 AS IsAgreementLocationItem,
		1 AS IsAgreementPackage,
		0 AS IsAgreementPackageItem
	FROM #AgreementItems
	WHERE OnePortalPackageId IS NOT NULL
	GROUP BY AgreementID,
		OnePortalPackageId

	--update #AgreementItems with Oneportal data
	--missing items will have nulls and -1's
	UPDATE AI
	SET OnePortalAgreementLocationItemId = FCIL.AgreementLocationItemID,
		OnePortalAgreementItemPriceId = FCIL.AgreementItemPriceID,
		OnePortalAgreementCashAdvancedItemID = FCIL.AgreementCashAdvancedItemID,
		OnePortalAgreementPackageID = FCIL.AgreementPackageID,
		OnePortalAgreementPackageItemID = FCIL.AgreementPackageItemID,
		OnePortalAgreementAdjustmentID = FCIL.AgreementAdjustmentID
	FROM #AgreementItems AI
	JOIN FuneralContractItemsLog FCIL
		ON FCIL.OldTransactionlineId = AI.TransactionlineId
			AND FCIL.AgreementID = AI.AgreementID

	--insert rows into AgreementItemPrice based on #AgreementItems, it fills the clumn [One.AgreementItemPrice.id], cursor inside
	EXEC dbo.Insert_AgreementItemPrice_Data @isCemportal = 0

	--insert AgreementLocationItem rows based on #AgreementItems, with already filled [One.AgreementItemPrice.id]
	--excluded: Packages, Package Item, Tax, Discount, Cashback
	EXEC dbo.Insert_AgreementLocationItem_Data

	--insert AgreementCashAdvancedItem rows based on #AgreementItems, with already filled [One.AgreementItemPrice.id]
	EXEC Insert_AgreementCashAdvancedItem_Data

	--insert AgreementPackage rows based on #AgreementItems, with already filled [One.AgreementItemPrice.id]
	EXEC Insert_Agreement_DataPackage

	--insert AgreementPackageItem rows based on #AgreementItems
	EXEC Insert_AgreementPackageItem_Data

	--insert AgreementAdjustment rows based on #AgreementItems
	--H_000 discounts go here, no [One.AgreementItemPrice.id] in this case
	EXEC Insert_AgreementAdjustment_Data @isCemportal = 0

	--insert all the Agreement's lines from all the source agreement lines, 
	--abowe procedures are not inserting to this logtable
	INSERT INTO [FuneralContractItemsLog] (
		AgreementID,
		AgreementFuneralPortalLogId,
		OldCaseId,
		OldTransactionId,
		OldTransactionLineId,
		OldItemCode,
		HMISItemCode,
		ReplacedItemCode,
		HMISSalesItemID,
		NewItemId,
		AgreementLocationItemID,
		AgreementCashAdvancedItemID,
		AgreementPackageID,
		AgreementPackageItemID,
		AgreementItemPriceID,
		AgreementAdjustmentID,
		IsHMISItemActive,
		IsAdjustment,
		[Message],
		CreatedAt,
		CreatedBy,
		SP
		)
	SELECT AI.AgreementID,
		AI.OnePortalAgreementFuneralPortalLogID,
		AI.CaseId,
		AI.TransactionId,
		AI.TransactionLineId,
		AI.ItemCode,
		AI.Product_Item_CD,
		AI.ReplacedItemCode,
		AI.Sales_Item_ID,
		AI.OnePortalItemId,
		AI.OnePortalAgreementLocationItemId,
		AI.OnePortalAgreementCashAdvancedItemID,
		AI.OnePortalAgreementPackageID,
		AI.OnePortalAgreementPackageItemID,
		AI.OnePortalAgreementItemPriceId,
		AI.OnePortalAgreementAdjustmentId,
		AI.IsHMISItemActive,
		AI.IsAdjustment,
		NULL,
		AI.createdAt,
		AI.createdBy,
		AI.SQLSP
	FROM #AgreementItems AI
	INNER JOIN #Agreement A
		ON AI.AgreementId = A.AgreementId
	WHERE NOT EXISTS (
			SELECT 1
			FROM [FuneralContractItemsLog] F
			WHERE F.OldTransactionLineId = AI.TransactionLineId
				AND F.AgreementID = AI.AgreementID
			)
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
