'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    CREATE VIEW vw_CemWO_MissingIntermentProperties
    AS
    SELECT t.id,
      t.contractNbr,
      tl.id AS IntermentServiceTxnLineId,
      wo.serviceDateStart,
      wo.serviceDateEnd,
      tlp.id AS PropertyTxnLineId,
      TLP.Parent_item_cd
    FROM cemportal.dbo.txnline tl
    INNER JOIN cemportal.dbo.txn t
      ON tl.txn = t.id
    INNER JOIN cemportal.dbo.WorkOrder WO
      ON TL.id = WO.txnLine
    LEFT OUTER JOIN (
      SELECT *
      FROM cemportal.dbo.txnline
      WHERE txn IN (
          SELECT Txn
          FROM cemportal.dbo.TxnLine TL
          INNER JOIN cemportal.dbo.WorkOrder WO
            ON TL.id = WO.txnLine
          WHERE itemNumber IN (
              SELECT Item_Cd
              FROM vw_IntermentRightItems_Migrated
              )
            AND intermentPropertyId IS NULL
            AND serviceDateStart IS NOT NULL
            AND serviceDateEnd IS NOT NULL
          )
        AND parent_item_cd LIKE 'P-%'
        AND itemDescription NOT LIKE '%disc%'
        AND (
          qty > 0
          OR qty IS NULL
          )
      ) tlp
      ON tl.txn = tlp.txn
    WHERE tl.id IN (
        SELECT TxnLine
        FROM cemportal.dbo.TxnLine TL
        INNER JOIN cemportal.dbo.WorkOrder WO
          ON TL.id = WO.txnLine
        WHERE itemNumber IN (
            SELECT Item_Cd
            FROM vw_IntermentRightItems_Migrated
            )
          AND intermentPropertyId IS NULL
          AND serviceDateStart IS NOT NULL
          AND serviceDateEnd IS NOT NULL
        ) AND serviceDateStart IS NOT NULL AND serviceDateEnd IS NOT NULL and tlp.id is NOT NULL`)
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
