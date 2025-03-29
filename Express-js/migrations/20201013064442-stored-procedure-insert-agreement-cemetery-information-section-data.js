'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF OBJECT_ID('Insert_Agreement_CemeteryInformationSection_Data') IS NOT NULL
	--DROP PROCEDURE Insert_Agreement_CemeteryInformationSection_Data


CREATE PROCEDURE [dbo].[Insert_Agreement_CemeteryInformationSection_Data]
AS
BEGIN
	SET NOCOUNT ON

	DECLARE @SchedulingLog TABLE (
		OnePortalCemeteryInformationSectionId INT,
		WorkOrderId INT
		)

	MERGE INTO CemeteryInformationSection AS TGT
	USING (
		SELECT *
		FROM #FuneralScheduling FS
		WHERE FS.isCemeteryInformationSection = 1
		) AS FS
		ON TGT.ID = FS.OnePortalCemeteryInformationSectionId
	WHEN NOT MATCHED
		THEN
			INSERT (
				[clCemeteryLocationId],
				[cemeteryLocationId],
				[burialSite]
				)
			VALUES (
				FS.clCemeteryLocationId,
				FS.cemeteryLocationId,
				FS.burialSite
				)
	WHEN MATCHED
		THEN
			UPDATE
			SET [clCemeteryLocationId] = FS.ClCemeteryLocationId,
				[cemeteryLocationId] = FS.CemeteryLocationId,
				[burialSite] = FS.BurialSite
	OUTPUT INSERTED.ID,
		FS.WorkOrderId
	INTO @SchedulingLog(OnePortalCemeteryInformationSectionId, WorkOrderId);

	UPDATE FS
	SET FS.OnePortalCemeteryInformationSectionId = SL.OnePortalCemeteryInformationSectionId
	FROM #FuneralScheduling FS
	INNER JOIN @SchedulingLog SL
		ON FS.WorkOrderId = SL.WorkOrderId
END



`,)
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
