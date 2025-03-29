'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Insert_Urn_Information_Section_Item_Usage') IS NOT NULL
    --DROP PROCEDURE Insert_Urn_Information_Section_Item_Usage


    CREATE PROCEDURE Insert_Urn_Information_Section_Item_Usage
    AS
    BEGIN
    -- DECLARE @IUIStartTime DATETIME
    -- SET @IUIStartTime = GETDATE()
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
            CS.UrnItemUsedStatusId,
            CS.personId,
            CS.UrnItemUsageResourceType,
            CS.UrnItemUsageResourceID,
            CS.createdBy ,
            CS.updatedBy ,
            CS.createdAt ,
            CS.updatedAt 
        FROM #CemScheduleService CS
            where CS.UrnId is not NULL 


        EXEC Insert_Cem_Scheduling_Item_Usage_Data

        UPDATE CS 
        SET CS.OnePortalUrnItemUsageID = IU.Id 
        FROM #CemScheduleService CS
            INNER JOIN ItemUsage IU 
                ON CS.UrnItemUsageResourceID = IU.resourceId and CS.UrnItemUsageResourceType = IU.resourceType and CS.personId = IU.personId
        where CS.UrnId is not NULL 

        DELETE FROM #ItemUsage

        -- SELECT 'Urn_Information_Section_Item_Usage info SP',DATEDIFF(millisecond,@IUIStartTime,GETDATE())
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
