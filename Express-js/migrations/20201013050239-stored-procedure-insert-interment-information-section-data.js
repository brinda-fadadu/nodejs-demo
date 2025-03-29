'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Insert_Interment_Information_Section_Data') IS NOT NULL
	--DROP PROCEDURE Insert_Interment_Information_Section_Data


    CREATE PROCEDURE Insert_Interment_Information_Section_Data
    AS
    BEGIN
    -- DECLARE @IISDStartTime DATETIME
    -- SET @IISDStartTime = GETDATE()
        DECLARE @IntermentInformationSectionLog TABLE(
            IntermentInformationSectionId INT,
            WorkOrderId INT
        )
    
        MERGE INTO IntermentInformationSection as TGT
        USING ( 
            SELECT
            *
            FROM #CemScheduleService CS
                    WHERE CS.IsIntermentRight = 1 AND 
            ISNULL(CS.intermentPropertyId,0) <> 
                CASE WHEN CS.IsCremationService = 1 
                    THEN -1
                ELSE 
                    0
                END
            AND 
            ISNULL(CS.OnePortalPropertyId,0) <> 
                CASE WHEN CS.IsCremationService = 1 
                    THEN -1
                ELSE 
                    0
                END
        ) AS D ON TGT.id = D.OnePortalIntermentInformationSectionId
        WHEN NOT MATCHED
        THEN INSERT (
            -- propertyId,
            beginningTime,
            endingTime,
            temporaryBurialLocationId,
            temporaryDisintermentLocationId,
            memorialInformation,
            isPreburied
            )
            VALUES (
                -- D.OnePortalPropertyId,
                D.ServiceStartDate,
                CASE WHEN D.ServiceStartDate >= D.ServiceEndDate THEN DATEADD(hour,1,D.ServiceStartDate) ELSE D.ServiceEndDate END,
                null,
                null,
                D.MemorialInformation,
                0
            )
        WHEN MATCHED 
            THEN 
            UPDATE SET 
                    -- TGT.propertyId = D.OnePortalPropertyId,
                    TGT.beginningTime = D.ServiceStartDate,
                    TGT.endingTime = CASE WHEN D.ServiceStartDate >= D.ServiceEndDate THEN DATEADD(hour,1,D.ServiceStartDate) ELSE D.ServiceEndDate END,
                    TGT.temporaryBurialLocationId = null,
                    TGT.temporaryDisintermentLocationId = null,
                    TGT.memorialInformation = D.MemorialInformation,
                    TGT.isPreburied = 0
                    
        OUTPUT INSERTED.ID,
        D.WorkOrderId
        INTO @IntermentInformationSectionLog(IntermentInformationSectionId, WorkOrderId);
    
        UPDATE CS
        SET OnePortalIntermentInformationSectionId = IISL.IntermentInformationSectionId
        FROM #CemScheduleService CS
            INNER JOIN @IntermentInformationSectionLog IISL 
            ON CS.WorkOrderId = IISL.WorkOrderId AND CS.IsIntermentRight = 1
    
        -- SELECT 'Internemnt info SP',DATEDIFF(millisecond,@IISDStartTime,GETDATE())
    END `,)
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
