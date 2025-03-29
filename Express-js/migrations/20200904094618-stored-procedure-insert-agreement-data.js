'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Insert_Agreement_Data') IS NOT NULL
    --DROP PROCEDURE Insert_Agreement_Data


    CREATE PROCEDURE [dbo].[Insert_Agreement_Data] (
      @agreementId INT OUTPUT,
      @isCemportal BIT,
      @SP VARCHAR(1000)
      )
    AS
    BEGIN
      DECLARE @AgreementFuneralPortalLogID INT
      DECLARE @AgreementCemPortalLogID INT
      DECLARE @message NVARCHAR(100)
    
      --DECLARE @existing_agreementId INT = - 1
      --Tejo 20200623: If aggreement is already existing then it should be present in AGREEMENTFUNERALPORTALLOG , OldCaseId column
      --SELECT TOP 1 @existing_agreementId = AgreementId
      --FROM #Agreement A
      --INNER JOIN AGREEMENTFUNERALPORTALLOG L
      --	ON L.OldCaseId = A.[funportal_local.Case.ID]
      IF  (
          SELECT COUNT(1)
          FROM #Agreement
          WHERE AgreementId IS NULL
          ) > 0
      BEGIN
        INSERT INTO [dbo].[Agreement] (
          [saleTypeId],
          [contractNumber],
          [status],
          [locationId],
          [type],
          [needType],
          [arrangerId],
          [createdBy],
          [updatedBy],
          [createdAt],
          [updatedAt],
          [totalPrice],
          [totalCashPrice],
          [totalTax],
          [totalPurchasePrice],
          [totalAdjustment],
          [due],
          [totalPaid],
          isValidated
          )
        SELECT SaleTypeId,
          ContractNumber,
          SaleStatus,
          LocationId,
          AgreementType,
          AgreementNeedType,
          ArrangerId,
          CreatedBy,
          UpdatedBy,
          CreatedAt,
          UpdatedAt,
          TotalPrice,
          TotalCashPrice,
          TotalTax,
          TotalPurchasePrice,
          TotalAdjustment,
          Due,
          TotalPaid,
          IsValidated
        FROM #Agreement
    
        SELECT @agreementId = @@IDENTITY, --to return the new ID outside
          @message = 'New [Agreement] row inserted'
          --SELECT 'Inserted Agreement' 'Inserted Agreement',
          --	*,
          --	object_name(@@PROCID) AS 'SQL.SP'
          --FROM Agreement
          --WHERE ID = @agreementId
      END
      ELSE
      BEGIN
        UPDATE A
        SET [saleTypeId] = tmp.SaleTypeId,
          [contractNumber] = tmp.ContractNumber,
          [status] = tmp.SaleStatus,
          [locationId] = tmp.LocationId,
          [type] = tmp.AgreementType,
          [needType] = tmp.AgreementNeedType,
          [arrangerId] = tmp.ArrangerId,
          [createdBy] = tmp.CreatedBy,
          [updatedBy] = tmp.UpdatedBy,
          [createdAt] = tmp.CreatedAt,
          [updatedAt] = tmp.UpdatedAt,
          [totalPrice] = tmp.TotalPrice,
          [totalCashPrice] = tmp.TotalCashPrice,
          [totalTax] = tmp.TotalTax,
          [totalPurchasePrice] = tmp.TotalPurchasePrice,
          [totalAdjustment] = tmp.TotalAdjustment,
          [due] = tmp.Due,
          isValidated = tmp.isValidated,
          [totalPaid] = tmp.TotalPaid,
          @agreementId = A.id, ----to return the agreement ID outside
          @message = 'Existing [Agreement] row updated'
        FROM Agreement A
        INNER JOIN #Agreement tmp
          ON A.ID = tmp.AgreementId
            --SELECT 'Updated Agreement' 'Updated Agreement',
            --	*,
            --	object_name(@@PROCID) AS 'SQL.SP'
            --FROM Agreement
            --WHERE ID = @agreementId
      END
    
      -- DECLARE @arrangementId INT = NULL
      --set new/existing Agreement.ID into #Agreement
      UPDATE #Agreement
      SET AgreementId = @agreementId
    
      IF @isCemportal = 1
      BEGIN
        PRINT 'CEMPORTAL LOG'
    
        --update existing [AgreementFuneralPortalLog] row if exists, join by CaseId
        UPDATE ACPL
        SET ACPL.AgreementId = A.AgreementId,
          ACPL.OldArrangementId = A.ArrangementId,
          ACPL.ContractNumber = A.ContractNumber,
          ACPL.Sales_id = A.Sales_ID,
          ACPL.Sales_Finance_id = A.Sales_Finance_id,
          ACPL.TxnId = A.TxnId,
          ACPL.Message = 'Updated existing arrangement',
          ACPL.OnePortalEmployeeId = A.ArrangerId,
          ACPL.sales_counselor_id = A.Sales_Counselor_ID,
          ACPL.MapData = 1,
          @AgreementCemPortalLogID = ID
        FROM AGREEMENTCEMPORTALLOG ACPL
        INNER JOIN #Agreement A
          ON ACPL.ID = A.AgreementCemPortalLogId
    
        IF ISNULL(@AgreementCemPortalLogID, 0) = 0
        BEGIN
          --TODO AgreementFuneralPortalLog stays for Funportal source ? 20200620 ->YES
          --save the log after Agreement is inserted
          INSERT INTO AGREEMENTCEMPORTALLOG (
            AgreementID,
            OldArrangementId,
            [ContractNumber],
            [Sales_id],
            [Sales_Finance_id],
            [TxnId],
            [Message],
            OnePortalEmployeeId,
            sales_counselor_id,
            StartDateTime,
            StopDateTime,
            MapData
            )
          SELECT @agreementId,
            A.ArrangementId,
            ContractNumber,
            Sales_ID,
            Sales_Finance_id,
            TxnId,
            @Message,
            A.ArrangerId, -- Oneportal..Employee.id
            A.Sales_Counselor_ID,
            createdAt,
            GETDATE(),
            1
          FROM #Agreement A
    
          SELECT @AgreementCemPortalLogID = @@IDENTITY --to store the [AgreementFuneralPortalLog].ID in #Agreement.[AgreementFuneralPortalLog.ID] and than to [FuneralContractItemsLog].AgreementFuneralPortalLogId
        END
      END
      ELSE IF @isCemportal = 0
      BEGIN
        PRINT 'FUNERAL PORTAL LOG'
    
        --update existing [AgreementFuneralPortalLog] row if exists, join by CaseId
        UPDATE AFPL
        SET AFPL.AgreementId = A.AgreementId,
          AFPL.OldCaseId = A.CaseID,
          AFPL.OldTransactionId = A.TransactionID,
          AFPL.ContractNumber = A.ContractNumber,
          AFPL.Sales_Id = A.Sales_Id,
          AFPL.Sales_Finance_Id = A.Sales_Finance_Id,
          AFPL.Message = 'Updated existing arrangement',
          AFPL.MapData = 1,
          @AgreementFuneralPortalLogID = ID
        FROM AgreementFuneralPortalLog AFPL
        INNER JOIN #Agreement A
          ON AFPL.ID = A.AgreementFuneralPortalLogID
    
        IF ISNULL(@AgreementFuneralPortalLogID, 0) = 0
        BEGIN
          --save the log after Agreement is inserted
          INSERT INTO AgreementFuneralPortalLog (
            AgreementID,
            OldCaseId,
            OldTransactionId,
            ContractNumber,
            Sales_Id,
            Sales_Finance_Id,
            Message,
            StartDateTime,
            StopDateTime,
            MapData
            )
          SELECT @agreementId,
            A.CaseID,
            A.TransactionID,
            A.ContractNumber,
            Sales_Id,
            Sales_Finance_Id,
            @Message,
            CreatedAt,
            GETDATE(),
            1
          FROM #Agreement A
    
          SELECT @AgreementFuneralPortalLogID = @@IDENTITY --to store the [AgreementFuneralPortalLog].ID in #Agreement.[AgreementFuneralPortalLog.ID] and than to [FuneralContractItemsLog].AgreementFuneralPortalLogId
        END
      END
    
      --here is always just one row, no need to use 'where'
      --set new/existing Agreement.ID into #Agreement
      UPDATE #Agreement
      SET AgreementId = @agreementId,
        AgreementFuneralPortalLogID = @AgreementFuneralPortalLogID, --to store the [AgreementFuneralPortalLog].ID in #Agreement.[AgreementFuneralPortalLog.ID] and than to [FuneralContractItemsLog].AgreementFuneralPortalLogId
        AgreementCemPortalLogID = @AgreementCemPortalLogID
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
