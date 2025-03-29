'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    IF object_id('[AgreementTypes]') IS NOT NULL
	DROP TABLE AgreementTypes


CREATE TABLE [dbo].[AgreementTypes] (
	[ID] INT IDENTITY(1, 1) NOT NULL,
	[Type] NVARCHAR(10) NULL
	) ON [PRIMARY]


INSERT INTO AgreementTypes (Type)
SELECT 'funeral'

INSERT INTO AgreementTypes (Type)
SELECT 'cemetery'


IF object_id('[AgreementNeedTypes]') IS NOT NULL
	DROP TABLE [AgreementNeedTypes]

CREATE TABLE [dbo].[AgreementNeedTypes] (
	[ID] INT IDENTITY(1, 1) NOT NULL,
	[Type] NVARCHAR(10) NULL
	) ON [PRIMARY]

INSERT INTO AgreementNeedTypes (Type)
SELECT 'AN'

INSERT INTO AgreementNeedTypes (Type)
SELECT 'PN'


IF object_id('ImportContractDataLog') IS NOT NULL
	DROP TABLE ImportContractDataLog

CREATE TABLE ImportContractDataLog (
	ContractNumber VARCHAR(50) NULL,
	Sales_Id INT NULL,
	Sales_Finance_id INT NULL,
	TxnId INT NULL,
	TxnLineId INT NULL,
	agreementid INT NULL,
	caseid INT NULL,
	ContractType VARCHAR(10) NULL,
	[message] VARCHAR(1000) NULL,
	[CreatedAt] [datetime] DEFAULT(getdate()),
	[SP] VARCHAR(1000) NULL DEFAULT(object_name(@@PROCID)),
	ID INT identity(1, 1)
	)


IF object_id('LinkContract_ItemHelper') IS NOT NULL
	DROP TABLE LinkContract_ItemHelper

CREATE TABLE LinkContract_ItemHelper (
	ID INT identity(1, 1),
	ItemCode NVARCHAR(20),
	ItemType NVARCHAR(20) -- Tax, Discount, {add next}
	,
	Description NVARCHAR(1000),
	crdate DATETIME DEFAULT(getdate()),
	cruser NVARCHAR(20) DEFAULT(suser_sname())
	)

INSERT INTO LinkContract_ItemHelper (
	ItemCode,
	Description,
	ItemType
	)
SELECT i.item_cd,
	i.Descr,
	'Tax'
FROM h_000.dbo.Item I
INNER JOIN h_000.dbo.Item_Type IT
	ON I.Item_Type_Cd = IT.Item_Type_Cd
		AND IT.Item_Type_Cd = 'T'

INSERT INTO LinkContract_ItemHelper (
	ItemCode,
	Description,
	ItemType
	)
SELECT Item_cd,
	Descr,
	'Discount'
FROM h_000..Item
WHERE Item_Report_Category_Cd IN (
		SELECT Item_Report_Category_Cd
		FROM h_000..Item_Report_Category
		WHERE Descr LIKE '%DISCOUNT%'
		)


if object_id('LinkContract_PackageItems') is not null
    drop table LinkContract_PackageItems


CREATE TABLE [dbo].[LinkContract_PackageItems](
    ID int identity(1,1),
	[PackageCode] [nvarchar](50) NULL,
	[PackageName] [nvarchar](50) NULL,
	[ItemCode] [nvarchar](20) NOT NULL,
	[Itemdescription] [nvarchar](max) NULL,
    [crdate] datetime default(getdate())
) 


insert into LinkContract_PackageItems([PackageCode], [PackageName], [ItemCode], [Itemdescription])
select distinct p.CODE packageCode, p.name PackageName, i.code ItemCode, i.description Itemdescription
from funportal_local.dbo.PackageLocationService PLS 
INNER JOIN  funportal_local.dbo.Item i ON I.ID = PLS.itemId
Inner JOIN funportal_local.dbo.PACKAGE P ON PLS.packageId = P.ID


CREATE TABLE SalesCounselorLog(
	Id INT NOT NULL IDENTITY(1,1),
	Name NVARCHAR(MAX),
	CallId INT,
	SalesCounselorId INT
	CONSTRAINT PK_SalesCounselorLogId PRIMARY KEY (Id)
)

CREATE TABLE OrganizationLog(
	NewId INT NOT NULL,
	OldId INT,
	OldCemFuneralHomeId INT,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	CONSTRAINT PK_NewOrgId PRIMARY KEY (NewId)
)

CREATE TABLE OrganizationResidenceAddressLog(
	NewId INT NOT NULL,
	OldId INT NOT NULL,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	CONSTRAINT PK_OrganizationResidenceAddressLogId PRIMARY KEY (NewId) 
)

CREATE TABLE AddressCemPortalLog(
	Id INT NOT NULL IDENTITY(1,1),
	AddressId INT NOT NULL,
	OldAddressId INT NOT NULL,
	CheckCity BIT,
	CheckCounty BIT,
	CheckState BIT,
	CheckCountry BIT,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	CONSTRAINT PK_ADDRESSCEMPORTALLOGID PRIMARY KEY (Id) 
)

CREATE TABLE AddressFuneralPortalLog(
	Id INT NOT NULL IDENTITY(1,1),
	AddressId INT NOT NULL,
	OldAddressId INT NOT NULL,
	CheckCity BIT,
	CheckCounty BIT,
	CheckState BIT,
	CheckCountry BIT,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	CONSTRAINT PK_ADDRESSFUNERALPORTALLOGID PRIMARY KEY (Id) 
)

CREATE TABLE [dbo].[AddressHMISPortalLog](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[AddressId] [int] NOT NULL,
	[Name_ID] [int] NOT NULL,
	[person_logID] [int] NULL,
	[CheckCity] [bit] NULL,
	[CheckCounty] [bit] NULL,
	[CheckState] [bit] NULL,
	[CheckCountry] [bit] NULL,
	[createdAt] [datetime] NULL,
	[createdBy] [varchar](50) NULL,
	[SP] [varchar](1000) NULL
	CONSTRAINT PK_AddressHMISPortalLog PRIMARY KEY (Id) 
)

CREATE TABLE LocationLog(
	NewId INT NOT NULL,
	OldId INT NOT NULL,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	CONSTRAINT PK_NewLocationId PRIMARY KEY (NewId)
)

CREATE TABLE EthnicityLog(
	NewID INT NOT NULL,
	OldId INT NOT NULL,
	CONSTRAINT PK_ETHNICITYLOG_NEWID PRIMARY KEY(NewID)
)

CREATE TABLE RaceLog(
	NewID INT NOT NULL,
	OldId INT NOT NULL,
	CONSTRAINT PK_RACELOG_NEWID PRIMARY KEY(NewID)
)

CREATE TABLE CallCemPortalLog(
	Id INT NOT NULL IDENTITY(1,1),
	CallId INT,
	OldArrangementId INT NOT NULL,
	OldTxnId INT,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	IsImportContactsCompleted BIT,
	CONSTRAINT PK_ID PRIMARY KEY (ID))

CREATE TABLE CallFuneralPortalLog(
	ID INT NOT NULL IDENTITY(1,1),
	CallId INT,
	OldCaseID INT NOT NULL,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	IsImportContactsCompleted BIT,
	IsEthnicityImported BIT,
	IsCallerMapped BIT,
	CONSTRAINT PK_CallFuneralPortalLog_ID PRIMARY KEY (ID))

CREATE TABLE PersonCemportalLog(
	NewPersonId INT NOT NULL,
	OldPersonId INT NOT NULL,
	OldPersonRelationId INT,
	CONSTRAINT PK_PersonLogCemportal PRIMARY KEY (NewPersonId)
)

CREATE TABLE PersonFuneralportalLog(
	NewPersonId INT NOT NULL,
	OldPersonId INT NOT NULL,
	OldCasePersonId INT,
	OldCasePersonOrganizationId INT,
	CONSTRAINT PK_PersonLogFuneralportal PRIMARY KEY (NewPersonId)
)

CREATE TABLE ContactCemportalLog(
	ID INT NOT NULL IDENTITY(1,1),
	NewPersonId INT,
	CallId INT,
	OldPersonRelationId INT NOT NULL,
	OldPersonId INT NOT NULL,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	CONSTRAINT PK_ContactLogCemportal PRIMARY KEY (ID)
)

