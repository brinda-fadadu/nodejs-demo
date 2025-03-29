'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF OBJECT_ID('Insert_Agreement_ResourcePallbearer_Data') IS NOT NULL
	--DROP PROCEDURE Insert_Agreement_ResourcePallbearer_Data


CREATE PROCEDURE [dbo].[Insert_Agreement_ResourcePallbearer_Data]
AS
BEGIN
	SET NOCOUNT ON

	DECLARE @SchedulingLog TABLE (
		OnePortalResourcePallbearerId INT,
		FuneralWorkOrderStaffId INT
		)

	MERGE INTO ResourcePallbearer AS TGT
	USING (
		SELECT *
		FROM #EmployeeSchedule ES
		WHERE IsPallbearer = 1
		) AS ES
		ON TGT.ID = ES.OnePortalResourcePallbearerId
	WHEN NOT MATCHED
		THEN
			INSERT (
				[ResourceSectionId],
				[ContactId]
				)
			VALUES (
				ES.OnePortalResourceSectionId,
				ES.OnePortalPersonContactId
				)
	WHEN MATCHED
		THEN
			UPDATE
			SET [ResourceSectionId] = ES.OnePortalResourceSectionId,
				[ContactId] = ES.OnePortalPersonContactId
	OUTPUT INSERTED.ID,
		ES.FuneralWorkOrderStaffId
	INTO @SchedulingLog(OnePortalResourcePallbearerId, FuneralWorkOrderStaffId);

	UPDATE ES
	SET ES.OnePortalResourcePallbearerId = SL.OnePortalResourcePallbearerId
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
