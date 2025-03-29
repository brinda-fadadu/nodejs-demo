'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Insert_Work_Order_Data') IS NOT NULL
    --DROP PROCEDURE Insert_Work_Order_Data


    CREATE PROCEDURE Insert_Work_Order_Data
    AS
    BEGIN
    -- DECLARE @WOStartTime DATETIME
    -- SET @WOStartTime = GETDATE()   
    MERGE INTO WorkOrder as TGT
    USING ( 
      SELECT *
        FROM #CemScheduleService CS
        WHERE OnePortalCemScheduleServiceId is not NULL
    ) AS D ON TGT.onePortalWorkOrderId = 'WO-CP-' + CAST(D.WorkOrderId as VARCHAR)
    WHEN NOT MATCHED
    THEN INSERT (
        onePortalWorkOrderId,
        resourceType,
        resourceId,
      statusId,
      workOrderOwnerId,
      createdAt,
      updatedAt,
      createdBy,
      deletedAt,
      deletedBy,
      updatedBy,
      completedOn
        )
        VALUES (
        'WO-CP-' + CAST(D.WorkOrderId as VARCHAR),
        'ScheduledCemeteryService',
        D.OnePortalCemScheduleServiceId,
        D.OnePortalWorkOrderStatusId,
        D.workOrderOwnerId,
        D.createdAt,
        D.updatedAt,
        D.createdBy,
        D.deletedAt,
        D.deletedBy,
        D.updatedBy,
        D.completedOn
        )
        WHEN MATCHED 
        THEN 
        UPDATE SET     TGT.onePortalWorkOrderId = 'WO-CP-' + CAST(D.WorkOrderId as VARCHAR),
                TGT.resourceType = 'ScheduledCemeteryService',
                TGT.resourceId = D.OnePortalCemScheduleServiceId,
              TGT.statusId = D.OnePortalWorkOrderStatusId,
              TGT.workOrderOwnerId = D.workOrderOwnerId,
              TGT.createdAt = D.createdAt,
              TGT.updatedAt = D.updatedAt ,
              TGT.createdBy = D.createdBy,
              TGT.deletedAt = D.deletedAt,
              TGT.deletedBy = D.deletedBy,
              TGT.updatedBy = D.updatedBy,
              TGT.completedOn = D.completedOn;

      UPDATE CS
        SET OnePortalWorkOrderPrimaryId = WO.id
        FROM #CemScheduleService CS
            INNER JOIN WorkOrder WO
            ON 'WO-CP-' + CAST(CS.WorkOrderId as VARCHAR) = WO.onePortalWorkOrderId
      -- SELECT 'Work_Order_Data info SP',DATEDIFF(millisecond,@WOStartTime,GETDATE()) 
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
