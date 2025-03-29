'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementPropertyAdditionalRight = sequelize.define('AgreementPropertyAdditionalRight', {
    agreementPropertyId: DataTypes.INTEGER,
    agreementId: DataTypes.INTEGER,
    addendumId: DataTypes.INTEGER,
    lotSpaceId: DataTypes.INTEGER,
    agreementItemPriceId: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    deletedBy: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE
  }, {
    tableName: 'AgreementPropertyAdditionalRight',
    timestamps: false
  });
  AgreementPropertyAdditionalRight.associate = function(models) {
    // associations can be defined here
    AgreementPropertyAdditionalRight.belongsTo(models.LotSpace, {
      as: 'lotspace',
      foreignKey: 'lotspaceId'
    }),
    AgreementPropertyAdditionalRight.belongsTo(models.AgreementItemPrice, { foreignKey: 'agreementItemPriceId', as: 'agreementPropertyPriceDetails' })
    
    AgreementPropertyAdditionalRight.addScope('lotSpaceScope', {
      include: [
        {
          model: models.LotSpace,
          as: 'lotspace',
          required: true
        }
      ]
    })
  };
  return AgreementPropertyAdditionalRight;
};