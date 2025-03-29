'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    CREATE VIEW vw_CasketItems
    AS
    SELECT I.Item_Report_Category_Cd,
      i.Item_Cd,
      i.Descr,
      i.Taxable,
      i.Price_Level_1,
      'MERCHANDISE' AS ItemCategory,
      'CASKET' AS ItemType,
      irg.Item_Report_Group_Cd,
      irg.Descr AS ItemReportGroupDesc,
      irc.Descr AS ItemReportCategoryDesc,
      i.cost
    FROM H_000.dbo.item i
    INNER JOIN H_000.dbo.Item_Report_Group irg
      ON i.Item_Report_Group_Cd = irg.Item_Report_Group_Cd
    INNER JOIN h_000.dbo.Item_Report_Category irc
      ON i.Item_Report_Category_Cd = irc.Item_Report_Category_Cd
    WHERE i.Item_Report_Category_Cd IS NOT NULL
      AND Item_Cd LIKE 'CFS%'
      AND Item_Type_Cd = 'P'
      AND active = 1
      AND i.Item_Report_Group_Cd LIKE '%casket%'`,)
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
