'use strict';
module.exports = (sequelize, DataTypes) => {
  const CasketSection = sequelize.define('CasketSection', {
    casketId: DataTypes.INTEGER,
    isOutSideCasket: DataTypes.BOOLEAN,
    casketType: DataTypes.STRING,
    resourceType: DataTypes.STRING
  }, {
    tableName: 'CasketSection',
    timestamps: false
  });
  CasketSection.associate = function(models) {
    // associations can be defined here
    CasketSection.belongsTo(models.AgreementLocationItem, { foreignKey: 'casketId', as: 'casket' })
    CasketSection.belongsTo(models.ItemUsage, { foreignKey: 'casketId' })
  };
  return CasketSection;
};