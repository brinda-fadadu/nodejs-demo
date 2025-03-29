'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Insert_Interment_Request_Section_Data') IS NOT NULL
	--DROP PROCEDURE Insert_Interment_Request_Section_Data


  CREATE PROCEDURE Insert_Interment_Request_Section_Data
  AS
  BEGIN
  -- DECLARE @IRSStartTime DATETIME
  -- SET @IRSStartTime = GETDATE()
      DECLARE @IntermentRequestSectionLog TABLE(
      IntermentRequestSectionId INT,
          WorkOrderId INT
    )
  
      MERGE INTO IntermentRequestSection as TGT
      USING ( 
          SELECT
              CS.IsWitnessLoweringOrEntombment,
              CS.IsWitnessCoveringOrSealings,
              CS.IsWitnessFilling,
              CS.IsReopenBottom,
              CS.IsBurningPot,
              CS.IsMoundOfDirtByFootend,
              CS.IsUseOfTent,
              CS.IsPlaceAndNotify,
              CS.IsReopenTop,
              CS.WorkOrderId,
              CS.OnePortalIntermentRequestSectionId
          FROM #CemScheduleService CS
          WHERE CS.WorkOrderId IS NOT NULL AND CS.IsIntermentRight = 1
      ) AS D ON TGT.id = D.OnePortalIntermentRequestSectionId
      WHEN NOT MATCHED
      THEN INSERT (
          isWitnessLoweringOrEntombment,
          isWitnessCoveringOrSealings,
          isWitnessFilling,
          isReopenBottom,
          isBurningPot,
          isMoundOfDirtByFootend,
          isUseOfTent,
          isPlaceAndNotify,
          isReopenTop
          )
           VALUES (
              ISNULL(D.IsWitnessLoweringOrEntombment,0),
              ISNULL(D.IsWitnessCoveringOrSealings,0),
              ISNULL(D.IsWitnessFilling,0),
              ISNULL(D.IsReopenBottom,0),
              ISNULL(D.IsBurningPot,0),
              ISNULL(D.IsMoundOfDirtByFootend,0),
              ISNULL(D.IsUseOfTent,0),
              ISNULL(D.IsPlaceAndNotify,0),
              ISNULL(D.IsReopenTop,0)
          )
      WHEN MATCHED 
          THEN 
          UPDATE SET TGT.isWitnessLoweringOrEntombment = ISNULL(D.IsWitnessLoweringOrEntombment,0),
                  TGT.isWitnessCoveringOrSealings = ISNULL(D.IsWitnessCoveringOrSealings,0),
                  TGT.isWitnessFilling = ISNULL(D.IsWitnessFilling,0),
                  TGT.isReopenBottom = ISNULL(D.IsReopenBottom,0),
                  TGT.isBurningPot = ISNULL(D.IsBurningPot,0),
                  TGT.isMoundOfDirtByFootend = ISNULL(D.IsMoundOfDirtByFootend,0),
                  TGT.isUseOfTent = ISNULL(D.IsUseOfTent,0),
                  TGT.isPlaceAndNotify = ISNULL(D.IsPlaceAndNotify,0),
                  TGT.isReopenTop = ISNULL(D.IsReopenTop,0) 
      OUTPUT INSERTED.ID,
      D.WorkOrderId
      INTO @IntermentRequestSectionLog(IntermentRequestSectionId, WorkOrderId);
  
      UPDATE CS
      SET OnePortalIntermentRequestSectionId = IRSL.IntermentRequestSectionId
      FROM #CemScheduleService CS
          INNER JOIN @IntermentRequestSectionLog IRSL 
          ON CS.WorkOrderId = IRSL.WorkOrderId AND CS.IsIntermentRight = 1
      -- SELECT 'Interment_Request  SP',DATEDIFF(millisecond,@IRSStartTime,GETDATE())
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
