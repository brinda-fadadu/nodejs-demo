'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    CREATE VIEW vw_Pre_Need_Service
    AS
    SELECT si.Sales_Item_ID
      ,s.Sales_ID
      ,s.Sales_Contract_Nbr
      ,si.Product_Item_Cd
      ,si.Item_Cd_Desc
      ,si.Sales_Item_Qty_Sold
      ,si.Sales_Price
      ,si.Amt_Pd
      ,i.Taxable
      ,h_000.dbo.fn_convert_date(si.Sales_Delivery_Dt) AS Sales_Delivery_Dt
      ,SUBSTRING(i.Parent_Item_Cd, 4, 20) AS Parent_Item_Cd
    FROM h_000.dbo.Sales AS s
    INNER JOIN h_000.dbo.Sales_Item AS si ON s.Sales_ID = si.Sales_ID
    INNER JOIN h_000.dbo.Fund_Summary AS fs ON si.Sales_Item_ID = fs.Sales_Item_ID
    INNER JOIN h_000.dbo.Item AS i ON si.Product_Item_Cd = i.Item_Cd
    WHERE (SUBSTRING(i.Parent_Item_Cd, 4, 1) = 'S')
      AND (si.Delivery_Cost IS NULL)
      AND (si.Sales_Item_Qty_Sold > 0)
      AND (fs.Fund_Item_Cd LIKE '%PN%')
      OR (SUBSTRING(i.Parent_Item_Cd, 4, 1) = 'S')
      AND (si.Delivery_Cost = 0)
      AND (si.Sales_Item_Qty_Sold > 0)
      AND (
        fs.Fund_Status_Cd NOT IN (
          'C/D'
          ,'C/W'
          ,'O/PW'
          )
        )
      AND (fs.Fund_Item_Cd LIKE '%PN%')`,)
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