CREATE TABLE ContactFuneralportalLog(
	Id INT NOT NULL IDENTITY(1,1),
	NewPersonId INT,
	CallId INT,
	OldCasePersonId INT NOT NULL,
	OldPersonId INT NOT NULL,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	CONSTRAINT PK_ContactLogFuneralportal PRIMARY KEY (Id)
)

CREATE TABLE ContactOrganizationPersonLog(
	Id INT NOT NULL IDENTITY(1,1),
	NewPersonId INT,
	CallId INT,
	OldPersonId INT NOT NULL,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	CONSTRAINT PK_ContactLogOrganizationPerson PRIMARY KEY (Id)
)

CREATE TABLE CertifierLog(
	Id INT NOT NULL IDENTITY(1,1),
	CertifierId INT,
	PersonId INT NOT NULL,
	MedicalExaminerId INT NOT NULL,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	CONSTRAINT PK_Certifier PRIMARY KEY (Id)
)

CREATE TABLE PersonAnRemainsInfoLog(
	Id INT NOT NULL IDENTITY(1,1),
	NewPersonAnRemainsInfoId INT,
	OldRemainsId INT NOT NULL,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	CONSTRAINT PK_AnRemainsInfoLogId PRIMARY KEY (Id)
)

CREATE TABLE PersonEthnicityLog(
	ID INT NOT NULL IDENTITY(1,1),
	NewID INT,
	PersonId INT,
	OldPersonId INT NOT NULL,
	OldId INT NOT NULL,
	CONSTRAINT PK_PersonEthnicityLog_NEWID PRIMARY KEY(ID)
)

CREATE TABLE PurchaserPayorPersonCemPortalLog(
	Id INT NOT NULL IDENTITY(1,1),
	PersonId INT,
	CallId INT,
	AgreementId INT,
	OldArrangmentId INT NULL,
	OldPersonRelationId INT NOT NULL,
	OldTxnId INT NOT NULL,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	CONSTRAINT PK_PURCHASERPAYORPERSONCEMPORTALLOG_ID PRIMARY KEY (Id)
)

CREATE TABLE PurchaserPayorPersonCemSyncedPortalLog(
	Id INT NOT NULL IDENTITY(1,1),
	PersonId INT,
	CallId INT,
	AgreementId INT,
	OldArrangmentId INT NULL,
	OldPersonRelationId INT NOT NULL,
	OldTxnId INT NOT NULL,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	CONSTRAINT PK_PurchaserPayorPersonCemSyncedPortalLog_ID PRIMARY KEY (Id)
)

CREATE TABLE PurchaserPayorPersonFuneralPortalLog(
	Id INT NOT NULL IDENTITY(1,1),
	PersonId INT,
	CallId INT,
	AgreementId INT,
	OldCaseId INT NOT NULL,
	OldCasePersonId INT NOT NULL,
	OldPersonId INT NOT NULL,
	IsPersonCreated BIT NOT NULL,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	CONSTRAINT PK_PURCHASERPAYORPERSONFUNERALPORTALLOG_ID PRIMARY KEY (Id)
)


CREATE TABLE ArrangementFuneralPortalLog(
	ID INT NOT NULL IDENTITY(1,1),
	NewID INT,
	CallId INT,
	OldCaseId INT NOT NULL,
	PersonId INT,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	CONSTRAINT PK_ArrangementLog_NEWID PRIMARY KEY(ID)
)

CREATE TABLE ArrangementCemPortalLog(
	ID INT NOT NULL IDENTITY(1,1),
	NewID INT,
	CallId INT,
	OldArrangementId INT NOT NULL,
	PersonId INT,
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	CONSTRAINT PK_ARRANGEMENCEMPORTALTLOG_NEWID PRIMARY KEY(ID)
)

CREATE TABLE AgreementCemPortalLog(
	ID INT NOT NULL IDENTITY(1,1),
	AgreementId INT,
	OldArrangementId INT,
	OldTxnId INT,
	Sales_Id INT,
	Sales_Finance_Id INT,
	OnePortalEmployeeId INT,
	Sales_Counselor_Id INT,
	ContractNumber NVARCHAR(100),
	TxnId INT,
	Message NVARCHAR(500),
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	MapData INT,
	CONSTRAINT PK_AgreementCemPortalLog_ID PRIMARY KEY(ID)
)

-- DROP TABLE AgreementHMISLog
-- CREATE TABLE AgreementHMISLog(
-- 	ID INT NOT NULL IDENTITY(1,1),
-- 	AgreementId INT,
-- 	SalesId INT NOT NULL,
-- 	SalesFinanceId INT,
-- 	OnePortalEmployeeId INT,
-- 	SalesCounselorId INT,
-- 	StartDateTime DATETIME NOT NULL,
-- 	StopDateTime DATETIME NOT NULL,
-- 	CONSTRAINT PK_AgreementHMISLog_ID PRIMARY KEY(ID)
-- )
-- 
CREATE TABLE PersonAgreementHMISLog(
	ID INT NOT NULL IDENTITY(1,1),
	PersonId INT,
	OldPersonId INT,
	OnePortalPersonVerificationDetailsId INT,
	RoleDesc NVARCHAR(100),
	HMISRoleDesc NVARCHAR(100),
	AgreementId INT,
	AgreementPersonId INT,
	Message NVARCHAR(100),
	Portal NVARCHAR(50),
	CONSTRAINT PK_PersonAgreementHMISLog_ID PRIMARY KEY(ID)
)

CREATE TABLE PurchaserAgreementCemPortalLog(
	ID INT NOT NULL IDENTITY(1,1),
	PersonId INT,
	RoleDesc NVARCHAR(100),
	AgreementCemPortalId INT,
	CONSTRAINT PK_PurchaserAgreementCemPortalLog_ID PRIMARY KEY(ID)
)

CREATE TABLE AgreementFuneralPortalLog(
	ID INT NOT NULL IDENTITY(1,1),
	AgreementId INT,
	OldCaseId INT NOT NULL,
	OldTransactionId INT,
	Sales_Id INT NULL,
	Sales_Finance_Id INT,
	ContractNumber NVARCHAR(100) NULL,
	Message NVARCHAR(500),
	StartDateTime DATETIME NOT NULL,
	StopDateTime DATETIME NOT NULL,
	MapData BIT,
	CONSTRAINT PK_AgreementFuneralPortalLog_ID PRIMARY KEY(ID)
)

CREATE TABLE PurchaserAgreementFuneralPortalLog(
	ID INT NOT NULL IDENTITY(1,1),
	PersonId INT,
	RoleDesc NVARCHAR(100),
	AgreementFuneralPortalId INT,
	CONSTRAINT PK_PurchaserAgreementFuneralPortalLog_ID PRIMARY KEY(ID)
)

CREATE TABLE AdjustmentLog(
	id INT NOT NULL IDENTITY(1,1),
	adjustmentId INT,
	hmisItemCD NVARCHAR(100),
	CONSTRAINT PK_AdjustmentLog_ID PRIMARY KEY(ID)
)

CREATE TABLE OnePortalValidFuneralContracts(
	id INT NOT NULL IDENTITY(1,1),
	caseId INT, -- Funeral portal ID
	contractNbr NVARCHAR(100),
	salesId INT,
	salesFinanceId INT
	CONSTRAINT PK_OnePortalValidFuneralContracts_ID PRIMARY KEY(ID)
)

CREATE TABLE [dbo].[CemeteryContractItemsLog] (
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED  ( [id] ASC ) ,
    [AgreementID] [int] NOT NULL ,
	[AgreementCemPortalLogId] [int] NULL ,
	[ReplacedItemCode] varchar(50) NULL,
	[HMISItemCode] varchar(50) NULL, --h_000..Item has no ID column
    [HMISSalesItemID] int null,
	[TxnId] int null,
	[TxnLineId] int null,
	[TxnLineItemnumber] varchar(50) NULL,
	[ItemId] [int] NULL ,
    [AgreementLocationItemID] int,
	[AgreementPropertyID] int,
	[AgreementAdjustmentID] int,
    [AgreementItemPriceID] int,
	[AgreementMemorialId] INT,
	[AgreementMemorialItemId] INT,
	AgreementAdditionalRightId INT,
	LotSellUnitID INT,
	LotSpaceID INT,
	IsAdditionalRight BIT,
	IsHMISItemActive BIT,
	IsPropertyItem bit,
	IsEndowmentCareFund bit,
	EndowmentCareFund DECIMAL(10,2),
	IsAdjustment bit,
	IsMemorial BIT,
	calculatedTaxPercentage DECIMAL(10,2),
    [Message] nvarchar(200) NULL,
	[createdAt] [datetime] NULL DEFAULT (getdate()) ,
	[createdBy] [varchar](50) NULL ,
    [SP] varchar(1000) null default object_name(@@PROCID)
)

