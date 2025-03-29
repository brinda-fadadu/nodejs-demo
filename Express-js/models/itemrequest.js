'use strict';
module.exports = (sequelize, DataTypes) => {
  const ItemRequest = sequelize.define('ItemRequest', {
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    code: DataTypes.STRING,
    itemCategoryId: DataTypes.INTEGER,
    attributes: DataTypes.STRING,
    vendor: DataTypes.STRING,
    isTaxable: DataTypes.BOOLEAN,
    quantity: DataTypes.INTEGER,
    unitPrice: DataTypes.DOUBLE,
    remark: DataTypes.STRING,
    status: DataTypes.STRING,
    updatedBy: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    deletedBy: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    agreementId: DataTypes.INTEGER,
    addendumId: DataTypes.INTEGER,
    documentUrl: DataTypes.STRING
  }, {
    tableName: 'ItemRequest',
    timestamps: true,
    paranoid: true
  });
  ItemRequest.associate = function(models) {
    // associations can be defined here
    ItemRequest.hasOne(models.File, {
      sourcekey: 'id',
      foreignKey: 'resourceId',
      as: 'document'
    })
  };
  return ItemRequest;
};