'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementMemorial = sequelize.define('AgreementMemorial', {
    agreementId: DataTypes.INTEGER,
    memorialTypeAttributeValueId: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    deletedBy: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    addendumId: DataTypes.INTEGER
  }, {
    tableName: 'AgreementMemorial',
    timestamps: true
  });
  AgreementMemorial.associate = function(models) {
    // associations can be defined here
    AgreementMemorial.belongsTo(models.Agreement, {
      foreignKey: 'agreementId',
      as: 'agreement'
    })

    AgreementMemorial.belongsTo(models.Addendum, {
      foreignKey: 'addendumId',
      as: 'addendum'
    })

    AgreementMemorial.belongsTo(models.AttributeValue, {
      foreignKey: 'memorialTypeAttributeValueId',
      as: 'attributeValue'
    })

    AgreementMemorial.hasMany(models.AgreementMemorialItem, {
      foreignKey: 'agreementMemorialId',
      as: 'agreementMemorialItems'
    })

    AgreementMemorial.addScope('notDeleted', {
      where: {
        deletedAt: null,
        deletedBy: null
      }
    })

    AgreementMemorial.addScope('withItems', {
      include: [{
        model: models.AgreementMemorialItem,
        as: 'agreementMemorialItems'
      }]
    })
  };
  return AgreementMemorial;
};