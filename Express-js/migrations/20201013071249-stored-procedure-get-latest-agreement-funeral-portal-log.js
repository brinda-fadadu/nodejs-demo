'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF OBJECT_ID('GetLatestAgreementFuneralPortalLog') IS NOT NULL
	--DROP PROCEDURE GetLatestAgreementFuneralPortalLog


CREATE PROCEDURE GetLatestAgreementFuneralPortalLog
AS
BEGIN

    SELECT TOP 1 OPC.caseId,OPC.contractNbr,OPC.salesId,OPC.salesFinanceId FROM OnePortalValidFuneralContracts OPC
        INNER JOIN AgreementFuneralPortalLog AFPL
            ON OPC.caseId = AFPL.OldCaseId
        -- LEFT JOIN ImportContractDataLog ICDL
        --     ON OPC.caseId = ICDL.caseid
    WHERE AFPL.MAPDATA IS NULL
    ORDER BY OPC.caseId ASC
         
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
