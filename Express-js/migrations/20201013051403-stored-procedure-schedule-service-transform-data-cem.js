'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Schedule_Service_Transform_Data_Cem') IS NOT NULL
	--DROP PROCEDURE Schedule_Service_Transform_Data_Cem

    CREATE PROCEDURE Schedule_Service_Transform_Data_Cem (@WorkOrderId INT)
    AS
    BEGIN
        -- Transform query
        -- Creating a temp table
        -- Fields missing :- 
        -- - Interment Information Section, (propertyId)
        -- - Disinterment Information Section, (propertyId)
        -- Co-decedent items if exists for an arrangement: 'CFSCL2NDENT','CFSCL2NDINT','CFSCL2NDINU','CFSCL2NDINTIC','CFSCL2NDINUIT','CFSCL2NDDINT','CFSCL2NDDISN','CFSCL2ndInuIC','CFSCL2ndUTrsf'
        -- If a service belongs to decedent all other 
        DECLARE @Datasync_USERID INT
        DECLARE @RootSpStartTime DATETIME
    
        SET @RootSpStartTime = GETDATE()
    
        SELECT @Datasync_USERID = ID
        FROM [User]
        WHERE email = 'a@gmail.com'
    
        -- DECLARE @WorkOrderId INT = 1971
        DECLARE @personId INT = NULL
    
        -- DECLARE @PurchaseOrderId INT = 73
        SELECT DISTINCT
            -- P.id as CemPersonId,
            T.id AS TxnId
            ,T.arrangement AS ArrangementId
            ,TL.ItemNumber AS ItemNumber
            ,TL.itemDescription
            ,LA.hmisSalesId AS salesId
            ,WO.id AS WorkOrderId
            ,WO.vaultId AS VaultId
            ,WO.casketId AS CasketId
            ,WO.casketType AS casketType
            ,WO.urnId AS UrnId
            ,WO.vaseNeeded AS isVasesSelected
            ,WO.vaseQty AS noOfVases
            ,WO.familyUrnHeight AS height
            ,WO.familyUrnWidth AS width
            ,WO.familyUrnDepth AS depth
            ,WO.urnStatus
            ,WO.urnRcvDate AS receivedDate
            ,WO.crematedRequiredTransfer AS isTransferRequired
            ,CASE 
                WHEN WO.familyUrnHeight IS NOT NULL
                    THEN 1
                ELSE 0
                END AS isFamilyOwnedUrn
            ,WO.serviceDateStart AS ServiceStartDate
            ,WO.serviceDateEnd AS ServiceEndDate
            ,
            -- CASE WHEN WO.intermentPropertyId IS NULL THEN MIP.PropertyTxnLineId ELSE WO.intermentPropertyId END AS intermentPropertyId,
            WO.intermentPropertyId AS intermentPropertyId
            ,CASE 
                WHEN WO.disintermentPropertyId IS NULL
                    THEN MDIP.PropertyTxnLineId
                ELSE WO.disintermentPropertyId
                END AS DisIntermentPropertyId
            ,WO.locationVerify AS isLocationVerifiedWithFamily
            ,WO.locationVerifyPlatted AS isLocationVerifiedWithPlattedRecord
            ,WO.electronicCIF AS IsElectronicCIF
            ,WO.trustReview AS reviewedTrustStatement
            ,WO.merchConfirm AS confirmedExpectedMerchandiseDelivery
            ,WO.confirmFD AS confirmedPlacementScheduleWithFuneralDirector
            ,WO.cremationPermit AS isPermitted
            ,WO.witnessCremation AS isWitnessedCremation
            ,WO.witnessNumber AS noOfWitness
            ,TL.Id AS TxnLineId
            ,TL.salesItemId
            ,ISNULL(WO.markerInfo, WO.otherMemorialInfo) AS MemorialInformation
            ,WO.witnessLowering AS IsWitnessLoweringOrEntombment
            ,WO.witnessCovering AS IsWitnessCoveringOrSealings
            ,WO.witnessFilling AS IsWitnessFilling
            ,WO.reopenBottom AS IsReopenBottom
            ,WO.infoBurningPot AS IsBurningPot
            ,WO.infoMound AS IsMoundOfDirtByFootend
            ,WO.infoTent AS IsUseOfTent
            ,WO.placeAndNotify AS IsPlaceAndNotify
            ,WO.reopenTop AS IsReopenTop
            ,WO.apcCounselor
            ,WO.backupCounselor
            ,WO.leadInCounselor
            ,WO.woCompletionDate AS completedOn
            ,WO.officiantNeeded AS needsOffciant
            ,WO.serviceIssue
            ,WO.casketHeight
            ,WO.casketWidth
            ,WO.casketDepth
            ,WO.locationVerifyForeman AS isLocationVerifiedByForeman
            ,C.id AS cremationStatusId
            ,CASE 
                WHEN WO.woCompletionDate IS NOT NULL
                    THEN 1
                WHEN WO.apcCounselor IS NOT NULL
                    THEN 2
                ELSE 3
                END AS StatusId
            ,WO.disintermentReason AS DisintermentReason
            ,WO.disintermentType AS DisintermentType
            ,WO.specialInstruction AS Instruction
            ,CONVERT(INT, NULL) AS VaultTxnLineId
            ,CONVERT(INT, NULL) AS CasketTxnLineId
            ,CONVERT(INT, NULL) AS UrnTxnLineId
            ,CONVERT(INT, NULL) AS VaultSalesItemId
            ,CONVERT(INT, NULL) AS CasketSalesItemId
            ,CONVERT(INT, NULL) AS UrnSalesItemId
            ,CONVERT(INT, NULL) AS VaultSalesId
            ,CONVERT(INT, NULL) AS CasketSalesId
            ,CONVERT(INT, NULL) AS UrnSalesId
            ,CONVERT(VARCHAR, NULL) AS VaultItemNumber
            ,CONVERT(VARCHAR, NULL) AS CasketItemNumber
            ,CONVERT(VARCHAR, NULL) AS UrnItemNumber
            ,CONVERT(VARCHAR(100), NULL) AS VaultItemDescription
            ,CONVERT(VARCHAR(100), NULL) AS CasketItemDescription
            ,CONVERT(VARCHAR(100), NULL) AS UrnItemDescription
            ,CASE 
                WHEN VIR.Item_Cd IS NOT NULL
                    THEN 1
                ELSE 0
                END AS IsIntermentRight
            ,CASE 
                WHEN VIDR.Item_Cd IS NOT NULL
                    THEN 1
                ELSE 0
                END AS IsDisintermentRight
            ,CASE 
                WHEN CSI.Item_Cd IS NOT NULL
                    THEN 1
                ELSE 0
                END AS IsCremationService
            ,
            -- CASE WHEN CSIS.Item_Cd IS NOT NULL THEN 1 ELSE 0 END AS IsCemeteryService,
            CONVERT(INT, NULL) AS PersonId
            ,-- Decedent / Co-decedent
            CONVERT(INT, NULL) AS OnePortalCemScheduleServiceId
            ,CONVERT(INT, NULL) AS OnePortalIntermentInformationSectionId
            ,CONVERT(INT, NULL) AS OnePortalIntermentRequestSectionId
            ,CONVERT(INT, NULL) AS OnePortalDisintermentInfoSectionId
            ,CONVERT(INT, NULL) AS OnePortalVaultSectionId
            ,CONVERT(INT, NULL) AS OnePortalCasketSectionId
            ,CONVERT(INT, NULL) AS OnePortalUrnInformationSectionId
            ,CONVERT(INT, NULL) AS OnePortalmerchandiseAdditionalInfoSectionId
            ,CONVERT(INT, NULL) AS OnePortalgenericSectionId
            ,CONVERT(INT, NULL) AS OnePortalfuneralArrangementSectionId
            ,CONVERT(INT, NULL) AS OnePortalfuneralArrangementSectionLocationId
            ,CONVERT(INT, NULL) AS OnePortalWorkOrderPrimaryId
            ,CONVERT(INT, NULL) AS OnePortalWorkOrderDetailId
            ,CONVERT(INT, NULL) AS OnePortalWorkOrderCasketInfoId
            ,CONVERT(INT, NULL) AS OnePortalApcCounselorEmployeeId
            ,CONVERT(INT, NULL) AS OnePortalleadInCounselorEmployeeId
            ,CONVERT(INT, NULL) AS OnePortalbackupCounselorEmployeeId
            ,@Datasync_USERID AS CreatedBy
            ,@Datasync_USERID AS UpdatedBy
            ,CONVERT(INT, NULL) AS OnePortalPropertyId
            ,CONVERT(INT, NULL) AS OnePortalServiceItemUsageID
            ,CONVERT(VARCHAR, NULL) AS ServiceItemUsageResourceType
            ,CONVERT(INT, NULL) AS ServiceItemUsageResourceID
            ,CONVERT(VARCHAR, NULL) AS ServiceItemUsedStatus
            ,CONVERT(INT, NULL) AS ServiceItemUsedStatusId
            ,CONVERT(INT, NULL) AS OnePortalVaultItemUsageID
            ,CONVERT(VARCHAR, NULL) AS VaultItemUsageResourceType
            ,CONVERT(INT, NULL) AS VaultItemUsageResourceID
            ,CONVERT(VARCHAR, NULL) AS VaultItemUsedStatus
            ,CONVERT(INT, NULL) AS VaultItemUsedStatusId
            ,CONVERT(INT, NULL) AS OnePortalCasketItemUsageID
            ,CONVERT(VARCHAR, NULL) AS CasketItemUsageResourceType
            ,CONVERT(INT, NULL) AS CasketItemUsageResourceID
            ,CONVERT(VARCHAR, NULL) AS CasketItemUsedStatus
            ,CONVERT(INT, NULL) AS CasketItemUsedStatusId
            ,CONVERT(INT, NULL) AS OnePortalUrnItemUsageID
            ,CONVERT(VARCHAR, NULL) AS UrnItemUsageResourceType
            ,CONVERT(INT, NULL) AS UrnItemUsageResourceID
            ,CONVERT(VARCHAR, NULL) AS UrnItemUsedStatus
            ,CONVERT(INT, NULL) AS UrnItemUsedStatusId
            ,GETDATE() AS createdAt
            ,GETDATE() AS updatedAt
            ,CONVERT(INT, NULL) AS deletedBy
            ,CONVERT(DATE, NULL) AS deletedAt
            ,CONVERT(INT, NULL) AS workOrderOwnerId
            ,CONVERT(INT, NULL) AS OnePortalWorkOrderStatusId
            ,CONVERT(INT, NULL) AS funeralHomeId
            ,CONVERT(INT, NULL) AS clFacilityLocationId
            ,CONVERT(INT, NULL) AS serviceLocationId
            ,CONVERT(INT, NULL) AS funeralDirectorId
            ,CONVERT(INT, NULL) AS SchedulingCemeteryWorkOrderLogId
            ,CONVERT(INT, NULL) AS PropertyTxnLineSalesItemId
            ,CONVERT(VARCHAR(200), NULL) AS PropertyTxnLineItemDescription
            ,CONVERT(INT, NULL) AS PropertySalesId
            ,CONVERT(INT, NULL) AS PropertyItemUsageResourceID
            ,CONVERT(VARCHAR, NULL) AS PropertyItemUsedStatus
            ,CONVERT(VARCHAR, NULL) AS PropertyItemUsedStatusId
            ,CONVERT(VARCHAR, NULL) AS PropertyTxnLineItemNumber
            ,CONVERT(VARCHAR, NULL) AS PropertyItemUsageResourceType
            ,CONVERT(VARCHAR, NULL) AS OnePortalPropertyItemUsageID
            ,CONVERT(VARCHAR, NULL) AS CemeteryScheduledPropertyId
        INTO #CemScheduleService
        FROM CEMPORTAL.DBO.WorkOrder WO
        INNER JOIN CEMPORTAL.DBO.TxnLine TL ON WO.txnLine = TL.id
        INNER JOIN CEMPORTAL.DBO.Txn T ON TL.txn = T.id
        INNER JOIN (
            SELECT DISTINCT txn
                ,Arrangement
                ,hmisSalesId
            FROM LinkAgreement
            ) LA -- Only arrangement present in this is required for migration of scheduling data
            ON TL.txn = LA.Txn
        LEFT JOIN vw_IntermentRightItems_Migrated VIR ON TL.itemNumber = VIR.Item_Cd
        LEFT JOIN vw_DisintermentRightItems_Migrated VIDR ON TL.itemNumber = VIDR.Item_Cd
        LEFT JOIN vw_CremationServiceItems_Migrated CSI ON TL.itemNumber = CSI.Item_Cd
        -- LEFT JOIN vw_CemeteryServiceItems CSIS
        --     ON TL.itemNumber = CSIS.ITEM_CD
        LEFT JOIN CremationStatus C ON WO.crematedRemainsStatus = C.Name
        -- LEFT JOIN vw_CemWO_MissingIntermentProperties MIP
        --     ON MIP.IntermentServiceTxnLineId = WO.txnLine
        LEFT JOIN vw_CemWO_MissingDisIntermentProperties MDIP ON MDIP.DisintermentServiceTxnLineId = WO.txnLine
        WHERE WO.id = @WorkOrderId
            AND WO.serviceDateStart IS NOT NULL
            AND WO.serviceDateEnd IS NOT NULL
    
        UPDATE CS
        SET IsIntermentRight = 1
        FROM #CemScheduleService CS
        WHERE CS.IsCremationService = 1
    
        IF (
                SELECT intermentPropertyId
                FROM #CemScheduleService
                ) IS NULL
            AND (
                SELECT IsIntermentRight
                FROM #CemScheduleService
                ) = 1
        BEGIN
            UPDATE CS
            SET intermentPropertyId = (
                    SELECT TOP 1 MIP.PropertyTxnLineId
                    FROM #CemScheduleService CS
                    INNER JOIN vw_CemWO_MissingIntermentProperties MIP ON MIP.IntermentServiceTxnLineId = CS.txnLineId
                    WHERE MIP.Parent_item_cd LIKE 'P-%'
                    ORDER BY MIP.Parent_item_cd ASC
                    )
            FROM #CemScheduleService CS
        END
    
        UPDATE CS
        SET CS.PropertyTxnLineSalesItemId = TL.salesItemId
            ,CS.PropertySalesId = LA.hmisSalesId
            ,CS.PropertyTxnLineItemDescription = TL.ItemDescription
            ,CS.PropertyTxnLineItemNumber = TL.ItemNumber
        FROM #CemScheduleService CS
        INNER JOIN cemportal.dbo.txnline TL ON TL.id = ISNULL(CS.intermentPropertyId, CS.DisIntermentPropertyId)
        LEFT JOIN (
            SELECT DISTINCT txn
                ,Arrangement
                ,hmisSalesId
            FROM LinkAgreement
            ) LA -- Only arrangement present in this is required for migration of scheduling data
            ON TL.txn = LA.Txn
    
        -- Update columns for Property Item Usage insert
        UPDATE CS
        SET PropertyItemUsageResourceID = (
                CASE 
                    WHEN CS.PropertyTxnLineSalesItemId IS NOT NULL
                        THEN (
                                SELECT CCIL.AgreementPropertyID
                                FROM CemeteryContractItemsLog CCIL
                                INNER JOIN #CemScheduleService CS1 ON CS1.PropertyTxnLineSalesItemId = CCIL.HMISSalesItemID
                                )
                    WHEN CS.PropertySalesId IS NOT NULL
                        THEN (
                                SELECT TOP 1 CCIL.AgreementPropertyID
                                FROM #CemScheduleService CS1
                                INNER JOIN h_000.dbo.Sales_item SI ON CS1.PropertySalesId = SI.Sales_ID
                                    AND (
                                        CS1.PropertyTxnLineItemDescription = SI.Item_Cd_Desc
                                        OR CS1.PropertyTxnLineItemNumber = SI.Product_Item_Cd
                                        )
                                INNER JOIN CemeteryContractItemsLog CCIL ON (SI.sales_item_id = CCIL.HMISSalesItemID)
                                )
                    ELSE (
                            SELECT CCIL.AgreementPropertyID
                            FROM #CemScheduleService CS1
                            INNER JOIN CemeteryContractItemsLog CCIL ON CCIL.TxnLineId = ISNULL(CS.intermentPropertyId, CS.DisIntermentPropertyId)
                            )
                    END
                )
        FROM #CemScheduleService CS
    
        UPDATE CS
        SET PropertyItemUsageResourceType = (
                CASE 
                    WHEN CS.PropertyItemUsageResourceID IS NOT NULL
                        THEN 'AgreementProperty'
                    ELSE NULL
                    END
                )
            ,PropertyItemUsedStatus = (
                CASE 
                    WHEN CS.completedOn IS NULL
                        THEN 'Selected'
                    ELSE 'Used'
                    END
                )
        FROM #CemScheduleService CS
    
        UPDATE CS
        SET PropertyItemUsedStatusId = IUS.id
        FROM #CemScheduleService CS
        INNER JOIN ItemUsageStatus IUS ON IUS.[status] = CS.PropertyItemUsedStatus
    
        -- Update all the Id's which are already inserted. 
        -- will insert more Ids after finishing testing and working on Log table
        UPDATE CS
        SET CS.SchedulingCemeteryWorkOrderLogId = SCWOL.id
            ,CS.OnePortalCemScheduleServiceId = SCWOL.ScheduledCemeteryServiceId
            ,CS.OnePortalIntermentInformationSectionId = SCWOL.intermentInformationSectionId
            ,CS.OnePortalDisintermentInfoSectionId = SCWOL.disintermentInfoSectionId
            ,CS.OnePortalIntermentRequestSectionId = SCWOL.IntermentRequestSectionId
            ,CS.OnePortalmerchandiseAdditionalInfoSectionId = SCWOL.merchandiseAdditionalInfoSectionId
            ,CS.OnePortalgenericSectionId = SCWOL.genericSectionId
            ,CS.OnePortalfuneralArrangementSectionId = SCWOL.funeralArrangementSectionId
            ,CS.CemeteryScheduledPropertyId = SCWOL.CemeteryScheduledPropertyId
        FROM #CemScheduleService CS
        INNER JOIN SchedulingCemeteryWorkOrderLog SCWOL ON CS.TxnLineId = SCWOL.TxnLineId
            AND CS.WorkOrderId = SCWOL.CemWorkOrderId
    
        -- Update Person Id
        UPDATE CS
        SET personId = (
                SELECT TOP 1 P.id
                FROM #CemScheduleService CS
                INNER JOIN cemportal.dbo.PersonRelation PR ON CS.ArrangementId = PR.arrangement
                INNER JOIN cemportal.DBO.Person OP ON PR.Person = OP.id
                INNER JOIN PersonCemportalLog PCL ON PR.id = PCL.OldPersonRelationId
                INNER JOIN Person P ON PCL.NewPersonId = P.id
                WHERE PR.relationshipType IN (
                        'Decedent'
                        ,'CoDecedent'
                        )
                ORDER BY CASE 
                        WHEN CS.itemNumber IN (
                                'CFSCL2NDENT'
                                ,'CFSCL2NDINT'
                                ,'CFSCL2NDINU'
                                ,'CFSCL2NDINTIC'
                                ,'CFSCL2NDINUIT'
                                ,'CFSCL2NDDINT'
                                ,'CFSCL2NDDISN'
                                ,'CFSCL2ndInuIC'
                                ,'CFSCL2ndUTrsf'
                                )
                            THEN PR.relationshipType
                        END ASC
                    ,CASE 
                        WHEN CS.itemNumber NOT IN (
                                'CFSCL2NDENT'
                                ,'CFSCL2NDINT'
                                ,'CFSCL2NDINU'
                                ,'CFSCL2NDINTIC'
                                ,'CFSCL2NDINUIT'
                                ,'CFSCL2NDDINT'
                                ,'CFSCL2NDDISN'
                                ,'CFSCL2ndInuIC'
                                ,'CFSCL2ndUTrsf'
                                )
                            THEN PR.relationshipType
                        END DESC
                )
        FROM #CemScheduleService CS
    
        IF (
                SELECT PersonId
                FROM #CemScheduleService
                ) IS NULL
        BEGIN
            UPDATE CS
            SET personId = (
                    SELECT TOP 1 PCL.PersonId
                    FROM #CemScheduleService CS
                    INNER JOIN PurchaserPayorPersonCemPortalLog PCL ON PCL.OldTxnId = CS.TxnId
                    INNER JOIN cemportal.dbo.PersonRelation PR ON PR.id = PCL.OldPersonRelationId
                    WHERE PR.relationshipType IN (
                            'Purchaser'
                            ,'CoPurchaser'
                            )
                    ORDER BY PR.relationshipType DESC
                    )
            FROM #CemScheduleService CS
        END
    
        -- SELECT PersonId FROm #CemScheduleService CS
        CREATE TABLE #Itemusage (
            UsedStatus INT
            ,personId INT
            ,ResourceType NVARCHAR(100)
            ,ResourceID INT
            ,
            -- CemItemType NVARCHAR(100),
            -- CemServiceType NVARCHAR(100),
            -- TxnLineId INT, 
            -- TxnLineItemNumber NVARCHAR(100),
            createdBy INT
            ,updatedBy INT
            ,createdAt DATE
            ,updatedAt DATE
            )
    
        -- Update resource id for ServiceItem.
        UPDATE CS
        SET ServiceItemUsageResourceID = (
                CASE 
                    WHEN CS.salesItemId IS NOT NULL
                        THEN (
                                SELECT CCIL.AgreementLocationItemID
                                FROM CemeteryContractItemsLog CCIL
                                INNER JOIN #CemScheduleService CS1 ON CS1.salesItemId = CCIL.HMISSalesItemID
                                )
                    WHEN CS.salesId IS NOT NULL
                        THEN (
                                SELECT TOP 1 CCIL.AgreementLocationItemID
                                FROM #CemScheduleService CS1
                                INNER JOIN h_000.dbo.Sales_item SI ON CS1.salesId = SI.Sales_ID
                                    AND (
                                        CS1.itemDescription = SI.Item_Cd_Desc
                                        OR CS1.ItemNumber = SI.Product_Item_Cd
                                        )
                                INNER JOIN CemeteryContractItemsLog CCIL ON SI.sales_item_id = CCIL.HMISSalesItemID
                                )
                    ELSE (
                            SELECT CCIL.AgreementLocationItemID
                            FROM #CemScheduleService CS1
                            INNER JOIN CemeteryContractItemsLog CCIL ON CCIL.TxnLineId = CS1.TxnLineId
                            )
                    END
                )
        FROM #CemScheduleService CS
    
        IF (
                SELECT TxnLineId
                FROM #CemScheduleService
                ) IN (
                SELECT TxnlineId
                FROM MissingSyncedTxnlineSalesItem
                )
        BEGIN
            UPDATE CS
            SET ServiceItemUsageResourceID = (
                    SELECT TOP 1 CCIL.AgreementLocationItemID
                    FROM #CemScheduleService CS1
                    INNER JOIN MissingSyncedTxnlineSalesItem MST ON MST.txnLineId = CS1.TxnLineId
                    INNER JOIN CemeteryContractItemsLog CCIL ON MST.sales_item_id = CCIL.HMISSalesItemID
                    )
            FROM #CemScheduleService CS
        END
    
        -- SELECT ServiceItemUsageResourceID,WorkOrderId FROM #CemScheduleService 
        -- Update resource Type for ServiceItem
        UPDATE CS
        SET ServiceItemUsageResourceType = (
                CASE 
                    WHEN CS.ServiceItemUsageResourceID IS NOT NULL
                        THEN 'AgreementLocationItem'
                    ELSE NULL
                    END
                )
            ,ServiceItemUsedStatus = (
                CASE 
                    WHEN CS.completedOn IS NULL
                        THEN 'Selected'
                    ELSE 'Used'
                    END
                )
        FROM #CemScheduleService CS
    
        -- Update Service Item usage status Id.
        UPDATE CS
        SET ServiceItemUsedStatusId = IUS.id
        FROM #CemScheduleService CS
        INNER JOIN ItemUsageStatus IUS ON IUS.[status] = CS.ServiceItemUsedStatus
    
        -- Update Vault items for inserting into ItemUsage
        UPDATE CS
        SET VaultItemUsedStatus = (
                CASE 
                    WHEN CS.completedOn IS NULL
                        THEN 'Selected'
                    ELSE 'Used'
                    END
                )
            ,VaultTxnLineId = TL.id
            ,VaultSalesItemId = TL.salesItemId
            ,VaultSalesId = LA.hmisSalesId
            ,VaultItemNumber = TL.itemNumber
            ,VaultItemDescription = TL.ItemDescription
        FROM #CemScheduleService CS
        INNER JOIN cemportal.dbo.TxnLine TL ON CS.VaultId = TL.id
        INNER JOIN CEMPORTAL.DBO.Txn T ON TL.txn = T.id
        LEFT JOIN (
            SELECT DISTINCT txn
                ,Arrangement
                ,hmisSalesId
            FROM LinkAgreement
            ) LA -- Only arrangement present in this is required for migration of scheduling data
            ON TL.txn = LA.Txn
        WHERE CS.VaultId IS NOT NULL
    
        UPDATE CS
        SET VaultItemUsageResourceID = (
                CASE 
                    WHEN CS.VaultSalesItemId IS NOT NULL
                        THEN (
                                SELECT CCIL.AgreementLocationItemID
                                FROM CemeteryContractItemsLog CCIL
                                INNER JOIN #CemScheduleService CS1 ON CS1.VaultSalesItemId = CCIL.HMISSalesItemID
                                )
                    WHEN CS.VaultSalesId IS NOT NULL
                        THEN (
                                SELECT TOP 1 CCIL.AgreementLocationItemID
                                FROM #CemScheduleService CS1
                                INNER JOIN h_000.dbo.Sales_item SI ON CS1.VaultSalesId = SI.Sales_ID
                                    AND (
                                        CS1.VaultItemDescription = SI.Item_Cd_Desc
                                        OR CS1.VaultItemNumber = SI.Product_Item_Cd
                                        )
                                INNER JOIN CemeteryContractItemsLog CCIL ON SI.sales_item_id = CCIL.HMISSalesItemID
                                )
                    ELSE (
                            SELECT CCIL.AgreementLocationItemID
                            FROM #CemScheduleService CS1
                            INNER JOIN CemeteryContractItemsLog CCIL ON CCIL.TxnLineId = CS1.VaultTxnLineId
                            )
                    END
                )
        FROM #CemScheduleService CS
        WHERE CS.VaultId IS NOT NULL
    
        UPDATE CS
        SET VaultItemUsageResourceType = (
                CASE 
                    WHEN VaultItemUsageResourceID IS NOT NULL
                        THEN 'AgreementLocationItem'
                    ELSE NULL
                    END
                )
        FROM #CemScheduleService CS
    
        UPDATE CS
        SET VaultItemUsedStatusId = IUS.id
        FROM #CemScheduleService CS
        INNER JOIN ItemUsageStatus IUS ON IUS.[status] = CS.VaultItemUsedStatus
    
        -- Update Casket items for inserting into ItemUsage
        UPDATE CS
        SET CasketItemUsedStatus = (
                CASE 
                    WHEN CS.completedOn IS NULL
                        THEN 'Selected'
                    ELSE 'Used'
                    END
                )
            ,CasketTxnLineId = TL.id
            ,CasketSalesItemId = TL.salesItemId
            ,CasketSalesId = LA.hmisSalesId
            ,CasketItemNumber = TL.itemNumber
            ,CasketItemDescription = TL.ItemDescription
        FROM #CemScheduleService CS
        INNER JOIN cemportal.dbo.TxnLine TL ON CS.casketId = TL.id
        INNER JOIN CEMPORTAL.DBO.Txn T ON TL.txn = T.id
        LEFT JOIN (
            SELECT DISTINCT txn
                ,Arrangement
                ,hmisSalesId
            FROM LinkAgreement
            ) LA -- Only arrangement present in this is required for migration of scheduling data
            ON TL.txn = LA.Txn
        WHERE CS.casketId IS NOT NULL
    
        UPDATE CS
        SET CasketItemUsageResourceID = (
                CASE 
                    WHEN CS.CasketSalesItemId IS NOT NULL
                        THEN (
                                SELECT ISNULL(CCIL.AgreementLocationItemID, CCIL.AgreementMemorialItemId)
                                FROM CemeteryContractItemsLog CCIL
                                INNER JOIN #CemScheduleService CS1 ON CS1.CasketSalesItemId = CCIL.HMISSalesItemID
                                )
                    WHEN CS.CasketSalesId IS NOT NULL
                        THEN (
                                SELECT TOP 1 ISNULL(CCIL.AgreementLocationItemID, CCIL.AgreementMemorialItemId)
                                FROM #CemScheduleService CS1
                                INNER JOIN h_000.dbo.Sales_item SI ON CS1.CasketSalesId = SI.Sales_ID
                                    AND (
                                        CS1.CasketItemDescription = SI.Item_Cd_Desc
                                        OR CS1.CasketItemNumber = SI.Product_Item_Cd
                                        )
                                INNER JOIN CemeteryContractItemsLog CCIL ON (SI.sales_item_id = CCIL.HMISSalesItemID)
                                )
                    ELSE (
                            SELECT ISNULL(CCIL.AgreementLocationItemID, CCIL.AgreementMemorialItemId)
                            FROM #CemScheduleService CS1
                            INNER JOIN CemeteryContractItemsLog CCIL ON CCIL.TxnLineId = CS1.CasketTxnLineId
                            )
                    END
                )
            ,CasketItemUsageResourceType = (
                CASE 
                    WHEN CS.CasketSalesItemId IS NOT NULL
                        THEN (
                                SELECT CASE 
                                        WHEN CCIL.AgreementLocationItemId IS NOT NULL
                                            THEN 'AgreementLocationItem'
                                        WHEN CCIL.AgreementMemorialItemId IS NOT NULL
                                            THEN 'AgreementMemorialItem'
                                        ELSE NULL
                                        END
                                FROM CemeteryContractItemsLog CCIL
                                INNER JOIN #CemScheduleService CS1 ON CS1.CasketSalesItemId = CCIL.HMISSalesItemID
                                )
                    WHEN CS.CasketSalesId IS NOT NULL
                        THEN (
                                SELECT TOP 1 CASE 
                                        WHEN CCIL.AgreementLocationItemId IS NOT NULL
                                            THEN 'AgreementLocationItem'
                                        WHEN CCIL.AgreementMemorialItemId IS NOT NULL
                                            THEN 'AgreementMemorialItem'
                                        ELSE NULL
                                        END
                                FROM #CemScheduleService CS1
                                INNER JOIN h_000.dbo.Sales_item SI ON CS1.CasketSalesId = SI.Sales_ID
                                    AND (
                                        CS1.CasketItemDescription = SI.Item_Cd_Desc
                                        OR CS1.CasketItemNumber = SI.Product_Item_Cd
                                        )
                                INNER JOIN CemeteryContractItemsLog CCIL ON SI.sales_item_id = CCIL.HMISSalesItemID
                                )
                    ELSE (
                            SELECT CASE 
                                    WHEN CCIL.AgreementLocationItemId IS NOT NULL
                                        THEN 'AgreementLocationItem'
                                    WHEN CCIL.AgreementMemorialItemId IS NOT NULL
                                        THEN 'AgreementMemorialItem'
                                    ELSE NULL
                                    END
                            FROM #CemScheduleService CS1
                            INNER JOIN CemeteryContractItemsLog CCIL ON CCIL.TxnLineId = CS1.CasketTxnLineId
                            )
                    END
                )
        FROM #CemScheduleService CS
        WHERE CS.CasketId IS NOT NULL
    
        UPDATE CS
        SET CasketItemUsedStatus = CASE 
                WHEN CS.CasketItemUsageResourceType = 'AgreementMemorialItem'
                    THEN 'Used'
                ELSE CS.CasketItemUsedStatus
                END
        FROM #CemScheduleService CS
        WHERE CS.casketId IS NOT NULL
    
        UPDATE CS
        SET CasketItemUsedStatusId = IUS.id
        FROM #CemScheduleService CS
        INNER JOIN ItemUsageStatus IUS ON IUS.[status] = CS.CasketItemUsedStatus
    
        -- Update Urn items for inserting into ItemUsage
        UPDATE CS
        SET UrnItemUsedStatus = (
                CASE 
                    WHEN CS.completedOn IS NULL
                        THEN 'Selected'
                    ELSE 'Used'
                    END
                )
            ,UrnTxnLineId = TL.id
            ,UrnSalesItemId = TL.salesItemId
            ,UrnSalesId = LA.hmisSalesId
            ,UrnItemNumber = TL.itemNumber
            ,CS.UrnItemDescription = TL.ItemDescription
        FROM #CemScheduleService CS
        INNER JOIN cemportal.dbo.TxnLine TL ON CS.UrnId = TL.id
        INNER JOIN CEMPORTAL.DBO.Txn T ON TL.txn = T.id
        LEFT JOIN (
            SELECT DISTINCT txn
                ,Arrangement
                ,hmisSalesId
            FROM LinkAgreement
            ) LA -- Only arrangement present in this is required for migration of scheduling data
            ON TL.txn = LA.Txn
        WHERE CS.UrnId IS NOT NULL
    
        UPDATE CS
        SET UrnItemUsageResourceID = (
                CASE 
                    WHEN CS.CasketSalesItemId IS NOT NULL
                        THEN (
                                SELECT ISNULL(CCIL.AgreementLocationItemID, CCIL.AgreementMemorialItemId)
                                FROM CemeteryContractItemsLog CCIL
                                INNER JOIN #CemScheduleService CS1 ON CS1.UrnSalesItemId = CCIL.HMISSalesItemID
                                )
                    WHEN CS.UrnSalesId IS NOT NULL
                        THEN (
                                SELECT TOP 1 ISNULL(CCIL.AgreementLocationItemID, CCIL.AgreementMemorialItemId)
                                FROM #CemScheduleService CS1
                                INNER JOIN h_000.dbo.Sales_item SI ON CS1.UrnSalesId = SI.Sales_ID
                                    AND (
                                        CS1.UrnItemDescription = SI.Item_Cd_Desc
                                        OR CS1.UrnItemNumber = SI.Product_Item_Cd
                                        )
                                INNER JOIN CemeteryContractItemsLog CCIL ON (SI.sales_item_id = CCIL.HMISSalesItemID)
                                )
                    ELSE (
                            SELECT ISNULL(CCIL.AgreementLocationItemID, CCIL.AgreementMemorialItemId)
                            FROM #CemScheduleService CS1
                            INNER JOIN CemeteryContractItemsLog CCIL ON CCIL.TxnLineId = CS1.UrnTxnLineId
                            )
                    END
                )
            ,UrnItemUsageResourceType = (
                CASE 
                    WHEN CS.CasketSalesItemId IS NOT NULL
                        THEN (
                                SELECT CASE 
                                        WHEN CCIL.AgreementLocationItemId IS NOT NULL
                                            THEN 'AgreementLocationItem'
                                        WHEN CCIL.AgreementMemorialItemId IS NOT NULL
                                            THEN 'AgreementMemorialItem'
                                        ELSE NULL
                                        END
                                FROM CemeteryContractItemsLog CCIL
                                INNER JOIN #CemScheduleService CS1 ON CS1.UrnSalesItemId = CCIL.HMISSalesItemID
                                )
                    WHEN CS.UrnSalesId IS NOT NULL
                        THEN (
                                SELECT TOP 1 CASE 
                                        WHEN CCIL.AgreementLocationItemId IS NOT NULL
                                            THEN 'AgreementLocationItem'
                                        WHEN CCIL.AgreementMemorialItemId IS NOT NULL
                                            THEN 'AgreementMemorialItem'
                                        ELSE NULL
                                        END
                                FROM #CemScheduleService CS1
                                INNER JOIN h_000.dbo.Sales_item SI ON CS1.UrnSalesId = SI.Sales_ID
                                    AND (
                                        CS1.UrnItemDescription = SI.Item_Cd_Desc
                                        OR CS1.UrnItemNumber = SI.Product_Item_Cd
                                        )
                                INNER JOIN CemeteryContractItemsLog CCIL ON (SI.sales_item_id = CCIL.HMISSalesItemID)
                                )
                    ELSE (
                            SELECT CASE 
                                    WHEN CCIL.AgreementLocationItemId IS NOT NULL
                                        THEN 'AgreementLocationItem'
                                    WHEN CCIL.AgreementMemorialItemId IS NOT NULL
                                        THEN 'AgreementMemorialItem'
                                    ELSE NULL
                                    END
                            FROM #CemScheduleService CS1
                            INNER JOIN CemeteryContractItemsLog CCIL ON CCIL.TxnLineId = CS1.UrnTxnLineId
                            )
                    END
                )
        FROM #CemScheduleService CS
        WHERE CS.UrnId IS NOT NULL
    
        UPDATE CS
        SET UrnItemUsedStatus = CASE 
                WHEN CS.UrnItemUsageResourceType = 'AgreementMemorialItem'
                    THEN 'Used'
                ELSE CS.UrnItemUsedStatus
                END
        FROM #CemScheduleService CS
        WHERE CS.UrnId IS NOT NULL
    
        UPDATE CS
        SET UrnItemUsedStatusId = IUS.id
        FROM #CemScheduleService CS
        INNER JOIN ItemUsageStatus IUS ON IUS.[status] = CS.UrnItemUsedStatus
    
        -- Update the property id
        UPDATE CS
        SET OnePortalPropertyId = P.id
        FROM #CemScheduleService CS
        INNER JOIN cemportal.dbo.TxnLine TL ON TL.id = CS.intermentPropertyId
        LEFT JOIN h_000.DBO.Sales_Item SI ON TL.salesItemId = SI.Sales_Item_ID
        LEFT JOIN Property P ON SI.Lot_Sell_Unit_ID = P.lotSellUnitId
            OR TL.groupId = P.lotSellUnitId
        WHERE CS.IsIntermentRight = 1
    
        -- SELECT OnePortalPropertyId,* FROM #CemScheduleService
        -- Update the Disinterment property id
        UPDATE CS
        SET OnePortalPropertyId = P.id
        FROM #CemScheduleService CS
        INNER JOIN cemportal.dbo.TxnLine TL ON TL.id = CS.DisIntermentPropertyId
        LEFT JOIN h_000.DBO.Sales_Item SI ON TL.salesItemId = SI.Sales_Item_ID
        LEFT JOIN Property P ON SI.Lot_Sell_Unit_ID = P.lotSellUnitId
            OR TL.groupId = P.lotSellUnitId
        WHERE CS.IsDisintermentRight = 1
    
        -- Update apc employee Id for Inserting into OnePortal WorkOrder and EmployeeSchedule.
        UPDATE CS
        SET CS.workOrderOwnerId = E.id
            ,CS.OnePortalApcCounselorEmployeeId = E.id
        FROM #CemScheduleService CS
        INNER JOIN h_000.dbo.Sales_Counselor SC ON SC.[Name] = CASE 
                WHEN CS.apcCounselor = 'Margaret Carmen Hernandez'
                    THEN 'margarita hernandez'
                WHEN CS.apcCounselor = 'Lisa Chan - 98271'
                    THEN 'Lisa Chan'
                WHEN CS.apcCounselor = 'Anita Sit - 98232 P'
                    THEN 'Anita Sit'
                ELSE CS.apcCounselor
                END
        LEFT JOIN Employee E ON E.salesCounselorId = SC.Sales_Counselor_ID
        WHERE CS.apcCounselor IS NOT NULL
    
        -- Update backup employee Id for Inserting into EmployeeSchedule.
        UPDATE CS
        SET CS.OnePortalbackupCounselorEmployeeId = E.id
        FROM #CemScheduleService CS
        INNER JOIN h_000.dbo.Sales_Counselor SC ON SC.[Name] = CASE 
                WHEN CS.backupCounselor = 'Margaret Carmen Hernandez'
                    THEN 'margarita hernandez'
                WHEN CS.backupCounselor = 'Lisa Chan - 98271'
                    THEN 'Lisa Chan'
                WHEN CS.backupCounselor = 'Anita Sit - 98232 P'
                    THEN 'Anita Sit'
                ELSE CS.backupCounselor
                END
        LEFT JOIN Employee E ON E.salesCounselorId = SC.Sales_Counselor_ID
        WHERE CS.backupCounselor IS NOT NULL
    
        -- Update leadIn employee Id for Inserting into EmployeeSchedule.
        UPDATE CS
        SET CS.OnePortalleadInCounselorEmployeeId = E.id
        FROM #CemScheduleService CS
        INNER JOIN h_000.dbo.Sales_Counselor SC ON SC.[Name] = CASE 
                WHEN CS.leadInCounselor = 'Margaret Carmen Hernandez'
                    THEN 'margarita hernandez'
                WHEN CS.leadInCounselor = 'Lisa Chan - 98271'
                    THEN 'Lisa Chan'
                WHEN CS.leadInCounselor = 'Anita Sit - 98232 P'
                    THEN 'Anita Sit'
                ELSE CS.leadInCounselor
                END
        LEFT JOIN Employee E ON E.salesCounselorId = SC.Sales_Counselor_ID
        WHERE CS.leadInCounselor IS NOT NULL
    
        UPDATE CS
        SET CS.OnePortalWorkOrderStatusId = CASE 
                WHEN CS.completedOn IS NOT NULL
                    THEN 3
                WHEN CS.apcCounselor IS NOT NULL
                    THEN 2
                ELSE 1
                END
        FROM #CemScheduleService CS
    
        ---------------------------------------------------------
        --------------------- Funeral Arragnement Section --------------------
        ---------------------------------------------------------
        SELECT FH.funeralHomeId
            ,FH.funeralHomeName
            ,A.Id AS arrangementId
            ,A.funeralArrangementFuneralDirector
            ,A.funeralArrangementInstructions AS instruction
            ,A.visitation1Date
            ,A.visitation2Date
            ,A.visitation3Date
            ,A.viewingDate
            ,A.receptionDate
            ,A.visitation1StartTime
            ,A.visitation2StartTime
            ,A.visitation3StartTime
            ,A.viewingStartTime
            ,A.receptionStartTime
            ,A.visitation1EndTime
            ,A.visitation2EndTime
            ,A.visitation3EndTime
            ,A.viewingEndTime
            ,A.receptionEndTime
            ,A.visitation1Location
            ,A.visitation2Location
            ,A.visitation3Location
            ,A.viewingLocation
            ,A.receptionRoom
            ,CS.OnePortalfuneralArrangementSectionId
            ,CS.OnePortalfuneralArrangementSectionLocationId
            ,CONVERT(INT, NULL) AS clFacilityLocationId
            ,CONVERT(INT, NULL) AS serviceLocationId
            ,CONVERT(VARCHAR, NULL) AS funeralHomePhone
            ,CONVERT(VARCHAR, NULL) AS phone
            ,CONVERT(INT, NULL) AS funeralDirectorId
            ,CONVERT(VARCHAR, NULL) AS OutsideFuneralDirector
        INTO #FuneralArragnementSection
        FROM #CemScheduleService CS
        INNER JOIN cemportal.dbo.Arrangement A ON A.id = CS.arrangementId
        INNER JOIN cemportal.dbo.FuneralHome FH ON A.funeralhome = Fh.funeralHomeId
    
        UPDATE FAS
        SET clFacilityLocationId = L.id
            ,funeralHomePhone = L.phoneNumber
        FROM #FuneralArragnementSection FAS
        INNER JOIN [Location] L ON L.name = CASE 
                WHEN FAS.funeralHomeName = 'All County Cremation Services'
                    OR FAS.funeralHomeName = 'ALL COUNTY CREMATION'
                    THEN 'All County Cremation Service'
                WHEN FAS.funeralHomeName = 'Crosby N Gray'
                    THEN 'Crosby-N. Gray & Co. Funeral Home'
                WHEN FAS.funeralHomeName = 'Product Name Funeral Home'
                    THEN 'Product Name'
                ELSE FAS.funeralHomeName
                END
    
        UPDATE FAS
        SET serviceLocationId = OL.newId
            ,funeralHomePhone = O.phoneNumber
        FROM #FuneralArragnementSection FAS
        INNER JOIN OrganizationLog OL ON OL.OldcemFuneralHomeId = FAS.FuneralHomeId
        INNER JOIN Organization O ON O.id = OL.newId
    
        UPDATE FAS
        SET funeralDirectorId = E.id
            ,phone = E.phoneNumber
            ,OutsideFuneralDirector = CASE 
                WHEN E.id IS NULL
                    THEN FAS.funeralArrangementFuneralDirector
                ELSE NULL
                END
        FROM #FuneralArragnementSection FAS
        INNER JOIN h_000.dbo.Sales_Counselor SC ON SC.[Name] = FAS.funeralArrangementFuneralDirector
        LEFT JOIN Employee E ON E.salesCounselorId = SC.Sales_Counselor_ID
    
        UPDATE CS
        SET CS.funeralHomeId = FAS.funeralHomeId
            ,CS.clFacilityLocationId = FAS.clFacilityLocationId
            ,CS.serviceLocationId = FAS.serviceLocationId
            ,CS.funeralDirectorId = FAS.funeralDirectorId
        FROM #CemScheduleService CS
        INNER JOIN #FuneralArragnementSection FAS ON CS.arrangementId = FAS.arrangementId
    
        -------------------------------------------------------
        ------ END Of Funeral Arragnement Section -------------
        -------------------------------------------------------

        EXEC Insert_Schedule_Item_Usage

        DECLARE @IsIntermentRightService BIT
        DECLARE @OnePortalPropertyId INT
        DECLARE @IsDisintermentRightService BIT
        DECLARE @IsCremationService BIT
        DECLARE @ServiceItemUsageId INT
        DECLARE @WorkOrderPersonId INT
    
        SELECT @IsIntermentRightService = IsIntermentRight
            ,@OnePortalPropertyId = OnePortalPropertyId
            ,@IsDisintermentRightService = IsDisintermentRight
            ,@IsCremationService = IsCremationService
            ,@ServiceItemUsageId = OnePortalServiceItemUsageID
            ,@WorkOrderPersonId = PersonId
        FROM #CemScheduleService
    
        IF (
                @IsIntermentRightService = 1
                AND @OnePortalPropertyId IS NOT NULL
                )
            OR (@IsDisintermentRightService = 1)
            OR (@IsCremationService = 1)
            AND 
            @ServiceItemUsageId IS NOT NULL AND
                 @WorkOrderPersonId IS NOT NULL
        BEGIN
    
            -- SELECT PersonId,OnePortalPropertyId,PropertyItemUsageResourceID,PropertyItemUsageResourceType FROM #CemScheduleService  
            EXEC Insert_Property_Item_usage
    
            -- SELECT OnePortalPropertyId,PropertyItemUsageResourceID,PropertyItemUsageResourceType,PropertyTxnLineSalesItemId,
            -- PropertySalesId,
            -- PropertyTxnLineItemNumber FROM #CemScheduleService
            EXEC Insert_Interment_Information_Section_Data
    
            EXEC Insert_Disinterment_Info_Section_Data
    
            EXEC Insert_Interment_Request_Section_Data
    
            EXEC Insert_Cemetery_Scheduled_Property
    
            EXEC Insert_Vault_Section_Item_Usage
    
            EXEC Insert_Vault_Section_Data
    
            EXEC Insert_Casket_Section_Item_Usage
    
            EXEC Insert_Casket_Section_Data
    
            EXEC Insert_Urn_Information_Section_Item_Usage
    
            EXEC Insert_Urn_Information_Section_Data
    
            EXEC Insert_Generic_Section_Data
    
            EXEC Insert_Scheduled_Cemetry_Service_Data
    
            UPDATE UI
            SET scheduledCemeteryServiceId = CS.OnePortalCemScheduleServiceId
            FROM UrnInformationSection UI
            INNER JOIN #CemScheduleService CS ON CS.OnePortalUrnInformationSectionId = UI.id
    
            EXEC Insert_Merchandise_AdditionalInfo_Section_Data
    
            EXEC Insert_Work_Order_Data
    
            EXEC Insert_Work_Order_Detail_Data
    
            EXEC Insert_Work_Order_Casket_Info_Data
    
            EXEC Insert_Employee_Schedule_Data @EmployeeType = 'apcCounselor'
    
            EXEC Insert_Employee_Schedule_Data @EmployeeType = 'leadInCounselor'
    
            EXEC Insert_Employee_Schedule_Data @EmployeeType = 'backupCounselor'
    
            EXEC Insert_Funeral_Arrangement_Section_Data
    
            EXEC Insert_Funeral_Arrangement_Section_Location_Data
        END
    
        MERGE INTO SchedulingCemeteryWorkOrderLog AS TGT
        USING (
            SELECT *
            FROM #CemScheduleService
            ) CS
            ON TGT.ID = CS.SchedulingCemeteryWorkOrderLogId
        WHEN NOT MATCHED
            THEN
                INSERT (
                    ArrangementId
                    ,PersonId
                    ,PropertyId
                    ,TxnId
                    ,TxnLineId
                    ,TxnLineItemnumber
                    ,CemWorkOrderId
                    ,funeralHomeId
                    ,WorkOrderId
                    ,IsIntermentRight
                    ,ISDisintermentRight
                    ,IsCremationService
                    ,IsCemeteryService
                    ,ScheduledCemeteryServiceId
                    ,ServiceItemUsageID
                    ,ServiceItemUsageResourceID
                    ,VaultTxnLineId
                    ,UrnTxnLineId
                    ,CasketTxnLineId
                    ,intermentInformationSectionId
                    ,disintermentInfoSectionId
                    ,intermentRequestSectionId
                    ,vaultSectionId
                    ,VaultItemUsageID
                    ,VaultItemUsageResourceID
                    ,casketSectionId
                    ,CasketItemUsageID
                    ,CasketItemUsageResourceID
                    ,urnInformationSectionId
                    ,UrnItemUsageID
                    ,UrnItemUsageResourceID
                    ,merchandiseAdditionalInfoSectionId
                    ,genericSectionId
                    ,funeralArrangementSectionId
                    ,funeralArrangementSectionLocationId
                    ,clFacilityLocationId
                    ,serviceLocationId
                    ,funeralDirectorId
                    ,createdAt
                    ,updatedAt
                    ,PropertyItemUsageResourceID
                    ,intermentPropertyId
                    ,DisIntermentPropertyId
                    ,PropertyItemUsageID
                    ,CemeteryScheduledPropertyId
                    )
                VALUES (
                    CS.ArrangementId
                    ,CS.PersonId
                    ,CS.OnePortalPropertyId
                    ,CS.txnId
                    ,CS.TxnLineId
                    ,CS.ItemNumber
                    ,CS.WorkOrderId
                    ,CS.funeralHomeId
                    ,CS.OnePortalWorkOrderPrimaryId
                    ,CS.IsIntermentRight
                    ,CS.ISDisintermentRight
                    ,CS.IsCremationService
                    ,NULL
                    ,CS.OnePortalCemScheduleServiceId
                    ,CS.OnePortalServiceItemUsageID
                    ,CS.ServiceItemUsageResourceID
                    ,CS.VaultTxnLineId
                    ,CS.UrnTxnLineId
                    ,CS.CasketTxnLineId
                    ,CS.OnePortalIntermentInformationSectionId
                    ,CS.OnePortalDisintermentInfoSectionId
                    ,CS.OnePortalIntermentRequestSectionId
                    ,CS.OnePortalVaultSectionId
                    ,CS.OnePortalVaultItemUsageID
                    ,CS.VaultItemUsageResourceID
                    ,CS.OnePortalCasketSectionId
                    ,CS.OnePortalCasketItemUsageID
                    ,CS.CasketItemUsageResourceID
                    ,CS.OnePortalUrnInformationSectionId
                    ,CS.OnePortalUrnItemUsageID
                    ,CS.UrnItemUsageResourceID
                    ,CS.OnePortalmerchandiseAdditionalInfoSectionId
                    ,CS.OnePortalgenericSectionId
                    ,CS.OnePortalfuneralArrangementSectionId
                    ,CS.OnePortalfuneralArrangementSectionLocationId
                    ,CS.clFacilityLocationId
                    ,CS.serviceLocationId
                    ,CS.funeralDirectorId
                    ,CS.createdAt
                    ,CS.updatedAt
                    ,CS.PropertyItemUsageResourceID
                    ,CS.intermentPropertyId
                    ,CS.DisIntermentPropertyId
                    ,CS.OnePortalPropertyItemUsageID
                    ,CS.CemeteryScheduledPropertyId
                    )
        WHEN MATCHED
            THEN
                UPDATE
                SET ArrangementId = CS.ArrangementId
                    ,PersonId = CS.PersonId
                    ,PropertyId = CS.OnePortalPropertyId
                    ,TxnId = CS.txnId
                    ,TxnLineId = CS.TxnLineId
                    ,TxnLineItemnumber = CS.ItemNumber
                    ,CemWorkOrderId = CS.WorkOrderId
                    ,funeralHomeId = CS.funeralHomeId
                    ,WorkOrderId = CS.OnePortalWorkOrderPrimaryId
                    ,IsIntermentRight = CS.IsIntermentRight
                    ,ISDisintermentRight = CS.ISDisintermentRight
                    ,IsCremationService = CS.IsCremationService
                    ,IsCemeteryService = NULL
                    ,ScheduledCemeteryServiceId = CS.OnePortalCemScheduleServiceId
                    ,ServiceItemUsageID = CS.OnePortalServiceItemUsageID
                    ,ServiceItemUsageResourceID = CS.ServiceItemUsageResourceID
                    ,VaultTxnLineId = CS.VaultTxnLineId
                    ,UrnTxnLineId = CS.UrnTxnLineId
                    ,CasketTxnLineId = CS.CasketTxnLineId
                    ,intermentInformationSectionId = CS.OnePortalIntermentInformationSectionId
                    ,disintermentInfoSectionId = CS.OnePortalDisintermentInfoSectionId
                    ,intermentRequestSectionId = CS.OnePortalIntermentRequestSectionId
                    ,vaultSectionId = CS.OnePortalVaultSectionId
                    ,VaultItemUsageID = CS.OnePortalVaultItemUsageID
                    ,VaultItemUsageResourceID = CS.VaultItemUsageResourceID
                    ,casketSectionId = CS.OnePortalCasketSectionId
                    ,CasketItemUsageID = CS.OnePortalCasketItemUsageID
                    ,CasketItemUsageResourceID = CS.CasketItemUsageResourceID
                    ,urnInformationSectionId = CS.OnePortalUrnInformationSectionId
                    ,UrnItemUsageID = CS.OnePortalUrnItemUsageID
                    ,UrnItemUsageResourceID = CS.UrnItemUsageResourceID
                    ,merchandiseAdditionalInfoSectionId = CS.OnePortalmerchandiseAdditionalInfoSectionId
                    ,genericSectionId = CS.OnePortalgenericSectionId
                    ,funeralArrangementSectionId = CS.OnePortalfuneralArrangementSectionId
                    ,funeralArrangementSectionLocationId = CS.OnePortalfuneralArrangementSectionLocationId
                    ,clFacilityLocationId = CS.clFacilityLocationId
                    ,serviceLocationId = CS.serviceLocationId
                    ,funeralDirectorId = CS.funeralDirectorId
                    ,createdAt = CS.createdAt
                    ,updatedAt = CS.updatedAt
                    ,PropertyItemUsageResourceID = CS.PropertyItemUsageResourceID
                    ,intermentPropertyId = CS.intermentPropertyId
                    ,DisIntermentPropertyId = CS.DisIntermentPropertyId
                    ,PropertyItemUsageID = CS.OnePortalPropertyItemUsageID
                    ,CemeteryScheduledPropertyId = CS.CemeteryScheduledPropertyId;
    
        -- INSERT INTO [SchedulingCemeteryWorkOrderLog] (
        -- ArrangementId,
        -- PersonId,
        -- -- PropertyId,
        -- TxnId,
        -- TxnLineId,
        -- TxnLineItemnumber,
        -- CemWorkOrderId,
        -- funeralHomeId,
        -- WorkOrderId,
        -- IsIntermentRight,
        -- ISDisintermentRight,
        -- IsCremationService,
        -- IsCemeteryService,
        -- ScheduledCemeteryServiceId,
        -- ServiceItemUsageID,
        -- ServiceItemUsageResourceID,
        -- VaultTxnLineId,
        -- UrnTxnLineId,
        -- CasketTxnLineId,
        -- intermentInformationSectionId,
        -- disintermentInfoSectionId,
        -- intermentRequestSectionId,
        -- vaultSectionId,
        -- VaultItemUsageID,
        -- VaultItemUsageResourceID,
        -- casketSectionId,
        -- CasketItemUsageID,
        -- CasketItemUsageResourceID,
        -- urnInformationSectionId,
        -- UrnItemUsageID,
        -- UrnItemUsageResourceID,
        -- merchandiseAdditionalInfoSectionId,
        -- genericSectionId,
        -- funeralArrangementSectionId,
        -- clFacilityLocationId,
        -- serviceLocationId,
        -- funeralDirectorId,
        -- createdAt,
        -- updatedAt
        -- 	)
        -- SELECT 
        -- CS.ArrangementId,
        -- CS.PersonId,
        -- -- CS.OnePortalPropertyId,
        -- CS.txnId,
        -- CS.TxnLineId,
        -- CS.ItemNumber,
        -- CS.WorkOrderId,
        -- CS.funeralHomeId,
        -- CS.OnePortalWorkOrderPrimaryId,
        -- CS.IsIntermentRight,
        -- CS.ISDisintermentRight,
        -- CS.IsCremationService,
        -- NULL,
        -- CS.OnePortalCemScheduleServiceId,
        -- CS.OnePortalServiceItemUsageID,
        -- CS.ServiceItemUsageResourceID,
        -- CS.VaultTxnLineId,
        -- CS.UrnTxnLineId,
        -- CS.CasketTxnLineId,
        -- CS.OnePortalIntermentInformationSectionId,
        -- CS.OnePortalDisintermentInfoSectionId,
        -- CS.OnePortalIntermentRequestSectionId,
        -- CS.OnePortalVaultSectionId,
        -- CS.OnePortalVaultItemUsageID,
        -- CS.VaultItemUsageResourceID,
        -- CS.OnePortalCasketSectionId,
        -- CS.OnePortalCasketItemUsageID,
        -- CS.CasketItemUsageResourceID,
        -- CS.OnePortalUrnInformationSectionId,
        -- CS.OnePortalUrnItemUsageID,
        -- CS.UrnItemUsageResourceID,
        -- CS.OnePortalmerchandiseAdditionalInfoSectionId,
        -- CS.OnePortalgenericSectionId,
        -- CS.OnePortalfuneralArrangementSectionId,
        -- CS.clFacilityLocationId,
        -- CS.serviceLocationId,
        -- CS.funeralDirectorId,
        -- CS.createdAt,
        -- CS.updatedAt
        -- FROM #CemScheduleService CS
        DROP TABLE #CemScheduleService
    
        DROP TABLE #FuneralArragnementSection
            -- SELECT 'Root SP',DATEDIFF(millisecond,@RootSpStartTime,GETDATE())
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
