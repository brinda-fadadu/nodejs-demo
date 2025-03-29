'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    CREATE VIEW vw_IntermentRightItems_Migrated
    AS
    SELECT i.Item_Cd,
      i.Descr,
      i.Taxable,
      i.Price_Level_1,
      'SERVICE' AS ItemCategory,
      'Cemetery Service (O/C)' AS ItemType,
      irc.Item_Report_Category_Cd,
      irc.Descr AS ItemReportCategoryDesc,
      i.cost
    FROM H_000.dbo.item i
    INNER JOIN H_000.dbo.Item_Report_Category irc
      ON i.Item_Report_Category_Cd = irc.Item_Report_Category_Cd
    WHERE Item_Cd LIKE 'CFS%'
      AND Item_Type_Cd = 'P'
      -- AND active = 1 -- SInce this is migrated data I have commented the active bit
      AND (
        i.Item_Report_Category_Cd LIKE '%O/C%'
        AND i.Item_Report_Category_Cd NOT LIKE 'DSINT_%'
        )
      AND (
        Item_Cd NOT LIKE '%OMINTNC%'
        AND i.Descr NOT LIKE '%Not in Trust%'
        )
    UNION
    SELECT i.Item_Cd,
      i.Descr,
      i.Taxable,
      i.Price_Level_1,
      'SERVICE' AS ItemCategory,
      'Cemetery Service (O/C) NC' AS ItemType,
      irc.Item_Report_Category_Cd,
      irc.Descr AS ItemReportCategoryDesc,
      i.cost
    FROM H_000.dbo.item i
    INNER JOIN H_000.dbo.Item_Report_Category irc
      ON i.Item_Report_Category_Cd = irc.Item_Report_Category_Cd
    WHERE Item_Cd LIKE 'CFS%'
      AND Item_Type_Cd = 'P'
      -- AND active = 1 -- SInce this is migrated data I have commented the active bit
      AND (
        i.Item_Report_Category_Cd LIKE '%O/C%'
        AND i.Item_Report_Category_Cd NOT LIKE 'DSINT_%'
        )
      AND (
        Item_Cd LIKE '%OMINTNC%'
        OR i.Descr LIKE '%Not in Trust%'
        )`,)
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
