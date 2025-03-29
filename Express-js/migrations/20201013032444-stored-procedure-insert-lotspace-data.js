'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF OBJECT_ID('Insert_LotSpace_Data') IS NOT NULL
    --DROP PROCEDURE Insert_LotSpace_Data


    CREATE PROCEDURE [dbo].[Insert_LotSpace_Data]
    AS
    BEGIN
      DECLARE @LotSpaceLog TABLE (
        OnePortalLotSpaceID INT,
        LotSpaceId INT
        )

      MERGE INTO LotSpace AS TGT
      USING (
        SELECT *
        FROM #AgreementItems AI
        WHERE LotSpaceId IS NOT NULL
        ) AS AI
        ON TGT.Id = AI.OnePortalLotSpaceID
      WHEN NOT MATCHED
        THEN
          INSERT (
            [LotSpaceId],
            [LotSellUnitId],
            [Sequence],
            [Location],
            [CemeteryCode],
            [SectionCode],
            [CreatedAt],
            [UpdatedAt]
            )
          VALUES (
            AI.LotSpaceId,
            AI.Lot_Sell_Unit_ID,
            AI.[Sequence],
            AI.[Location],
            AI.CemeteryCode,
            AI.SectionCode,
            AI.CreatedAt,
            AI.UpdatedAt
            )
      WHEN MATCHED
        THEN
          UPDATE
          SET [LotSpaceId] = AI.LotSpaceId,
            [LotSellUnitId] = AI.Lot_Sell_Unit_ID,
            [Sequence] = AI.[Sequence],
            [Location] = AI.[Location],
            [CemeteryCode] = AI.[CemeteryCode],
            [SectionCode] = AI.[SectionCode],
            [UpdatedAt] = AI.UpdatedAt
      OUTPUT INSERTED.ID,
        AI.LotSpaceId
      INTO @LotSpaceLog(OnePortalLotSpaceID, LotSpaceId);

      -- to have the ID of inserted rows back in the temp table  
      UPDATE AI
      SET AI.OnePortalLotSpaceID = LSL.OnePortalLotSpaceID
      FROM #AgreementItems AI
      INNER JOIN @LotSpaceLog LSL
        ON LSL.LotSpaceId = AI.LotSpaceId
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
