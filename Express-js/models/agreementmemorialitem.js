'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementMemorialItem = sequelize.define('AgreementMemorialItem', {
    agreementMemorialId: DataTypes.INTEGER,
    locationItemId: DataTypes.INTEGER,
    agreementItemPriceId: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    deletedBy: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    addendumId: DataTypes.INTEGER,
    agreementId: DataTypes.INTEGER
  }, {
    tableName: 'AgreementMemorialItem',
    timestamps: true
  });
  AgreementMemorialItem.associate = function(models) {
    // associations can be defined here
    AgreementMemorialItem.belongsTo(models.AgreementMemorial, {
      foreignKey: 'agreementMemorialId',
      as: 'agreementMemorial'
    })
    
    AgreementMemorialItem.belongsTo(models.LocationItem, {
      foreignKey: 'locationItemId',
      constraints: false,
      as: 'locationItem'
    })

    AgreementMemorialItem.belongsTo(models.AgreementItemPrice, {
      foreignKey: 'agreementItemPriceId',
      as: 'agreementItemPrice'
    })

    AgreementMemorialItem.addScope('notDeleted', {
      where: {
        deletedAt: null,
        deletedBy: null
      }
    })
    AgreementMemorialItem.hasMany(models.ItemUsage, {foreignKey: 'resourceId', as: 'itemsUsage'})
  };
  return AgreementMemorialItem;
};