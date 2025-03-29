'use strict';
const { sequelize } = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.query(`
    --IF object_id('Insert_Vault_Section_Data') IS NOT NULL
    --DROP PROCEDURE Insert_Vault_Section_Data


    CREATE PROCEDURE Insert_Vault_Section_Data
    AS
    BEGIN
    -- DECLARE @VSStartTime DATETIME
    -- SET @VSStartTime = GETDATE()
    MERGE INTO VaultSection as TGT
    USING ( 
        SELECT
            CS.OnePortalVaultItemUsageID,
            CS.VaultItemUsageResourceType
        FROM #CemScheduleService CS
        WHERE CS.VaultId IS NOT NULL 
    ) AS D ON TGT.vaultId = D.OnePortalVaultItemUsageID AND TGT.resourceType = 'ItemUsage'
    WHEN NOT MATCHED
    THEN INSERT (
        vaultId,
        resourceType,
        isVaultFromDisinterment,
        disinteredVaultDetails
        )
        VALUES (
            D.OnePortalVaultItemUsageID,
            'ItemUsage',
            0,
            null
        )
    WHEN MATCHED 
        THEN 
        UPDATE SET TGT.vaultId = D.OnePortalVaultItemUsageID,
                  TGT.resourceType = 'ItemUsage',
                  TGT.isVaultFromDisinterment = 0,
                  TGT.disinteredVaultDetails = null;

        UPDATE CS
        SET OnePortalVaultSectionId = VS.id
        FROM #CemScheduleService CS
            INNER JOIN VaultSection VS 
            ON CS.OnePortalVaultItemUsageID = VS.vaultId and VS.resourceType = 'ItemUsage'
          
    --SELECT 'Vault_Section info SP',DATEDIFF(millisecond,@VSStartTime,GETDATE())
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
