'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF OBJECT_ID('Insert_Agreement_CasketSection_Data') IS NOT NULL
	--DROP PROCEDURE Insert_Agreement_CasketSection_Data


CREATE PROCEDURE [dbo].[Insert_Agreement_CasketSection_Data]
AS
BEGIN
	SET NOCOUNT ON

	DECLARE @SchedulingLog TABLE (
		OnePortalCasketSectionId INT,
		WorkOrderId INT
		)

	MERGE INTO CasketSection AS TGT
	USING (
		SELECT *
		FROM #FuneralScheduling FS
		WHERE IsCasketSection = 1
		) AS FS
		ON TGT.ID = FS.OnePortalCasketSectionId
	WHEN NOT MATCHED
		THEN
			INSERT (
				[casketId],
				[isOutSideCasket],
				[casketType],
				[resourceType]
				)
			VALUES (
				FS.casketId,
				FS.isOutSideCasket,
				FS.casketType,
				FS.resourceType
				)
	WHEN MATCHED
		THEN
			UPDATE
			SET [casketId] = FS.casketId,
				[isOutSideCasket] = FS.isOutSideCasket,
				[casketType] = FS.casketType,
				[resourceType] = FS.resourceType
	OUTPUT INSERTED.ID,
		FS.WorkOrderId
	INTO @SchedulingLog(OnePortalCasketSectionId, WorkOrderId);

	UPDATE FS
	SET FS.OnePortalCasketSectionId = SL.OnePortalCasketSectionId
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
