'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Insert_Schedule_Item_Usage') IS NOT NULL
    --DROP PROCEDURE Insert_Schedule_Item_Usage


    CREATE PROCEDURE Insert_Schedule_Item_Usage
    AS
    BEGIN
    -- DECLARE @IUStartTime DATETIME
    -- SET @IUStartTime = GETDATE()
        INSERT INTO #ItemUsage( 
            UsedStatus ,
            personId ,
            ResourceType ,
            ResourceID , 
            createdBy ,
            updatedBy ,
            createdAt ,
            updatedAt 
        )
        SELECT 
            CS.ServiceItemUsedStatusId,
            CS.personId,
            CS.ServiceItemUsageResourceType,
            CS.ServiceItemUsageResourceID,
            CS.createdBy ,
            CS.updatedBy ,
            CS.createdAt ,
            CS.updatedAt 
        FROM #CemScheduleService CS
            where CS.WorkOrderId is not NULL 

        -- SELECT * FROM #ItemUsage
        EXEC Insert_Cem_Scheduling_Item_Usage_Data

        UPDATE CS 
        SET CS.OnePortalServiceItemUsageID = IU.Id 
        FROM #CemScheduleService CS
            INNER JOIN ItemUsage IU 
                ON CS.ServiceItemUsageResourceID = IU.resourceId and CS.ServiceItemUsageResourceType = IU.resourceType and CS.personId = IU.personId
        where CS.WorkOrderId is not NULL 

        DELETE FROM #ItemUsage

        -- SELECT 'Item usage SP',DATEDIFF(millisecond,@IUStartTime,GETDATE())

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
