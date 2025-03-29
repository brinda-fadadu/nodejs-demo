'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    CREATE VIEW vw_PropertyAdditionRightItems
    AS
    SELECT i.Item_Cd,
      i.Descr,
      i.Taxable,
      i.Price_Level_1,
      'Property' AS ItemCategory,
      'Added Internment Right' AS ItemType,
      irc.Item_Report_Category_Cd,
      irc.Descr AS ItemReportCategoryDesc,
      i.cost
    FROM H_000.dbo.item i
    INNER JOIN H_000.dbo.Item_Report_Category irc
      ON i.Item_Report_Category_Cd = irc.Item_Report_Category_Cd
    WHERE Item_Cd LIKE 'CFS%'
      AND Item_Type_Cd = 'P'
      AND active = 1
      AND (i.Item_Report_Group_Cd LIKE '%prop%')
      AND i.Item_Report_Category_Cd = '2ndRight'`,)
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
