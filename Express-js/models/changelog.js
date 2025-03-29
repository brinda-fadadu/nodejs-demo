'use strict';
module.exports = (sequelize, DataTypes) => {
  const ChangeLog = sequelize.define('ChangeLog', {
    agreementId: DataTypes.INTEGER,
    addendumId: DataTypes.INTEGER,
    quantity: DataTypes.INTEGER,
    unitPrice: DataTypes.DECIMAL(28, 2),
    totalPrice: DataTypes.DECIMAL(28, 2),
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    resourceType: DataTypes.STRING, // Services, Merchandise, Packages, CashAdvancedItem, SpecialOrderRequests
    resourceId: DataTypes.INTEGER   // LocationItem, Package, CashAdvancedItem, SpecialOrderRequest
  }, {
    tableName: 'ChangeLog',
    timestamps: true
  });
  ChangeLog.associate = function(models) {
    // associations can be defined here
    // We are using polymporphic association here. 
    // For reference refer the below link 
    // https://sequelize.org/master/manual/polymorphic-associations.html
    ChangeLog.belongsTo(models.AgreementMemorialItem, {
      foreignKey: 'resourceId',
      constraints: false,
      as: 'agreementMemorialItem'
    })
  };
  return ChangeLog;
};
