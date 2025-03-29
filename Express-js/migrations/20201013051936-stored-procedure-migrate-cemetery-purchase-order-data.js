'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('MigrateCemeteryPurchaseOrderData') IS NOT NULL
	--DROP PROCEDURE MigrateCemeteryPurchaseOrderData


  CREATE PROCEDURE MigrateCemeteryPurchaseOrderData
  AS
  BEGIN
      DECLARE @POId INT
      SELECT TOP 1 @POId = PO.ID FROM CEMPORTAL.DBO.PurchOrder PO
          LEFT JOIN MigrateCemeteryPurchaseOrder MCPO
              ON PO.ID = MCPO.CemeteryPurchaseOrderId
      WHERE MCPO.CemeteryPurchaseOrderId IS NULL
      ORDER BY PO.id ASC
      -- SELECT @POId
  
      EXEC PurchaseOrder_Transform_Data @PurchaseOrderId = @POId
  
      INSERT INTO MigrateCemeteryPurchaseOrder(CemeteryPurchaseOrderId) VALUES(@POId)
  
      SELECT @POId AS PurchaseOrderId
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
