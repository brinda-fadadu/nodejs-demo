'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Insert_Disinterment_Info_Section_Data') IS NOT NULL
	--DROP PROCEDURE Insert_Disinterment_Info_Section_Data


  CREATE PROCEDURE Insert_Disinterment_Info_Section_Data
  AS
  BEGIN
  -- DECLARE @DISDStartTime DATETIME
  -- SET @DISDStartTime = GETDATE()
      DECLARE @DisintermentInfoSectionLog TABLE(
      DisintermentInfoSectionId INT,
          WorkOrderId INT
    )
  
      MERGE INTO DisintermentInfoSection as TGT
      USING ( 
          SELECT
              CS.OnePortalPropertyId,
              CS.ServiceStartDate,
              CS.ServiceEndDate,
              CS.DisintermentReason,
              CS.DisintermentType,
              CS.Instruction,
              CS.WorkOrderId,
              CS.OnePortalDisintermentInfoSectionId
          FROM #CemScheduleService CS
          WHERE CS.DisIntermentPropertyId IS NOT NULL
      ) AS D ON TGT.id = D.OnePortalDisintermentInfoSectionId
      WHEN NOT MATCHED
      THEN INSERT (
          -- propertyId,
          beginningTime,
          endingTime,
          disintermentReason,
          disintermentType,
          instruction
          )
          VALUES (
              -- D.OnePortalPropertyId,
              D.ServiceStartDate,
              CASE WHEN D.ServiceStartDate >= D.ServiceEndDate THEN DATEADD(hour,1,D.ServiceStartDate) ELSE D.ServiceEndDate END,
              D.DisintermentReason,
              D.DisintermentType,
              D.Instruction
          )
      WHEN MATCHED 
          THEN 
          UPDATE SET 
                  -- TGT.propertyId = D.OnePortalPropertyId,
                  TGT.beginningTime = D.ServiceStartDate,
                  TGT.endingTime = CASE WHEN D.ServiceStartDate >= D.ServiceEndDate THEN DATEADD(hour,1,D.ServiceStartDate) ELSE D.ServiceEndDate END,
                  TGT.disintermentReason = D.DisintermentReason,
                  TGT.disintermentType = D.DisintermentType,
                  TGT.instruction = D.Instruction
                  
      OUTPUT INSERTED.ID,
      D.WorkOrderId
      INTO @DisintermentInfoSectionLog(DisintermentInfoSectionId, WorkOrderId);
  
      UPDATE CS
      SET OnePortalDisintermentInfoSectionId = DISL.DisintermentInfoSectionId
      FROM #CemScheduleService CS
          INNER JOIN @DisintermentInfoSectionLog DISL 
          ON CS.WorkOrderId = DISL.WorkOrderId AND CS.IsDisintermentRight = 1
      -- SELECT 'DisInternemnt info SP',DATEDIFF(millisecond,@DISDStartTime,GETDATE())
  END `,)
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
