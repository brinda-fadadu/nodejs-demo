'use strict';
module.exports = (sequelize, DataTypes) => {
  const VaultSection = sequelize.define('VaultSection', {
    vaultId: DataTypes.INTEGER,
    isVaultFromDisinterment: DataTypes.BOOLEAN,
    disinteredVaultDetails: DataTypes.STRING,
    resourceType: DataTypes.STRING
  }, {
    tableName: 'VaultSection',
    timestamps: false
  });
  VaultSection.associate = function(models) {
    // associations can be defined here
    VaultSection.belongsTo(models.AgreementLocationItem, { foreignKey: 'vaultId', as: 'vault' })
    VaultSection.belongsTo(models.ItemUsage, { foreignKey: 'vaultId' })
  };
  return VaultSection;
};