CREATE TABLE CemeteryContractAdjustmentLog (
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED  ( [id] ASC ) ,
	[AgreementID] [int] NOT NULL,
	AgreementAdjustmentID INT,
	Sales_Adjustment_Id INT
)


CREATE TABLE FuneralContractAdjustmentLog (
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED  ( [id] ASC ) ,
	[AgreementID] [int] NOT NULL,
	AgreementAdjustmentID INT,
	Sales_Adjustment_Id INT
)


CREATE TABLE [dbo].[FuneralContractItemsLog] (
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED  ( [id] ASC ) ,
    [AgreementID] [int] NOT NULL,
	[AgreementFuneralPortalLogId] [int] NULL,
	[OldCaseId] INT NULL,
	[OldTransactionId] INT NULL,
	[OldTransactionLineId] INT NULL,
	[OldItemCode] varchar(50) NULL,
	[ReplacedItemCode] varchar(50) NULL,
	[HMISItemCode] varchar(50) NULL, --h_000..Item has no ID column
    [HMISSalesItemID] int NULL,
	[NewItemId] [int] NULL ,
    [AgreementLocationItemID] int ,
    [AgreementCashAdvancedItemID] int,
	[AgreementPackageID] int,
    [AgreementPackageItemID] int,
    [AgreementItemPriceID] int,
	[AgreementAdjustmentID] int,
	[IsHMISItemActive] BIT,
	[IsAdjustment] BIT,
    [Message] nvarchar(200) NULL,
	[createdAt] [datetime] NULL DEFAULT (getdate()) ,
	[createdBy] [varchar](50) NULL ,
    [SP] varchar(1000) null default object_name(@@PROCID)
)


CREATE TABLE [DBO].[CemeteryPaymentLog](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED  ( [id] ASC ),
	[AgreementID] INT,
	PaymentId INT,
	PayorId INT,
	[HMISSalesId] INT,
	[HmisPaymentId] INT,
	[HMISCashReceiptReferenceNbr] NVARCHAR(30),
	[HMISCashReceiptCashReceiptNBR] NVARCHAR(30),
	[HMISSalesDownPymtReceiptNbr] NVARCHAR(30),
	[HMISSalesCashReceiptID] INT,
	[HMISSalesDownPymtSalesCashApplicationId] INT,
	HMISSalesCashApplicationID INT,
	[HMISCashReceiptAmt] INT,
	[HMISSalesDownPymtSalesDownPymtId] INT,
	[cemeteryTxnId] INT,
	[cemeteryPaymentId] INT,
	IsFinanceOption BIT,
	AgreementFinanceId INT,
	FinanceStartDate DATE
)


CREATE TABLE [DBO].[FuneralPaymentLog](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED  ( [id] ASC ),
	[AgreementID] INT,
	[PaymentId] INT,
	[PayorId] INT,
	[AnticipatedPaymentId] INT,
	[HMISSalesId] INT,
	[HmisPaymentId] INT,
	[HMISCashReceiptReferenceNbr] NVARCHAR(30),
	[HMISCashReceiptCashReceiptNBR] NVARCHAR(30),
	[HMISSalesDownPymtReceiptNbr] NVARCHAR(30),
	[HMISSalesCashReceiptID] INT,
	[HMISSalesDownPymtSalesCashApplicationId] INT,
	HMISSalesCashApplicationID INT,
	[HMISCashReceiptAmt] INT,
	[HMISSalesDownPymtSalesDownPymtId] INT,
	[FuneralCaseId] INT,
	[FuneralPaymentId] INT,
	[IsFinanceOption] BIT,
	[AgreementFinanceId] INT,
	[FinanceStartDate] DATE
)


CREATE TABLE [DBO].[FinanceScheduleLog](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED  ( [id] ASC ),
	AgreementFinanceId INT,
	CemeteryPaymentLogId INT,
	AgreementFinanceScheduleId INT
)


