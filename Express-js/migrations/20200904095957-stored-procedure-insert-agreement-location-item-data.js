'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Insert_AgreementLocationItem_Data') IS NOT NULL
    --DROP PROCEDURE Insert_AgreementLocationItem_Data
    

    CREATE PROCEDURE [dbo].[Insert_AgreementLocationItem_Data]
    AS
    BEGIN
      MERGE INTO AgreementLocationItem AS TGT
      USING (
        SELECT *
        FROM #AgreementItems AI
        WHERE IsAgreementLocationItem = 1
        ) AS P
        ON TGT.Id = P.OnePortalAgreementLocationItemId
      WHEN NOT MATCHED
        THEN
          INSERT (
            [locationItemId],
            [agreementId],
            [createdBy],
            [updatedBy],
            [createdAt],
            [updatedAt],
            [agreementItemPriceId]
            )
          VALUES (
            P.[OnePortalLocationItemId],
            P.[AgreementId],
            P.[createdBy],
            P.[updatedBy],
            P.[createdAt],
            P.[updatedAt],
            P.[OnePortalAgreementItemPriceId]
          )
      WHEN MATCHED
        THEN
          UPDATE SET TGT.locationItemId = P.OnePortalLocationItemId,
            TGT.agreementId = P.AgreementId,
            TGT.updatedBy = P.updatedBy,
            TGT.updatedAt = P.updatedAt,
            TGT.agreementItemPriceId = P.OnePortalAgreementItemPriceId;

      -- get the new AgreementLocationItem.ID into #AgreementItems.[One.AgreementLocationItem.id]
      UPDATE U
      SET [OnePortalAgreementLocationItemId] = ALI.id
      FROM #AgreementItems U
      INNER JOIN AgreementLocationItem ALI
        ON U.[OnePortalAgreementItemPriceId] = ALI.[agreementItemPriceId]
          AND U.[OnePortalAgreementItemPriceId] > 0
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
