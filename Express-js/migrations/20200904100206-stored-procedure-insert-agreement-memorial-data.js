'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Insert_AgreementMemorial_Data') IS NOT NULL
    --DROP PROCEDURE Insert_AgreementMemorial_Data


    CREATE PROCEDURE Insert_AgreementMemorial_Data
    AS
    BEGIN
      DECLARE @agreementId INT
      DECLARE @updatedBy INT
      DECLARE @createdBy INT
      DECLARE @createdAt DATETIME
      DECLARE @agreementMamorialId INT
      DECLARE @memorialTypeAttributeValueId INT

      -- SELECT * FROM ItemCategory
      -- SELECT * FROM ItemAttributeValue WHERE ID = 25
      -- SELECT * FROM ItemCategoryAttributeValue WHERE itemCategoryId IN (29,31)
      -- SELECT * FROM AttributeValue WHERE attributeId = 25
      -- SELECT * FROM Attribute WHERE name = 'Memorial type'

      -- EXEC sp_help AGREEMENTMEMORIAL
      
      -- SELECT AI.AgreementId,
      -- 	 AV1.attributeValueId 
      -- 	-- AV1.name AS MamorialAttributeValue
      -- FROM #AgreementItems AI
      -- 	LEFT JOIN Item I
      -- 		ON AI.ProductItemCode = I.code
      -- 	LEFT JOIN ItemCategory IC
      -- 		ON I.itemCategoryId = IC.id
      -- 	LEFT JOIN (SELECT ICAV.itemCategoryId as itemCategoryId,ICAV.attributeValueId as attributeValueId,A.name as [name] FROM ItemCategoryAttributeValue ICAV
      -- 				LEFT JOIN AttributeValue AV
      -- 					ON ICAV.attributeValueId = AV.id
      -- 				LEFT JOIN Attribute A
      -- 					ON AV.attributeId = A.id
      -- 				WHERE A.name = 'Memorial type') AV1
      -- 		ON IC.id = AV1.itemCategoryId
      -- 		WHERE IsMamorialItem = 1 AND IC.name = 'Memorial'
      -- 		GROUP BY AI.AgreementId,AV1.attributeValueId


      SELECT @agreementId = AgreementId,
          @updatedBy = updatedBy,
        @createdBy =  createdBy,
        @createdAt = CREATEDAT,
        @agreementMamorialId = OnePortalAgreementMamorialId,
        @memorialTypeAttributeValueId = OnePortalmemorialTypeAttributeValueId
      FROM #AgreementItems AI WHERE IsMamorialItem = 1

      -- SELECT 'MEMORIAL',@agreementId,@updatedBy,@createdBy,@agreementMamorialId AS agreementMamorialId

      IF(@agreementMamorialId IS NULL AND @agreementId IS NOT NULL)
      BEGIN
        INSERT INTO AgreementMemorial(agreementId,
          memorialTypeAttributeValueId,
          createdBy,
          updatedBy,
          createdAt,
          updatedAt,
          addendumId)
        SELECT  @agreementId,
          @memorialTypeAttributeValueId,
          @createdBy,
          @updatedBy,
          @createdAt,
          GETDATE(),
          NULL
        SET @agreementMamorialId = @@IDENTITY
      END
      
      MERGE INTO AgreementMemorialItem AS tgt
      USING (
        SELECT OnePortalLocationItemId,
                OnePortalAgreementItemPriceId,
                createdBy,
                updatedBy,
                createdAt,
                updatedAt,
          OnePortalAgreementMamorialItemId,
          AgreementId
        FROM #AgreementItems
        WHERE IsMamorialItem = 1 AND OnePortalLocationItemId IS NOT NULL
        ) AS P
        ON TGT.Id = P.OnePortalAgreementMamorialItemId --Never match
      WHEN NOT MATCHED
        THEN
          INSERT (
            [agreementMemorialId],
            AgreementId,
                    [locationItemId],
                    [agreementItemPriceId],
            [createdBy],
            [updatedBy],
            [createdAt],
            [updatedAt],
            [deletedBy],
            [deletedAt]
            )
          VALUES (
            @agreementMamorialId,
            P.AgreementId,
                    P.OnePortalLocationItemId,
                    P.OnePortalAgreementItemPriceId,
            P.[createdBy],
            P.[updatedBy],
            P.createdAt,
            GETDATE(),
            NULL,
            NULL
          )
      WHEN MATCHED
        THEN
          UPDATE SET [agreementMemorialId] = @agreementMamorialId,
            AgreementId = P.AgreementId,
                    [locationItemId] = P.OnePortalLocationItemId,
                    [agreementItemPriceId] = P.OnePortalAgreementItemPriceId,
            -- [createdBy] = P.createdBy,
            [updatedBy] = P.updatedBy,
            updatedAt = GETDATE();

      --When used after MERGE, @@ROWCOUNT returns the total number of rows inserted, updated, and deleted to the client.
      -- SELECT @@rowcount 'into AgreementMemorialItem',
      -- 	OBJECT_NAME(@@PROCID)

      -- get the new AgreementLocationItem.ID into #AgreementItems.[One.AgreementLocationItem.id]
      UPDATE U
      SET [OnePortalAgreementMamorialId] = @agreementMamorialId,
        OnePortalAgreementMamorialItemId = ami.id
      FROM #AgreementItems U
      INNER JOIN AgreementMemorialItem AMI
        ON U.[OnePortalAgreementItemPriceId] = AMI.[agreementItemPriceId]
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
