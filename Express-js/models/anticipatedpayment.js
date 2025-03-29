'use strict';
module.exports = (sequelize, DataTypes) => {
  const AnticipatedPayment = sequelize.define('AnticipatedPayment', {
    organizationId: DataTypes.INTEGER,
    policyNumber: DataTypes.STRING,
    amount: DataTypes.DECIMAL,
    resourceId: DataTypes.INTEGER,
    resourceType: DataTypes.INTEGER,
    paymentId: DataTypes.INTEGER,
    receivedAt:DataTypes.DATE,
    createdAt: DataTypes.DATE,
    createdBy: DataTypes.INTEGER
  }, {
    tableName:'AnticipatedPayment',
    timestamps:true
  });
  AnticipatedPayment.associate = function(models) {
    // associations can be defined here
    AnticipatedPayment.belongsTo(models.Agreement, {foreignKey: 'resourceId', constraints: false });  
    AnticipatedPayment.belongsTo(models.Payment, {foreignKey : 'paymentId', targetKey:'id', as:'payment'});    
    AnticipatedPayment.belongsTo(models.Organization, {foreignKey : 'organizationId', targetKey:'id', as:'organization'});    
  };
  return AnticipatedPayment;
};