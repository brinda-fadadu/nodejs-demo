'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Insert_Property_Item_usage') IS NOT NULL
	--DROP PROCEDURE Insert_Property_Item_usage


    CREATE PROCEDURE Insert_Property_Item_usage
    AS
    BEGIN
    
    MERGE INTO ItemUsage as TGT
    USING ( 
        SELECT
        *
        FROM #CemScheduleService IU
        WHERE IsIntermentRight = 1 AND PropertyItemUsageResourceID is not null AND PropertyItemUsageResourceType is not null and PersonId is not nULL 
    ) AS D ON TGT.resourceId = D.PropertyItemUsageResourceID AND TGT.resourceType = D.PropertyItemUsageResourceType AND TGT.personId = D.personId
    WHEN NOT MATCHED 
        THEN INSERT (
            [personId],
            [resourceType],
            [resourceId],
            [usageStatus],
            [createdBy],
            [updatedBy],
            [deletedAt],
            [deletedBy],
            [createdAt],
            [updatedAt]
        )
        VALUES (
            D.personId,
            D.PropertyItemUsageResourceType,
            D.PropertyItemUsageResourceID,
            D.PropertyItemUsedStatusId,
            D.createdBy,
            D.updatedBy,
            null,
            null,
            D.createdAt,
            D.updatedAt
        )
        WHEN MATCHED 
        THEN
            UPDATE SET TGT.personId = D.personId,
                        TGT.resourceType = D.PropertyItemUsageResourceType,
                        TGT.resourceId = D.PropertyItemUsageResourceID,
                        TGT.usageStatus = D.PropertyItemUsedStatusId,
                        TGT.createdBy = D.createdBy,
                        TGT.updatedBy = D.updatedBy,
                        TGT.deletedAt = CASE WHEN D.PropertyItemUsedStatusId IS NULL THEN GETDATE() ELSE NULL END,
                        TGT.deletedBy = CASE WHEN D.PropertyItemUsedStatusId IS NULL THEN D.updatedBy ELSE NULL END,
                        TGT.createdAt = D.createdAt,
                        TGT.updatedAt = GETDATE();
    
    
    MERGE INTO ItemUsage as TGT
    USING ( 
        SELECT
        *
        FROM #CemScheduleService IU
        WHERE IsDIsIntermentRight = 1 AND PropertyItemUsageResourceID is not null AND PropertyItemUsageResourceType is not null
    ) AS D ON TGT.resourceId = D.PropertyItemUsageResourceID AND TGT.resourceType = D.PropertyItemUsageResourceType AND TGT.personId = D.personId
        WHEN MATCHED 
        THEN
            UPDATE SET 
                        TGT.deletedAt = GETDATE(),
                        TGT.deletedBy = D.UpdatedBy;
    
        UPDATE CS 
        SET CS.OnePortalPropertyItemUsageID = IU.Id 
        FROM #CemScheduleService CS
            INNER JOIN ItemUsage IU 
                ON CS.PropertyItemUsageResourceID = IU.resourceId and CS.PropertyItemUsageResourceType = IU.resourceType AND CS.personId = IU.personId
        where CS.WorkOrderId is not NULL 
    
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
