'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Insert_AgreementPaymentItem_Data') IS NOT NULL
    --DROP PROCEDURE Insert_AgreementPaymentItem_Data


    CREATE PROCEDURE [dbo].[Insert_AgreementPaymentItem_Data] (@isCemportal BIT = 1)
    AS
    BEGIN
      DECLARE @PaymentLog TABLE (
        [AgreementID] INT NOT NULL,
        [PaymentId] INT,
        [PayorId] INT,
        [HMISSalesId] INT,
        [HmisPaymentId] INT,
        [HMISCashReceiptID] INT,
        [HMISCashReceiptReferenceNbr] NVARCHAR(30),
        [HMISCashReceiptCashReceiptNBR] NVARCHAR(30),
        [HMISSalesDownPymtReceiptNbr] NVARCHAR(30),
        [HMISSalesCashReceiptID] INT,
        [HMISSalesDownPymtSalesCashApplicationId] INT,
        [HMISSalesCashApplicationID] INT,
        [HMISCashReceiptAmt] INT,
        [HMISSalesDownPymtSalesDownPymtId] INT,
        [CemeteryTxnId] INT,
        [CemeteryPaymentId] INT,
        [FuneralCaseId] INT,
        [FuneralPaymentId] INT,
        [CemeteryPaymentLogId] INT,
        [FuneralPaymentLogId] INT,
        [IsFinanceOption] BIT
        )

      MERGE INTO Payment AS TGT
      USING (
        SELECT ReferenceNumber,
          ReceiptNumber,
          resourceId,
          PayorId,
          otherInfo,
          createdBy,
          createdAt,
          updatedAt,
          PaymentType,
          AgreementID,
          Sales_ID,
          amount,
          CashReceiptReferenceNbr,
          CashReceiptNbr,
          SalesDownPymtReceiptNbr,
          SalesCashReceiptID,
          SalesDownPymtSalesCashApplicationID,
          SalesCashApplicationID,
          SalesDownPymtSalesDownPymtID,
          CashReceiptAmt,
          HmisPaymentId,
          organizationId,
          cemeteryPaymentId,
          cemeteryTxnId,
          FuneralCaseId,
          FuneralPaymentId,
          CemeteryPaymentLogId,
          FuneralPaymentLogId,
          PaymentId,
          IsFinanceOption,
          PaymentStatus
        FROM #AgreementPayment
        ) P
        ON TGT.ID = P.PaymentId --Check if transaction is already inserted
      WHEN NOT MATCHED
        THEN
          INSERT (
            referenceNumber,
            receiptNumber,
            resourceId,
            payorId,
            amount,
            otherInfo,
            createdBy,
            createdAt,
            updatedAt,
            organizationId,
            paymentType,
            Status
            )
          VALUES (
            P.referenceNumber,
            P.receiptNumber,
            P.resourceId,
            P.payorId,
            P.amount,
            P.otherInfo,
            P.createdBy,
            P.createdAt,
            P.updatedAt,
            P.organizationId,
            P.paymentType,
            p.PaymentStatus
            )
      WHEN MATCHED
        THEN
          UPDATE
          SET referenceNumber = P.referenceNumber,
            receiptNumber = P.receiptNumber,
            resourceId = P.resourceId,
            payorId = P.payorId,
            amount = P.amount,
            otherInfo = P.otherInfo,
            createdBy = P.createdBy,
            createdAt = P.createdAt,
            updatedAt = P.updatedAt,
            organizationId = P.organizationId,
            paymentType = P.paymentType,
            status = P.PaymentStatus
      OUTPUT INSERTED.ID,
        P.[AgreementID],
        P.PayorId,
        P.[Sales_ID],
        P.[HmisPaymentId],
        P.[CashReceiptReferenceNbr],
        P.[CashReceiptNbr],
        P.[SalesDownPymtReceiptNbr],
        P.[SalesCashReceiptID],
        P.[SalesDownPymtSalesCashApplicationID],
        P.SalesCashApplicationID,
        P.[SalesDownPymtSalesDownPymtID],
        P.[CashReceiptAmt],
        P.cemeteryTxnId,
        P.cemeteryPaymentId,
        P.FuneralCaseId,
        P.FuneralPaymentId,
        P.CemeteryPaymentLogId,
        P.FuneralPaymentLogId,
        P.IsFinanceOption
      INTO @PaymentLog([PaymentId], [AgreementID], [PayorId], HMISSalesId, HmisPaymentId, [HMISCashReceiptReferenceNbr], [HMISCashReceiptCashReceiptNBR], [HMISSalesDownPymtReceiptNbr], [HMISSalesCashReceiptID], [HMISSalesDownPymtSalesCashApplicationId], [HMISSalesCashApplicationID], [HMISSalesDownPymtSalesDownPymtId], [HMISCashReceiptAmt], cemeteryTxnId, cemeteryPaymentId, FuneralCaseId, FuneralPaymentId, CemeteryPaymentLogId, FuneralPaymentLogId, IsFinanceOption);

      IF @IsCemPortal = 1
      BEGIN
        INSERT INTO CemeteryPaymentLog (
          [PaymentId],
          [AgreementID],
          [PayorId],
          HMISSalesId,
          HmisPaymentId,
          [HMISCashReceiptReferenceNbr],
          [HMISCashReceiptCashReceiptNBR],
          [HMISSalesDownPymtReceiptNbr],
          [HMISSalesCashReceiptID],
          [HMISSalesDownPymtSalesCashApplicationId],
          [HMISSalesCashApplicationID],
          [HMISSalesDownPymtSalesDownPymtId],
          [HMISCashReceiptAmt],
          CemeteryTxnId,
          CemeteryPaymentId,
          IsFinanceOption
          )
        SELECT CPL.PaymentId,
          CPL.AgreementID,
          CPL.PayorId,
          CPL.HMISSalesId,
          CPL.HmisPaymentId,
          CPL.HMISCashReceiptReferenceNbr,
          CPL.HMISCashReceiptCashReceiptNBR,
          CPL.HMISSalesDownPymtReceiptNbr,
          CPL.HMISSalesCashReceiptID,
          CPL.HMISSalesDownPymtSalesCashApplicationId,
          CPL.HMISSalesCashApplicationID,
          CPL.HMISSalesDownPymtSalesDownPymtId,
          CPL.HMISCashReceiptAmt,
          CPL.CemeteryTxnId,
          CPL.CemeteryPaymentId,
          CPL.IsFinanceOption
        FROM @PaymentLog CPL
        LEFT JOIN CemeteryPaymentLog CPLO
          ON CPL.CemeteryPaymentLogId = CPLO.id
        WHERE CPLO.id IS NULL
      END
      ELSE
      BEGIN
        INSERT INTO FuneralPaymentLog (
          [PaymentId],
          [AgreementID],
          [PayorId],
          HMISSalesId,
          HmisPaymentId,
          [HMISCashReceiptReferenceNbr],
          [HMISCashReceiptCashReceiptNBR],
          [HMISSalesDownPymtReceiptNbr],
          [HMISSalesCashReceiptID],
          [HMISSalesDownPymtSalesCashApplicationId],
          [HMISSalesCashApplicationID],
          [HMISSalesDownPymtSalesDownPymtId],
          [HMISCashReceiptAmt],
          FuneralCaseId,
          FuneralPaymentId,
          IsFinanceOption
          )
        SELECT PL.PaymentId,
          PL.AgreementID,
          PL.PayorId,
          PL.HMISSalesId,
          PL.HmisPaymentId,
          PL.HMISCashReceiptReferenceNbr,
          PL.HMISCashReceiptCashReceiptNBR,
          PL.HMISSalesDownPymtReceiptNbr,
          PL.HMISSalesCashReceiptID,
          PL.HMISSalesDownPymtSalesCashApplicationId,
          PL.HMISSalesCashApplicationID,
          PL.HMISSalesDownPymtSalesDownPymtId,
          PL.HMISCashReceiptAmt,
          PL.FuneralCaseId,
          PL.FuneralPaymentId,
          PL.IsFinanceOption
        FROM @PaymentLog PL
        LEFT JOIN FuneralPaymentLog FPLO
          ON PL.FuneralPaymentLogId = FPLO.id
        WHERE FPLO.id IS NULL
      END
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
