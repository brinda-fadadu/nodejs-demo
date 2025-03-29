'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF OBJECT_ID('Insert_Agreement_WorkOrderTask_Data') IS NOT NULL
	--DROP PROCEDURE Insert_Agreement_WorkOrderTask_Data


CREATE PROCEDURE [dbo].[Insert_Agreement_WorkOrderTask_Data]
AS
BEGIN
	SET NOCOUNT ON

	DECLARE @SchedulingLog TABLE (
		OnePortalWorkOrderTaskId INT,
		FuneralWorkOrderStaffId INT
		)

	MERGE INTO WorkOrderTask AS TGT
	USING (
		SELECT *
		FROM #EmployeeSchedule ES
		WHERE ISNULL(ES.Task, '') <> ''
			OR ES.OnePortalReservedResourceId IS NOT NULL
		) AS ES
		ON TGT.ID = ES.OnePortalWorkOrderTaskId
	WHEN NOT MATCHED
		THEN
			INSERT (
				[Name],
				[ResourceReservationId]
				)
			VALUES (
				ES.Task,
				ES.OnePortalReservedResourceId
				)
	WHEN MATCHED
		THEN
			UPDATE
			SET [Name] = ES.Task,
				[ResourceReservationId] = ES.OnePortalReservedResourceId
	OUTPUT INSERTED.ID,
		ES.FuneralWorkOrderStaffId
	INTO @SchedulingLog(OnePortalWorkOrderTaskId, FuneralWorkOrderStaffId);

	UPDATE ES
	SET ES.OnePortalWorkOrderTaskId = SL.OnePortalWorkOrderTaskId
	FROM #EmployeeSchedule ES
	INNER JOIN @SchedulingLog SL
		ON ES.FuneralWorkOrderStaffId = SL.FuneralWorkOrderStaffId
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
