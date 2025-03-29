'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Insert_Agreement_Property_Additional_right') IS NOT NULL
    --DROP PROCEDURE Insert_Agreement_Property_Additional_right


    CREATE PROCEDURE Insert_Agreement_Property_Additional_right
    AS
    BEGIN

    -- DECLARE @Id INT

    DECLARE @ADDITIONALRIGHTS TABLE(
        Id INT,
        Sales_Item_ID INT,
        ItemPriceId INT,
      TxnLineID INT
    )

    MERGE INTO AgreementPropertyAdditionalRight as TGT 
    USING (
        SELECT
        AI.OnePortalAgreementAdditionalRightId,
        AI.IntermentRightPropertyId as agreementPropertyId,
        AI.agreementId as agreementId,
        AI.OnePortalAgreementItemPriceId as agreementItemPriceId,
        AI.createdBy,
        AI.Sales_Item_ID,
      AI.OnePortalLotSpaceId,
      AI.TxnLineId
        FROM #AgreementItems AI 
        WHERE AI.IsIntermentRight = 1
    ) AS D
    ON TGT.id = D.OnePortalAgreementAdditionalRightId 
    WHEN NOT MATCHED 
        THEN INSERT (
            [agreementPropertyId],
            [agreementId],
            [agreementItemPriceId],
            [addendumId],
            [lotSpaceId],
            [createdBy],
            [deletedBy],
            [createdAt],
            [deletedAt]
        ) 
        VALUES(
            D.agreementPropertyId,
            D.agreementId,
            D.agreementItemPriceId,
            null,
            D.OnePortalLotSpaceId,
            D.createdBy,
            null,
            GETDATE(),
            null
        )
    WHEN MATCHED 
        THEN 
        UPDATE SET  
                TGT.agreementPropertyId = D.agreementPropertyId,
                TGT.agreementId = D.agreementId,
                TGT.agreementItemPriceId = D.agreementItemPriceId,
                TGT.addendumId = null,
                TGT.lotSpaceId = D.OnePortalLotSpaceId,
                TGT.createdBy = D.createdBy
    OUTPUT INSERTED.ID,
        D.Sales_Item_ID,
        D.agreementItemPriceId,
      D.TxnLineID
    INTO @ADDITIONALRIGHTS(ID,Sales_Item_ID,ItemPriceId, TxnLineID);

    UPDATE U SET U.OnePortalAgreementAdditionalRightId =  AR.ID
    FROM #AgreementItems U
        INNER JOIN @ADDITIONALRIGHTS AR
            ON ISNULL(U.Sales_Item_ID, 1) = ISNULL(AR.Sales_Item_ID, 2)
        OR ISNULL(U.TxnLineID, 1) = ISNULL(AR.TxnLineID, 2)


    -- IF @Id IS NULL
    -- BEGIN
    --     SET @Id = CAST(SCOPE_IDENTITY() as INT)
    -- END

    -- UPDATE U
    --     SET [OnePortalAgreementPropertyAdditionalRightId] = @Id
    --     FROM #AgreementItems U 

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
