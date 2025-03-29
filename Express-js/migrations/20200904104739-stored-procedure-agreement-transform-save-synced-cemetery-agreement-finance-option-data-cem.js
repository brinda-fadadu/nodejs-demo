'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Agreement_TransformSaveSyncedCemetery_AgreementFinanceOption_Data_Cem') IS NOT NULL
    --DROP PROCEDURE Agreement_TransformSaveSyncedCemetery_AgreementFinanceOption_Data_Cem

    CREATE PROCEDURE Agreement_TransformSaveSyncedCemetery_AgreementFinanceOption_Data_Cem
    AS
    BEGIN
        SELECT 
            AF.id as AgreementFinanceId,
        SF.Sales_ID as SalesId,
            null as TxnId,                  -- Marked it as null, because the insert SP is expecting this value
            A.AgreementId as AgreementId,
            SF.Purchase_Price + SF.Sales_Tax - SF.Amount_Financed as DownPaymentAmount,
            ((SF.Purchase_Price + SF.Sales_Tax - SF.Amount_Financed)/(SF.Purchase_Price + SF.Sales_Tax + SF.Adjustments)) * 100 as DownPaymentPercent,
            SF.Amount_Financed as AmountFinanced,
            SF.Interest_Rate as InterestRate,
            SF.Finance_Charge as FinanceCharge,
            SF.Amount_Financed + SF.Finance_Charge as TotalAmount,
            SF.NBR_OF_PYMTS as NumberOfPayments,
            SF.Pymts_Per_Year as PaymentsPerYear,
            CONVERT(datetime, SF.Pymnt_Start_Dt) as FinanceStartDate,
            A.CreatedAt as CreatedAt,
            A.UpdatedAt as UpdatedAt,
            A.CreatedBy as CreatedBy,
            A.UpdatedBy as UpdatedBy
      INTO #AgreementFinanceTemp
        FROM h_000.DBO.Sales_Finance SF
        INNER JOIN #Agreement A ON A.Sales_Finance_id = SF.Sales_Finance_id
        LEFT JOIN AgreementFinance AF ON A.AgreementId = AF.agreementId AND AF.isActive = 1
        WHERE SF.Amount_Financed <> 0 OR SF.Finance_Charge <> 0

        EXEC Insert_AgreementFinanceOptions_Data
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