CREATE TABLE [DBO].[SchedulingCemeteryWorkOrderLog](
    [id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED  ( [id] ASC ),
	ArrangementId INT,
    PersonId INT,
	PropertyId INT,
	TxnId INT,
    TxnLineId INT,
    TxnLineItemnumber varchar(50),
    CemWorkOrderId INT,
	funeralHomeId INT,  
    WorkOrderId INT,
    IsIntermentRight BIT,
    ISDisintermentRight BIT,
    IsCremationService BIT,
    IsCemeteryService BIT,
    ScheduledCemeteryServiceId INT,
	ServiceItemUsageID INT,
	ServiceItemUsageResourceID INT,
    VaultTxnLineId INT,
    UrnTxnLineId INT,  
    CasketTxnLineId INT,
    intermentInformationSectionId INT,
    disintermentInfoSectionId INT,
    intermentRequestSectionId INT,
    vaultSectionId INT,
	VaultItemUsageID INT,
	VaultItemUsageResourceID INT,
    casketSectionId INT,
	CasketItemUsageID INT,
	CasketItemUsageResourceID INT,
    urnInformationSectionId INT,
	UrnItemUsageID INT,
	UrnItemUsageResourceID INT,
    merchandiseAdditionalInfoSectionId INT,
    genericSectionId INT,
    funeralArrangementSectionId INT,
	funeralArrangementSectionLocationId INT,
	clFacilityLocationId INT,
    serviceLocationId INT,
    funeralDirectorId INT,
    createdAt [datetime] DEFAULT(getdate()),
    updatedAt DATETIME,
	PropertyItemUsageResourceID INT,
	intermentPropertyId INT,
	DisIntermentPropertyId INT,
	PropertyItemUsageID INT,
	SchedulingCemeteryWorkOrderLog INT,
	CemeteryScheduledPropertyId INT
)


Create table MissingSyncedTxnlineSalesItem
(
    TxnlineId INT,
    Sales_item_id INT
)
INSERT INTO MissingSyncedTxnlineSalesItem (TxnlineId,Sales_item_id)
VALUES
(117577,30650237),
(10930,16039697),
(95009,28269188),
(54740,23517120),
(95010,28269227),
(73578,25503484),
(115146,30359315),
(12783,18915463)



CREATE TABLE CemeteryPropertyOwnersLog
(
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED  ( [id] ASC ),
	[AgreementID] [int] NOT NULL,
	[Lot_Sell_Unit_ID] INT,
	[Name_ID] INT,
	[OnePortalAgreementPropertyOwnerId] INT,
	[OnePortalAgreementPropertyId] INT,
	[OnePortalPersonId] INT,
	[OnePortalAddressId] INT,
	[OnePortalPlaceId] INT,
	[OnePortalPersonVerificationDetailsId] INT,
	[OnePortalID] NVARCHAR(255),
	[SsnLastFour] NVARCHAR(255),
	[SsnSalt] NVARCHAR(255),
	[SsnEncrypted] NVARCHAR(255),
	[CreatedAt] [datetime] NULL DEFAULT (getdate())
	)


ALTER TABLE dbo.[CemeteryPropertyOwnersLog] ADD FOREIGN KEY ([AgreementID]) REFERENCES [dbo].[Agreement] ([id])
ALTER TABLE dbo.[CemeteryPropertyOwnersLog] ADD FOREIGN KEY ([OnePortalAgreementPropertyOwnerId]) REFERENCES [dbo].[AgreementPropertyOwner] ([id])
ALTER TABLE dbo.[CemeteryPropertyOwnersLog] ADD FOREIGN KEY ([OnePortalAgreementPropertyId]) REFERENCES [dbo].[AgreementProperty] ([id])
ALTER TABLE dbo.[CemeteryPropertyOwnersLog] ADD FOREIGN KEY ([OnePortalPersonId]) REFERENCES [dbo].[Person] ([id])
ALTER TABLE dbo.[CemeteryPropertyOwnersLog] ADD FOREIGN KEY ([OnePortalAddressId]) REFERENCES [dbo].[Address] ([id])
ALTER TABLE dbo.[CemeteryPropertyOwnersLog] ADD FOREIGN KEY ([OnePortalPlaceId]) REFERENCES [dbo].[Place] ([id])
ALTER TABLE dbo.[CemeteryPropertyOwnersLog] ADD FOREIGN KEY ([OnePortalPersonVerificationDetailsId]) REFERENCES [dbo].[PersonVerificationDetails] ([id])


CREATE TABLE MigrateCemeteryWorkOrder(
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED  ( [id] ASC ),
	CemeteryWorkOrderId INT
)


CREATE NONCLUSTERED INDEX IX_NonClusteredIndex_MigrateCemeteryWorkOrder_CemeteryWorkOrderId
ON MigrateCemeteryWorkOrder (CemeteryWorkOrderId)
WITH (FILLFACTOR=90) 


CREATE TABLE [DBO].[SchedulingCemeteryPurchaseOrderLog](
    [id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED  ( [id] ASC ),
	TxnId INT,
    TxnLineId INT,
	TxnLineItemnumber varchar(50),
	PersonId INT,
    CemPurchaseOrderId INT,  
    PurchaseOrderId INT,
    PurchaseOrderItemId INT,
	ItemUsageId INT,
    createdAt [datetime] DEFAULT(getdate()),
    updatedAt DATETIME 
)


CREATE TABLE MigrateCemeteryPurchaseOrder(
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED  ( [id] ASC ),
	CemeteryPurchaseOrderId INT
)


CREATE NONCLUSTERED INDEX IX_NonClusteredIndex_MigrateCemeteryPurchaseOrder_CemeteryPurchaseOrderId
ON MigrateCemeteryPurchaseOrder (CemeteryPurchaseOrderId)
WITH (FILLFACTOR=90) 


ALTER TABLE dbo.[SchedulingCemeteryWorkOrderLog] ADD FOREIGN KEY ([WorkOrderId]) REFERENCES [dbo].[WorkOrder] ([id])
ALTER TABLE dbo.[SchedulingCemeteryWorkOrderLog] ADD FOREIGN KEY ([ScheduledCemeteryServiceId]) REFERENCES [dbo].[ScheduledCemeteryService] ([id])
ALTER TABLE dbo.[SchedulingCemeteryWorkOrderLog] ADD FOREIGN KEY ([intermentInformationSectionId]) REFERENCES [dbo].[intermentInformationSection] ([id])
ALTER TABLE dbo.[SchedulingCemeteryWorkOrderLog] ADD FOREIGN KEY ([disintermentInfoSectionId]) REFERENCES [dbo].[disintermentInfoSection] ([id])
ALTER TABLE dbo.[SchedulingCemeteryWorkOrderLog] ADD FOREIGN KEY ([intermentRequestSectionId]) REFERENCES [dbo].[intermentRequestSection] ([id])
ALTER TABLE dbo.[SchedulingCemeteryWorkOrderLog] ADD FOREIGN KEY ([vaultSectionId]) REFERENCES [dbo].[vaultSection] ([id])
ALTER TABLE dbo.[SchedulingCemeteryWorkOrderLog] ADD FOREIGN KEY ([casketSectionId]) REFERENCES [dbo].[casketSection] ([id])
ALTER TABLE dbo.[SchedulingCemeteryWorkOrderLog] ADD FOREIGN KEY ([urnInformationSectionId]) REFERENCES [dbo].[urnInformationSection] ([id])
ALTER TABLE dbo.[SchedulingCemeteryWorkOrderLog] ADD FOREIGN KEY ([merchandiseAdditionalInfoSectionId]) REFERENCES [dbo].[merchandiseAdditionalInfoSection] ([id])
ALTER TABLE dbo.[SchedulingCemeteryWorkOrderLog] ADD FOREIGN KEY ([genericSectionId]) REFERENCES [dbo].[genericSection] ([id])
ALTER TABLE dbo.[SchedulingCemeteryWorkOrderLog] ADD FOREIGN KEY ([funeralArrangementSectionId]) REFERENCES [dbo].[funeralArrangementSection] ([id])


ALTER TABLE dbo.[SchedulingCemeteryPurchaseOrderLog] ADD FOREIGN KEY ([PurchaseOrderId]) REFERENCES [dbo].[PurchaseOrder] ([id])
ALTER TABLE dbo.[SchedulingCemeteryPurchaseOrderLog] ADD FOREIGN KEY ([PurchaseOrderItemId]) REFERENCES [dbo].[PurchaseOrderItem] ([id])

       
CREATE TABLE FuneralSchedulingLog (
	Id INT IDENTITY(1, 1) NOT NULL PRIMARY KEY CLUSTERED ([id] ASC),
	CaseId INT,
	TransactionLineID INT,
	FuneralWorkOrderId INT,
	ItemDescription NVARCHAR(255),
	ScheduledFuneralServiceId INT,
	SchedulingSectionId INT,
	CasketSectionId INT,
	CemeteryInformationSectionId INT,
	ResourceSectionId INT,
	WorkOrderId INT,
	WorkOrderOwnerId INT,
	CasketId INT,
	CrematoryID INT
	)


ALTER TABLE dbo.[FuneralSchedulingLog] ADD FOREIGN KEY ([ScheduledFuneralServiceId]) REFERENCES [dbo].[ScheduledFuneralService] ([id])
ALTER TABLE dbo.[FuneralSchedulingLog] ADD FOREIGN KEY ([SchedulingSectionId]) REFERENCES [dbo].[SchedulingSection] ([id])
ALTER TABLE dbo.[FuneralSchedulingLog] ADD FOREIGN KEY ([CasketSectionId]) REFERENCES [dbo].[CasketSection] ([id])
ALTER TABLE dbo.[FuneralSchedulingLog] ADD FOREIGN KEY ([CemeteryInformationSectionId]) REFERENCES [dbo].[CemeteryInformationSection] ([id])
ALTER TABLE dbo.[FuneralSchedulingLog] ADD FOREIGN KEY ([ResourceSectionId]) REFERENCES [dbo].[ResourceSection] ([id])
ALTER TABLE dbo.[FuneralSchedulingLog] ADD FOREIGN KEY ([WorkOrderId]) REFERENCES [dbo].[WorkOrder] ([id])
ALTER TABLE dbo.[FuneralSchedulingLog] ADD FOREIGN KEY ([WorkOrderOwnerId]) REFERENCES [dbo].[Employee] ([id])


CREATE TABLE [FuneralScheduledResourcesLog] (
	Id INT IDENTITY(1, 1) NOT NULL PRIMARY KEY CLUSTERED ([id] ASC),
	FuneralWorkOrderId INT,
	FuneralWorkOrderResourceId INT,
	ResourceTypeCode NVARCHAR(10),
	ResourceName NVARCHAR(255),
	ReservedResourceId INT,
	ResourceId INT
	)


ALTER TABLE dbo.[FuneralScheduledResourcesLog] ADD FOREIGN KEY ([ReservedResourceId]) REFERENCES [dbo].[ReservedResource] ([id])


CREATE TABLE FuneralEmployeeScheduleLog
(
	Id INT IDENTITY(1, 1) NOT NULL PRIMARY KEY CLUSTERED ([id] ASC),
	FuneralWorkOrderId INT,
	FuneralWorkOrderStaffId INT,
	FuneralPersonId INT,
	FuneralPersonName NVARCHAR(255),
	EmployeeScheduleId INT,
	EmployeeId INT,
	WorkOrderId INT,
	WorkOrderTaskId INT,
	ReservedResourceId INT,
	PersonContactId INT,
	ResourcePallbearerId INT,
	ResourceSectionId INT
)



ALTER TABLE dbo.[FuneralEmployeeScheduleLog] ADD FOREIGN KEY ([EmployeeScheduleId]) REFERENCES [dbo].[EmployeeSchedule] ([id])
ALTER TABLE dbo.[FuneralEmployeeScheduleLog] ADD FOREIGN KEY ([EmployeeId]) REFERENCES [dbo].[Employee] ([id])
ALTER TABLE dbo.[FuneralEmployeeScheduleLog] ADD FOREIGN KEY ([WorkOrderId]) REFERENCES [dbo].[WorkOrder] ([id])
ALTER TABLE dbo.[FuneralEmployeeScheduleLog] ADD FOREIGN KEY ([WorkOrderTaskId]) REFERENCES [dbo].[WorkOrderTask] ([id])
ALTER TABLE dbo.[FuneralEmployeeScheduleLog] ADD FOREIGN KEY ([ReservedResourceId]) REFERENCES [dbo].[ReservedResource] ([id])
ALTER TABLE dbo.[FuneralEmployeeScheduleLog] ADD FOREIGN KEY ([PersonContactId]) REFERENCES [dbo].[PersonContact] ([id])
ALTER TABLE dbo.[FuneralEmployeeScheduleLog] ADD FOREIGN KEY ([ResourcePallbearerId]) REFERENCES [dbo].[ResourcePallbearer] ([id])
ALTER TABLE dbo.[FuneralEmployeeScheduleLog] ADD FOREIGN KEY ([ResourceSectionId]) REFERENCES [dbo].[ResourceSection] ([id])

            
CREATE TABLE FuneralUrnInformationLog
(
	Id INT IDENTITY(1, 1) NOT NULL PRIMARY KEY CLUSTERED ([id] ASC),
	FuneralCaseId INT,
	FuneralWorkOrderId INT,
	UrnInformationSectionId INT,
	UrnId INT,
	ScheduledFuneralServiceId INT
)


ALTER TABLE dbo.[FuneralUrnInformationLog] ADD FOREIGN KEY ([UrnInformationSectionId]) REFERENCES [dbo].[UrnInformationSection] ([id])
ALTER TABLE dbo.[FuneralUrnInformationLog] ADD FOREIGN KEY ([UrnId]) REFERENCES [dbo].[AgreementLocationItem] ([id])
ALTER TABLE dbo.[FuneralUrnInformationLog] ADD FOREIGN KEY ([ScheduledFuneralServiceId]) REFERENCES [dbo].[ScheduledFuneralService] ([id])

			
IF object_id('ChapelLog') IS NOT NULL
	DROP TABLE ChapelLog


CREATE TABLE ChapelLog (
	OldChapelId INT,
	NewChapelId INT,
	Description NVARCHAR(255),
	CreateDate DATETIME
	)

INSERT INTO ChapelLog (
	OldChapelId,
	NewChapelId,
	Description,
	CreateDate
	)
SELECT R.ID AS OldChapelId,
	C.Id AS NewChapelId,
	C.Name AS Description,
	GETDATE() AS LoadDate
FROM funportal_local.dbo.Resource R
INNER JOIN funportal_local.dbo.ResourceType RT
	ON RT.ID = R.ResourceTypeId AND RT.Code = 'CHP'
INNER JOIN funportal_local.dbo.Location L
	ON L.Id = R.locationId
INNER JOIN Location OPL
	ON OPL.campus = L.campus
INNER JOIN Chapel C
	ON C.Name = R.Description
		AND C.locationId = OPL.Id



MERGE Vehicles AS TGT
USING (
	SELECT R.description AS Name,
		OPL.id AS LocationId,
		CASE RT.Code
			WHEN 'HRS'
				THEN 'hearse'
			WHEN 'UVH'
				THEN 'utilityCar'
			END AS type
	FROM funportal_local.dbo.Resource R
	INNER JOIN funportal_local.dbo.ResourceType RT
		ON RT.ID = R.ResourceTypeId
			AND RT.ID IN (3, 5)
	INNER JOIN funportal_local.dbo.Location L
		ON L.Id = R.locationId
	INNER JOIN Location OPL
		ON OPL.campus = L.campus
	) AS SRC
	ON TGT.Name = SRC.Name
		AND TGT.LocationId = SRC.LocationId
		AND TGT.Type = SRC.Type
WHEN NOT MATCHED
	THEN
		INSERT (
			Name,
			LocationId,
			Type
			)
		VALUES (
			SRC.Name,
			SRC.LocationId,
			SRC.Type
			);


IF object_id('VehicleLog') IS NOT NULL
	DROP TABLE VehicleLog


CREATE TABLE VehicleLog (
	OldVehicleId INT,
	NewVehicleId INT,
	Description NVARCHAR(255),
	CreateDate DATETIME
	)
	

INSERT INTO VehicleLog (
	OldVehicleId,
	NewVehicleId,
	Description,
	CreateDate
	)
SELECT R.ID AS OldVehicleId,
	V.Id AS NewVehicleId,
	V.Name AS Description,
	GETDATE() AS LoadDate
FROM funportal_local.dbo.Resource R
INNER JOIN funportal_local.dbo.ResourceType RT
	ON RT.ID = R.ResourceTypeId
		AND RT.Code IN ('HRS', 'UVH')
INNER JOIN funportal_local.dbo.Location L
	ON L.Id = R.locationId
INNER JOIN Location OPL
	ON OPL.campus = L.campus
INNER JOIN Vehicles V
	ON V.Name = R.Description
		AND V.locationId = OPL.Id


CREATE TABLE FuneralAdhocItemsLog(
	ID INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
	FuneralItemID INT,
	OnePortalItemCode NVARCHAR(255),
	LocationCode NVARCHAR(255)
)


CREATE TABLE [dbo].[DeceasedPropertyItemUsageCSV](
	agreement_id INT NULL,
	opid NVARCHAR(100) NULL,
	person_id INT NULL,
	first_name NVARCHAR(100) NULL,
	last_name NVARCHAR(100) NULL,
	lot_sell_unit_id INT NULL,
	lot_space_id INT NULL
) ON [PRIMARY]


CREATE TABLE [dbo].[DeceasedPropertyItemUsageCSV_log](
	[op_person_id] [int] NULL,
	[op_deceased_name] [nvarchar](200) NULL,
	[webcem_deceased_name] [nvarchar](200) NULL,
	[webcem_deceased_id] [int] NULL,
	[lsuid] [int] NULL,
	[lot_space_id] [int] NULL,
	[ls_id] [int] NULL,
	[iu_id] [int] NULL
) ON [PRIMARY]


CREATE TABLE [dbo].[CoOwnersCSV](
	[OwnerID] [int] NULL,
	[CoOwnerID] [int] NULL,
	[PlotID] [int] NULL,
	[Div1] [nvarchar](100) NULL,
	[Div2] [nvarchar](50) NULL,
	[Div3] [nvarchar](50) NULL,
	[Div4] [nvarchar](50) NULL,
	[Div5] [nvarchar](200) NULL,
	[Grave] [int] NULL,
	[FirstName] [nvarchar](50) NULL,
	[MiddleName] [nvarchar](50) NULL,
	[Lastname] [nvarchar](100) NULL,
	[Street] [nvarchar](100) NULL,
	[City] [nvarchar](50) NULL,
	[State] [nvarchar](30) NULL,
	[Zip] [nvarchar](20) NULL,
	[Phone] [nvarchar](20) NULL,
	[Title] [nvarchar](20) NULL,
	[CoOwnerComment] [nvarchar](1000) NULL
) ON [PRIMARY]


CREATE TABLE [dbo].[OwnersCSV](
	[OwnerID] [int] NULL,
	[Title] [nvarchar](20) NULL,
	[FirstName] [nvarchar](50) NULL,
	[MiddleName] [nvarchar](50) NULL,
	[Lastname] [nvarchar](100) NULL,
	[Post] [nvarchar](100) NULL,
	[Street] [nvarchar](100) NULL,
	[Address2] [nvarchar](100) NULL,
	[City] [nvarchar](50) NULL,
	[State] [nvarchar](30) NULL,
	[Zip] [nvarchar](20) NULL,
	[Phone] [nvarchar](20) NULL,
	[Phone2] [nvarchar](20) NULL,
	[Email] [nvarchar](100) NULL,
	[OwnerComment] [nvarchar](1000) NULL
) ON [PRIMARY]


CREATE TABLE [dbo].[PlotInfoCSV](
	[PlotID] [int] NULL,
	[Div1] [nvarchar](100) NULL,
	[Div2] [nvarchar](50) NULL,
	[Div3] [nvarchar](50) NULL,
	[Div4] [nvarchar](50) NULL,
	[Div5] [nvarchar](200) NULL,
	[Contract] [nvarchar](20) NULL,
	[Owner_Id_Fk] [int] NULL
) ON [PRIMARY]


CREATE TABLE [dbo].[WebcemDataSupport](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED  ( [id] ASC ),
	[personId] [int] NULL,
	[propertyId] [int] NULL,
	[webcemReferenceId] [nvarchar](250) NULL,
	[json] [nvarchar](500) NULL,
	[role] [nvarchar](50) NULL,
	[isActive] [bit] NULL)


CREATE TABLE [dbo].[WebCemDataSupportLog](
	[id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED  ( [id] ASC ),
	[OnePortalPersonVerificationDetailsId] [int] NULL,
	[OnePortalID] [nvarchar](255) NULL,
	[OnePortalPersonId] [int] NULL,
	[OnePortalAddressId] [int] NULL,
	[OnePortalPlaceId] [int] NULL,
	[PersonId] [int] NULL,
	[propertyid] [int] NULL,
	[webcemReferenceId] [nvarchar](250) NULL,
	[CreatedAt] [datetime] NULL)


ALTER TABLE [dbo].[WebCemDataSupportLog] ADD  DEFAULT (getdate()) FOR [CreatedAt]


CREATE TABLE ItemReplacement
(
OldItemCode NVARCHAR(255),
NewItemCode NVARCHAR(255)
)


INSERT INTO ItemReplacement VALUES('CREMF', 'CSP-F1')
INSERT INTO ItemReplacement VALUES('CLintDDMF', 'ClIntPNMF')
INSERT INTO ItemReplacement VALUES('ClintDDPN', 'ClIntPNSA')
INSERT INTO ItemReplacement VALUES('CLentCDMF', 'CLentANMF')
INSERT INTO ItemReplacement VALUES('CLentCDNTS', 'CLentANMF')
INSERT INTO ItemReplacement VALUES('CLentCDPN', 'CLentPNMF')
INSERT INTO ItemReplacement VALUES('CLentCDRM', 'CLentANMF')
INSERT INTO ItemReplacement VALUES('CLentCDSSH', 'ClentPNSa')
INSERT INTO ItemReplacement VALUES('CLentCDTB', 'CLentANMF')
INSERT INTO ItemReplacement VALUES('CLinuFMMF', 'CLinuANMF')
INSERT INTO ItemReplacement VALUES('CLinuFMNTS', 'CLinuANMF')
INSERT INTO ItemReplacement VALUES('CLinuFMPN', 'CLinuPNMF')
INSERT INTO ItemReplacement VALUES('CLinuFMRM', 'CLinuANMF')
INSERT INTO ItemReplacement VALUES('CLinuFMSSH', 'CLinuPNSa')
INSERT INTO ItemReplacement VALUES('CLinuFMTB', 'CLinuANMF')
INSERT INTO ItemReplacement VALUES('CLinuGLMF', 'CLinuANMF')
INSERT INTO ItemReplacement VALUES('CLinuGLNTS', 'CLinuANMF')
INSERT INTO ItemReplacement VALUES('CLinuGLPN', 'CLinuPNMF')
INSERT INTO ItemReplacement VALUES('CLinuGLRM', 'CLinuANMF')
INSERT INTO ItemReplacement VALUES('CLinuGLSSH', 'CLinuPNSa')
INSERT INTO ItemReplacement VALUES('CLinuGLTB', 'CLinuANMF')
INSERT INTO ItemReplacement VALUES('CLinuMBMF', 'CLinuANMF')
INSERT INTO ItemReplacement VALUES('CLinuMBNTS', 'CLinuANMF')
INSERT INTO ItemReplacement VALUES('CLinuMBPN', 'CLinuPNMF')
INSERT INTO ItemReplacement VALUES('CLinuMBRM', 'CLinuANMF')
INSERT INTO ItemReplacement VALUES('CLinuMBSSH', 'CLinuPNSa')
INSERT INTO ItemReplacement VALUES('CLinuMBTB', 'CLinuANMF')
INSERT INTO ItemReplacement VALUES('CLRIGHTAD2', 'CLrightadd')
INSERT INTO ItemReplacement VALUES('CLUintMF', 'CLintUND')
INSERT INTO ItemReplacement VALUES('CLUintPN', 'CLintUND')
INSERT INTO ItemReplacement VALUES('CLUintSSH', 'CLintUND')
INSERT INTO ItemReplacement VALUES('CCREM', 'CLcrem')
INSERT INTO ItemReplacement VALUES('CCREM-CC1', 'CLcrem')
INSERT INTO ItemReplacement VALUES('CCREM-CC2', 'CLcrem')
INSERT INTO ItemReplacement VALUES('CCREM-DC3', 'CLcrem')
INSERT INTO ItemReplacement VALUES('CCREM-DC4', 'CLcrem')
INSERT INTO ItemReplacement VALUES('CCREM-TC1', 'CLcrem')
INSERT INTO ItemReplacement VALUES('CCREM-TC2', 'CLcrem')
INSERT INTO ItemReplacement VALUES('CCREM-TC3', 'CLcrem')
INSERT INTO ItemReplacement VALUES('CCREM-TC4', 'CLcrem')
INSERT INTO ItemReplacement VALUES('CCREMM', 'CLcrem')
INSERT INTO ItemReplacement VALUES('CCREMSA', 'CLcrem')
INSERT INTO ItemReplacement VALUES('CCREMSU', 'CLcrem')

INSERT INTO ItemReplacement VALUES('RF-Vet', 'GBVET2')
INSERT INTO ItemReplacement VALUES('RFM12', 'GB17X7')
INSERT INTO ItemReplacement VALUES('RFM71', 'GBNS14')
INSERT INTO ItemReplacement VALUES('RFiNameLM', 'GBiname')
INSERT INTO ItemReplacement VALUES('RFE119', 'MA71010454')
INSERT INTO ItemReplacement VALUES('RFE116', 'AUZ328')
INSERT INTO ItemReplacement VALUES('SGCF107', 'GBCF164')
INSERT INTO ItemReplacement VALUES('SGCF107D', 'GBCF164D')
INSERT INTO ItemReplacement VALUES('SGCF107DGN', 'GBCF163DGN')
INSERT INTO ItemReplacement VALUES('SGCF107DVR', 'GBCF163D')
INSERT INTO ItemReplacement VALUES('SGCF107SLG', 'GBCF163S')
INSERT INTO ItemReplacement VALUES('SGCF107VGN', 'GBCF163GN')
INSERT INTO ItemReplacement VALUES('SGCF107VRL', 'GBCF163')
INSERT INTO ItemReplacement VALUES('SGCF115', 'BCM56')
INSERT INTO ItemReplacement VALUES('SGCF115D', 'BCM56D')
INSERT INTO ItemReplacement VALUES('SGCF115SLG', 'BCM56S')
INSERT INTO ItemReplacement VALUES('SGCF120D', 'BCM57')
INSERT INTO ItemReplacement VALUES('SGCF120S', 'BCM57D')
INSERT INTO ItemReplacement VALUES('SGCF120SLG', 'BCM57S')
INSERT INTO ItemReplacement VALUES('RFM-60-U7', 'GBCF163')
INSERT INTO ItemReplacement VALUES('RFM-60-U7D', 'GBCF163D')
INSERT INTO ItemReplacement VALUES('RFM60U7GSS', 'RFM60S')
INSERT INTO ItemReplacement VALUES('RFM-56', 'BCM56')
INSERT INTO ItemReplacement VALUES('RFM-56-D', 'BCM56D')
INSERT INTO ItemReplacement VALUES('RFM-60', 'GBCF164')
INSERT INTO ItemReplacement VALUES('RFM-60-2', 'GBCF164D')
INSERT INTO ItemReplacement VALUES('RFM-57', 'BCM57')
INSERT INTO ItemReplacement VALUES('RFM-57-D', 'BCM57D')
INSERT INTO ItemReplacement VALUES('RFM60U7GSS', 'RFM60S')
INSERT INTO ItemReplacement VALUES('RFM60U7GN', 'GBCF163GN')
INSERT INTO ItemReplacement VALUES('RFM60UTDGN', 'GBCF163DGN')



ALTER TABLE dbo.[FuneralContractItemsLog] ADD FOREIGN KEY ([AgreementFuneralPortalLogId]) REFERENCES [dbo].[AgreementFuneralPortalLog] ([id])
ALTER TABLE dbo.[FuneralContractItemsLog] ADD FOREIGN KEY ([NewItemId]) REFERENCES [dbo].[Item] ([id])
ALTER TABLE dbo.[FuneralContractItemsLog] ADD FOREIGN KEY ([AgreementID]) REFERENCES [dbo].[Agreement] ([ID])
ALTER TABLE dbo.[FuneralContractItemsLog] NOCHECK CONSTRAINT ALL


ALTER TABLE dbo.[CemeteryContractItemsLog] ADD FOREIGN KEY ([AgreementCemPortalLogId]) REFERENCES [dbo].[AgreementCemPortalLog] ([id])
ALTER TABLE dbo.[CemeteryContractItemsLog] ADD FOREIGN KEY ([ItemId]) REFERENCES [dbo].[Item] ([id])
ALTER TABLE dbo.[CemeteryContractItemsLog] ADD FOREIGN KEY ([AgreementLocationItemID]) REFERENCES [dbo].[AgreementLocationItem] ([ID])
ALTER TABLE dbo.[CemeteryContractItemsLog] ADD FOREIGN KEY ([AgreementPropertyID]) REFERENCES [dbo].[AgreementProperty] ([ID])
ALTER TABLE dbo.[CemeteryContractItemsLog] ADD FOREIGN KEY ([AgreementAdjustmentID]) REFERENCES [dbo].[AgreementAdjustment] ([ID])
ALTER TABLE dbo.[CemeteryContractItemsLog] ADD FOREIGN KEY ([AgreementMemorialId]) REFERENCES [dbo].[AgreementMemorial] ([ID])
ALTER TABLE dbo.[CemeteryContractItemsLog] ADD FOREIGN KEY ([AgreementMemorialItemId]) REFERENCES [dbo].[AgreementMemorialItem] ([ID])
ALTER TABLE dbo.[CemeteryContractItemsLog] ADD FOREIGN KEY ([AgreementItemPriceID]) REFERENCES [dbo].[AGREEMENTITEMPRICE] ([ID])
ALTER TABLE dbo.[CemeteryContractItemsLog] NOCHECK CONSTRAINT ALL


ALTER TABLE CemeteryPaymentLog ADD CONSTRAINT FK_CemeteryPaymentLog_Agreement_AGREEMENTID FOREIGN KEY (AgreementID) REFERENCES AGREEMENT(ID)
ALTER TABLE CemeteryPaymentLog ADD CONSTRAINT FK_CemeteryPaymentLog_Payment_PaymentID FOREIGN KEY (PaymentId) REFERENCES PAYMENT(ID)
ALTER TABLE CemeteryPaymentLog ADD CONSTRAINT FK_CemeteryPaymentLog_AgreementPerson_PayorID FOREIGN KEY (PayorId) REFERENCES AGREEMENTPERSON(ID)
ALTER TABLE CemeteryPaymentLog ADD CONSTRAINT FK_CemeteryPaymentLog_AgreementFinance_AgreementFinanceID FOREIGN KEY (AgreementFinanceId) REFERENCES AgreementFinance(ID)


ALTER TABLE FinanceScheduleLog ADD CONSTRAINT FK_FinanceScheduleLog_AgreementFinance_AgreementFinanceId FOREIGN KEY (AgreementFinanceId) REFERENCES AgreementFinance(ID)
ALTER TABLE FinanceScheduleLog ADD CONSTRAINT FK_FinanceScheduleLog_CemeteryPaymentLog_CemeteryPaymentLogId FOREIGN KEY (CemeteryPaymentLogId) REFERENCES CemeteryPaymentLog(ID)
ALTER TABLE FinanceScheduleLog ADD CONSTRAINT FK_FinanceScheduleLog_AgreementFinanceSchedule_AgreementFinanceScheduleId FOREIGN KEY (AgreementFinanceScheduleId) REFERENCES AgreementFinanceSchedule(ID)


ALTER TABLE CemeteryContractAdjustmentLog ADD CONSTRAINT FK_CemeteryContractAdjustmentLog_Agreement_AGREEMENTID FOREIGN KEY (AgreementID) REFERENCES AGREEMENT(ID)
ALTER TABLE CemeteryContractAdjustmentLog ADD CONSTRAINT FK_CemeteryContractAdjustmentLog_AgreementAdjustment_AgreementAdjustmentID FOREIGN KEY (AgreementAdjustmentID) REFERENCES AgreementAdjustment(ID)


ALTER TABLE FuneralContractAdjustmentLog ADD CONSTRAINT FK_FuneralContractAdjustmentLog_Agreement_AGREEMENTID FOREIGN KEY (AgreementID) REFERENCES AGREEMENT(ID)
ALTER TABLE FuneralContractAdjustmentLog ADD CONSTRAINT FK_FuneralContractAdjustmentLog_AgreementAdjustment_AgreementAdjustmentID FOREIGN KEY (AgreementAdjustmentID) REFERENCES AgreementAdjustment(ID)


-- ALTER TABLE Employee ADD isActive BIT NOT NULL DEFAULT 0
ALTER TABLE Adjustment ADD hmisItemCode NVARCHAR(100)


ALTER TABLE [dbo].[AddressHMISPortalLog] ADD  DEFAULT (getdate()) FOR [createdAt]
ALTER TABLE [dbo].[AddressHMISPortalLog]  WITH CHECK ADD FOREIGN KEY([AddressId]) REFERENCES [dbo].[Address] ([id])


ALTER TABLE AdjustmentLog ADD CONSTRAINT FK_AdjustmentLog_AdjustmentId FOREIGN KEY (AdjustmentId) REFERENCES Adjustment(id)

ALTER TABLE SalesCounselorLog ADD CONSTRAINT FK_SalesCounselorLog_CALLID FOREIGN KEY (CallId) REFERENCES Call(Id)   

ALTER TABLE OrganizationLog ADD CONSTRAINT FK_OrganizationLog_NEWID FOREIGN KEY (NewId) REFERENCES ORGANIZATION(Id)   

ALTER TABLE AddressCemPortalLog ADD CONSTRAINT FK_ADDRESSCEMPORTALLOG_NEWID FOREIGN KEY (AddressId) REFERENCES Address(Id)   

ALTER TABLE AddressFuneralPortalLog ADD CONSTRAINT FK_ADDRESSFUNERALPORTALLOG_NEWID FOREIGN KEY (AddressId) REFERENCES Address(Id)   

ALTER TABLE LocationLog ADD CONSTRAINT FK_LocationLog_NEWID FOREIGN KEY (NewId) REFERENCES [LOCATION](Id)   

ALTER TABLE OrganizationResidenceAddressLog ADD CONSTRAINT FK_ORGANIZATIONRESIDENCEADDRESSLOG_ADDRESS_ID FOREIGN KEY (NewId) REFERENCES ADDRESS(Id)   

ALTER TABLE EthnicityLog ADD CONSTRAINT FK_ETHNICITYLOG_NEWID FOREIGN KEY (NewId) REFERENCES ETHNICITY(Id)   

ALTER TABLE RaceLog ADD CONSTRAINT FK_RACELOG_NEWID FOREIGN KEY (NewId) REFERENCES RACE(Id)   

ALTER TABLE CallCemPortalLog ADD CONSTRAINT FK_CALLID FOREIGN KEY (CallId) REFERENCES Call(Id)

ALTER TABLE CallFuneralPortalLog ADD CONSTRAINT FK_CallFuneralPortalLog_ID FOREIGN KEY (CallId) REFERENCES Call(Id)   

ALTER TABLE PersonCemportalLog ADD CONSTRAINT FK_PERSONLOGCEMPORTALID FOREIGN KEY (NewPersonId) REFERENCES Person(Id)   

ALTER TABLE PersonFuneralportalLog ADD CONSTRAINT FK_PERSONLOGFUNERALPORTALID FOREIGN KEY (NewPersonId) REFERENCES Person(Id)   

ALTER TABLE ContactCemportalLog ADD CONSTRAINT FK_CONTACTLOGCEMPORTAL_PERSON_NEWPERSONID FOREIGN KEY (NewPersonId) REFERENCES Person(Id)   

ALTER TABLE ContactCemportalLog ADD CONSTRAINT FK_CONTACTLOGCEMPORTAL_CALL_CALLID FOREIGN KEY (CALLID) REFERENCES Call(Id)   

ALTER TABLE ContactFuneralportalLog ADD CONSTRAINT FK_CONTACTLOGFUNERALPORTAL_CALL_CALLID FOREIGN KEY (CALLID) REFERENCES Call(Id)   

ALTER TABLE ContactFuneralportalLog ADD CONSTRAINT FK_CONTACTLOGFUNERALPORTAL_PERSON_NEWPERSONID FOREIGN KEY (NewPersonId) REFERENCES Person(Id)   

ALTER TABLE ContactOrganizationPersonLog ADD CONSTRAINT FK_ContactLogOrganizationPerson_PERSON_NEWPERSONID FOREIGN KEY (NewPersonId) REFERENCES PERSON(ID)

ALTER TABLE ContactOrganizationPersonLog ADD CONSTRAINT FK_ContactLogOrganizationPerson_CALL_CALLID FOREIGN KEY (CALLID) REFERENCES CALL(ID)


ALTER TABLE CertifierLog ADD CONSTRAINT FK_CertifierLog_Certifier_CertifierID FOREIGN KEY (CertifierId) REFERENCES Certifier(Id)   


ALTER TABLE PersonContact ADD CONSTRAINT FK_PERSONCONTACT_PERSON_RESOURCEID FOREIGN KEY (RESOURCEID) REFERENCES PERSON(ID)


ALTER TABLE PersonAnRemainsInfoLog ADD CONSTRAINT FK_ANREMAINSINFOLOG_ANREMAINSINFO FOREIGN KEY (NewPersonAnRemainsInfoId) REFERENCES PERSONREMAINSINFO(Id)   


ALTER TABLE PersonEthnicityLog ADD CONSTRAINT FK_PERSONETHNICITYLOG_PERSONETHNICITY FOREIGN KEY (NewId) REFERENCES PERSONETHNICITY(Id)   

ALTER TABLE PersonEthnicityLog ADD CONSTRAINT FK_PersonEthnicityLog_PERSON_PersonId FOREIGN KEY (PersonId) REFERENCES PERSON(ID)


ALTER TABLE PurchaserPayorPersonCemPortalLog ADD CONSTRAINT FK_PURCHASERPAYORPERSONCEMPORTALLOG_PERSON_NEWPERSONID FOREIGN KEY (PersonId) REFERENCES PERSON(ID)

ALTER TABLE PurchaserPayorPersonCemPortalLog ADD CONSTRAINT FK_PURCHASERPAYORPERSONCEMPORTALLOG_CALL_CALLID FOREIGN KEY (CALLID) REFERENCES CALL(ID)

ALTER TABLE PurchaserPayorPersonFuneralPortalLog ADD CONSTRAINT FK_PURCHASERPAYORPERSONFUNERALPORTALLOG_PERSON_NEWPERSONID FOREIGN KEY (PersonId) REFERENCES PERSON(ID)

ALTER TABLE PurchaserPayorPersonFuneralPortalLog ADD CONSTRAINT FK_PURCHASERPAYORPERSONFUNERALPORTALLOG_CALL_CALLID FOREIGN KEY (CALLID) REFERENCES CALL(ID)


ALTER TABLE ARRANGEMENTFUNERALPORTALLOG ADD CONSTRAINT FK_ARRANGEMENTLOG_USER_CALLID FOREIGN KEY (CALLID) REFERENCES [CALL](ID)

ALTER TABLE ARRANGEMENTFUNERALPORTALLOG ADD CONSTRAINT FK_ARRANGEMENTLOG_USER_NEWID FOREIGN KEY (NEWID) REFERENCES [ARRANGEMENT](ID)

ALTER TABLE ARRANGEMENTFUNERALPORTALLOG ADD CONSTRAINT FK_ARRANGEMENTFUNERALPORTALLOG_PERSON_PERSONID FOREIGN KEY (PERSONID) REFERENCES [PERSON](ID)


ALTER TABLE ARRANGEMENTCEMPORTALLOG ADD CONSTRAINT FK_ARRANGEMENTCEMPORTALLOG_USER_CALLID FOREIGN KEY (CALLID) REFERENCES [CALL](ID)

ALTER TABLE ARRANGEMENTCEMPORTALLOG ADD CONSTRAINT FK_ARRANGEMENTCEMPORTALLOG_USER_NEWID FOREIGN KEY (NEWID) REFERENCES [ARRANGEMENT](ID)

ALTER TABLE ARRANGEMENTCEMPORTALLOG ADD CONSTRAINT FK_ARRANGEMENTCEMPORTALLOG_PERSON_PERSONID FOREIGN KEY (PERSONID) REFERENCES [PERSON](ID)


ALTER TABLE AgreementCEMPORTALLOG ADD CONSTRAINT FK_AGREEMENTCEMPORTALLOG_AGREEMENT_ID FOREIGN KEY (AgreementId) REFERENCES [Agreement](ID)

ALTER TABLE PURCHASERAgreementCEMPORTALLOG ADD CONSTRAINT FK_PURCHASERAGREEMENTCEMPORTALLOG_PERSON_PERSONID FOREIGN KEY (PERSONID) REFERENCES [PERSON](ID)

ALTER TABLE PURCHASERAgreementCEMPORTALLOG ADD CONSTRAINT FK_PURCHASERAGREEMENTCEMPORTALLOG_AGREEMENTCEMPORTALLOG_ID FOREIGN KEY (AgreementCemPortalId) REFERENCES [AgreementCEMPORTALLOG](ID)


-- ALTER TABLE AgreementHMISLog ADD CONSTRAINT FK_AgreementHMISLog_AGREEMENT_ID FOREIGN KEY (AgreementId) REFERENCES [Agreement](ID)
-- 

ALTER TABLE PersonAgreementHMISLog ADD CONSTRAINT FK_PERSONAGREEMENTHMISLOG_PERSON_PERSONID FOREIGN KEY (PERSONID) REFERENCES [PERSON](ID)

ALTER TABLE PersonAgreementHMISLog ADD CONSTRAINT FK_PERSONAGREEMENTHMISLOG_AGREEMENT_AGREEMENTID FOREIGN KEY (AgreementId) REFERENCES [Agreement](ID)

ALTER TABLE PersonAgreementHMISLog ADD CONSTRAINT FK_PERSONAGREEMENTHMISLOG_AGREEMENTPERSON_ID FOREIGN KEY (AgreementPersonId) REFERENCES [AgreementPerson](ID)


ALTER TABLE AgreementFUNERALPORTALLOG ADD CONSTRAINT FK_AGREEMENTFUNERALPORTALLOG_AGREEMENT_ID FOREIGN KEY (AgreementId) REFERENCES [Agreement](ID)

ALTER TABLE PURCHASERAgreementFUNERALPORTALLOG ADD CONSTRAINT FK_PURCHASERAGREEMENTFUNERALPORTALLOG_PERSON_PERSONID FOREIGN KEY (PERSONID) REFERENCES [PERSON](ID)

ALTER TABLE PURCHASERAgreementFUNERALPORTALLOG ADD CONSTRAINT FK_PURCHASERAGREEMENTFUNERALPORTALLOG_STATEMENTFUNERALPORTALLOG_ID FOREIGN KEY (AgreementFuneralPortalId) REFERENCES [AgreementFUNERALPORTALLOG](ID)


ALTER TABLE LinkAgreement ADD Arrangement INT
ALTER TABLE LinkAgreement ADD Txn INT
ALTER TABLE LinkAgreement ADD IsLinkedContract BIT
ALTER TABLE LinkAgreement ADD ContractRelationId INT
ALTER TABLE LinkAgreement ADD LinkedSalesId INT
ALTER TABLE LinkAgreement ADD LinkedArrangementId INT


IF NOT EXISTS(SELECT * FROM [USER] WHERE Email = 'a@gmail.com')
BEGIN
	INSERT INTO [USER](Name,Email,createdAt,updatedAt) VALUES('Data Sync', 'a@gmail.com',GETDATE(),GETDATE())
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
