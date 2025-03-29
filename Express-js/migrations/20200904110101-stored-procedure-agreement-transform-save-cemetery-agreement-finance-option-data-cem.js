'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Agreement_TransformSaveCemetery_AgreementFinanceOption_Data_Cem') IS NOT NULL
    --DROP PROCEDURE Agreement_TransformSaveCemetery_AgreementFinanceOption_Data_Cem

    CREATE PROCEDURE Agreement_TransformSaveCemetery_AgreementFinanceOption_Data_Cem
    AS
    BEGIN

        -- Created a amount variable, that stores sum of amount from Payment table
        DECLARE @AMOUNT DECIMAL(9,2) = NULL;
        SELECT @AMOUNT = SUM(amount) FROM CEMPORTAL.DBO.PAYMENT P
        INNER JOIN #AGREEMENT A
            ON P.TXN = A.TXNID
        GROUP BY txn;

        
        SELECT 
            AF.id as AgreementFinanceId,
        A.Sales_ID as SalesId,
            T.id as TxnId,
            A.AgreementId as AgreementId,
            @AMOUNT as DownPaymentAmount,
            (@AMOUNT/(A.TotalPrice + A.TotalTax)) * 100 as DownPaymentPercent,
            T.interestRate as InterestRate,
            null as FinanceCharge,
            (A.TotalPrice + A.TotalTax - @AMOUNT) as AmountFinanced,
            (A.TotalPrice + A.TotalTax - @AMOUNT) as TotalAmount,
            (T.yearsOfFinance * 12) as NumberOfPayments,
            12 as PaymentsPerYear,
            T.financingBeginningDate as FinanceStartDate,
            A.CreatedAt as CreatedAt,
            A.UpdatedAt as UpdatedAt,
            A.CreatedBy as CreatedBy,
            A.UpdatedBy as UpdatedBy
      INTO #AgreementFinanceTemp
        FROM #Agreement A 
        INNER JOIN cemportal.DBO.TXN T ON A.TXNID = T.id
        LEFT JOIN AgreementFinance AF ON A.AgreementId = AF.agreementId AND AF.isActive = 1
        WHERE T.interestRate IS NOT NULL

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
