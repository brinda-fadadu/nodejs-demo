'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Insert_Funeral_Arrangement_Section_Data') IS NOT NULL
	--DROP PROCEDURE Insert_Funeral_Arrangement_Section_Data


  CREATE PROCEDURE Insert_Funeral_Arrangement_Section_Data
  AS
  BEGIN
  -- DECLARE @FASStartTime DATETIME
  -- SET @FASStartTime = GETDATE() 
  MERGE INTO FuneralArrangementSection as TGT
  USING ( 
      SELECT
      *
      FROM #FuneralArragnementSection FAS
      WHERE FAS.visitation1Date IS NOT NULL or FAS.visitation2Date IS NOT NULL or FAS.visitation3Date IS NOT NULL or FAS.viewingDate IS NOT NULL or FAS.receptionDate IS NOT NULL
      -- WHERE (FAS.clFacilityLocationId is not null or FAS.serviceLocationId is not null) and FAS.funeralDirectorId is not null
  ) AS D ON TGT.Id = D.OnePortalfuneralArrangementSectionId
  WHEN NOT MATCHED
  THEN INSERT (
      clFacilityLocationId,
      serviceLocationId,
      funeralHomePhone,
      phone,
      funeralDirectorId,
      instruction
      )
      VALUES (
              D.clFacilityLocationId,
              D.serviceLocationId,
              D.funeralHomePhone,
              D.phone,
              D.funeralDirectorId,
              D.instruction
      )
      WHEN MATCHED 
      THEN 
      UPDATE SET 
                  TGT.clFacilityLocationId = D.clFacilityLocationId,
                  TGT.serviceLocationId = D.serviceLocationId,
                  TGT.funeralHomePhone = D.funeralHomePhone,
                  TGT.phone = D.phone,
                  TGT.funeralDirectorId = D.funeralDirectorId,
                  TGT.instruction = D.instruction;
  
      UPDATE CS
      SET OnePortalfuneralArrangementSectionId = OFAS.id
      FROM #CemScheduleService CS
          INNER JOIN #FuneralArragnementSection FAS 
              ON CS.arrangementId = FAS.arrangementId
          INNER JOIN FuneralArrangementSection OFAS
              ON (OFAS.clFacilityLocationId = FAS.clFacilityLocationId or OFAS.serviceLocationId = FAS.serviceLocationId) and OFAS.funeralDirectorId = FAS.funeralDirectorId
  
      UPDATE FAS
      SET OnePortalfuneralArrangementSectionId = OFAS.id
      FROM #FuneralArragnementSection FAS
          INNER JOIN FuneralArrangementSection OFAS
              ON (OFAS.clFacilityLocationId = FAS.clFacilityLocationId or OFAS.serviceLocationId = FAS.serviceLocationId) and OFAS.funeralDirectorId = FAS.funeralDirectorId
      -- SELECT 'Funeral_Arrangement_Section',DATEDIFF(millisecond,@FASStartTime,GETDATE()) 
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
