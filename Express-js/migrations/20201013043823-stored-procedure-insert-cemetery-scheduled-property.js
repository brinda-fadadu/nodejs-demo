'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Insert_Cemetery_Scheduled_Property') IS NOT NULL
    --DROP PROCEDURE Insert_Cemetery_Scheduled_Property


    CREATE PROCEDURE Insert_Cemetery_Scheduled_Property
    AS
    BEGIN


    MERGE INTO CemeteryScheduledProperty as TGT
    USING ( 
        SELECT
        *
        FROM #CemScheduleService CS
        WHERE OnePortalPropertyId is NOT NULL and OnePortalPropertyItemUsageID is not null and (OnePortalIntermentInformationSectionId is not null or OnePortalDisintermentInfoSectionId is not null)
    ) AS D ON TGT.id = D.CemeteryScheduledPropertyId
    WHEN NOT MATCHED
    THEN INSERT (
        PropertyId,
        IntermentInfoSectionId,
        DisIntermentInfoSectionId
    )
    VALUES(
        D.OnePortalPropertyItemUsageID,
        D.OnePortalIntermentInformationSectionId,
        D.OnePortalDisintermentInfoSectionId  
    )
    WHEN MATCHED 
        THEN 
        UPDATE SET 
                TGT.PropertyId = D.OnePortalPropertyItemUsageID,
                TGT.IntermentInfoSectionId = D.OnePortalIntermentInformationSectionId,
                TGT.DisIntermentInfoSectionId = D.OnePortalDisintermentInfoSectionId;

        UPDATE CS
        SET CemeteryScheduledPropertyId = CSP.id
        FROM #CemScheduleService CS 
            INNER JOIN CemeteryScheduledProperty CSP 
                ON CSP.propertyId = CS.OnePortalPropertyItemUsageID and (CSP.IntermentInfoSectionId = CS.OnePortalIntermentInformationSectionId or CSP.DisIntermentInfoSectionId = CS.OnePortalDisintermentInfoSectionId )
        
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
