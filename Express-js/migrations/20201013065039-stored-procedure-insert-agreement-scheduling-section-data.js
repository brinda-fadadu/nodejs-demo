'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF OBJECT_ID('Insert_Agreement_SchedulingSection_Data') IS NOT NULL
	--DROP PROCEDURE Insert_Agreement_SchedulingSection_Data


CREATE PROCEDURE [dbo].[Insert_Agreement_SchedulingSection_Data]
AS
BEGIN
	SET NOCOUNT ON

	DECLARE @SchedulingLog TABLE (
		OnePortalSchedulingSectionId INT,
		WorkOrderId INT
		)

	MERGE INTO SchedulingSection AS TGT
	USING (
		SELECT *
		FROM #FuneralScheduling FS
		) AS FS
		ON TGT.ID = FS.OnePortalSchedulingSectionId
	WHEN NOT MATCHED
		THEN
			INSERT (
				[date],
				[beginningTime],
				[endingTime],
				[clFacilityLocationId],
				[serviceLocationId],
				[reservedChapelId]
				)
			VALUES (
				FS.ServiceDate,
				FS.BeginningDate,
				FS.EndingDate,
				FS.ClFacilityLocationId,
				FS.ServiceLocationId,
				FS.ReservedChapelId
				)
	WHEN MATCHED
		THEN
			UPDATE
			SET [date] = FS.ServiceDate,
				[beginningTime] = FS.BeginningDate,
				[endingTime] = FS.EndingDate,
				[clFacilityLocationId] = FS.ClFacilityLocationId,
				[serviceLocationId] = FS.ServiceLocationId,
				[reservedChapelId] = FS.ReservedChapelId
	OUTPUT INSERTED.ID,
		FS.WorkOrderId
	INTO @SchedulingLog(OnePortalSchedulingSectionId, WorkOrderId);

	UPDATE FS
	SET FS.OnePortalSchedulingSectionId = SL.OnePortalSchedulingSectionId
	FROM #FuneralScheduling FS
	INNER JOIN @SchedulingLog SL
		ON FS.WorkOrderId = SL.WorkOrderId
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
