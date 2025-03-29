'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF OBJECT_ID('Insert_Agreement_EmployeeSchedule_Data') IS NOT NULL
	--DROP PROCEDURE Insert_Agreement_EmployeeSchedule_Data


CREATE PROCEDURE [dbo].[Insert_Agreement_EmployeeSchedule_Data]
AS
BEGIN
	SET NOCOUNT ON

	DECLARE @SchedulingLog TABLE (
		OnePortalEmployeeScheduleId INT,
		FuneralWorkOrderStaffId INT
		)

	MERGE INTO EmployeeSchedule AS TGT
	USING (
		SELECT *
		FROM #EmployeeSchedule ES
		WHERE ES.OnePortalWorkOrderTaskId IS NOT NULL
		) AS ES
		ON TGT.ID = ES.OnePortalEmployeeScheduleId
	WHEN NOT MATCHED
		THEN
			INSERT (
				[EmployeeId],
				[StartTime],
				[EndTime],
				[WorkOrderId],
				[DeletedAt],
				[DeletedBy],
				[CreatedBy],
				[UpdatedBy],
				[WorkOrderTaskId],
				[CreatedAt],
				[UpdatedAt],
				[StaffType]
				)
			VALUES (
				ES.EmployeeId,
				ES.StartTime,
				ES.EndTime,
				ES.WorkOrderId,
				ES.DeletedAt,
				ES.DeletedBy,
				ES.CreatedBy,
				ES.UpdatedBy,
				ES.OnePortalWorkOrderTaskId,
				ES.CreatedAt,
				ES.UpdatedAt,
				ES.StaffType
				)
	WHEN MATCHED
		THEN
			UPDATE
			SET [EmployeeId] = ES.EmployeeId,
				[StartTime] = ES.StartTime,
				[EndTime] = ES.EndTime,
				[WorkOrderId] = ES.WorkOrderId,
				[DeletedAt] = ES.DeletedAt,
				[DeletedBy] = ES.DeletedBy,
				[CreatedBy] = ES.CreatedBy,
				[UpdatedBy] = ES.UpdatedBy,
				[WorkOrderTaskId] = ES.OnePortalWorkOrderTaskId,
				[CreatedAt] = ES.CreatedAt,
				[UpdatedAt] = ES.UpdatedAt,
				[StaffType] = ES.StaffType
	OUTPUT INSERTED.ID,
		ES.FuneralWorkOrderStaffId
	INTO @SchedulingLog(OnePortalEmployeeScheduleId, FuneralWorkOrderStaffId);

	UPDATE ES
	SET ES.OnePortalEmployeeScheduleId = SL.OnePortalEmployeeScheduleId
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
