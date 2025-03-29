'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`--IF object_id('Insert_Agreement_DataPackage') IS NOT NULL
    --DROP PROCEDURE Insert_Agreement_DataPackage
  CREATE PROCEDURE [dbo].[Insert_Agreement_DataPackage]
  AS
  BEGIN
    MERGE INTO AgreementPackage AS TGT
    USING (
      SELECT *
      FROM #AgreementItems AI
      WHERE IsAgreementPackage = 1
      ) AS S
      ON TGT.Id = S.OnePortalAgreementPackageID
    WHEN NOT MATCHED
      THEN
        INSERT (
          [AgreementId],
          [PackageId],
          [AgreementItemPriceId],
          [CreatedBy],
          [UpdatedBy],
          [CreatedAt],
          [UpdatedAt]
          )
        VALUES (
          S.AgreementId,
          S.OnePortalPackageId,
          S.OnePortalAgreementItemPriceId,
          S.CreatedBy,
          S.UpdatedBy,
          S.CreatedAt,
          S.UpdatedAt
          )
    WHEN MATCHED
      THEN
        UPDATE
        SET [AgreementId] = S.AgreementId,
          [PackageId] = S.OnePortalPackageId,
          [AgreementItemPriceId] = S.OnePortalAgreementItemPriceId,
          [UpdatedBy] = S.updatedBy,
          [UpdatedAt] = S.updatedAt;
  
    -- Assign Inserted ID to Package and all Package Items related
    UPDATE AI
    SET AI.OnePortalAgreementPackageID = T.id
    FROM #AgreementItems AI
    INNER JOIN [AgreementPackage] T
      ON AI.OnePortalAgreementItemPriceId = T.[agreementItemPriceId]
        OR (
          AI.AgreementId = T.AgreementId
          AND AI.OnePortalPackageID IS NOT NULL
          )
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
