'use strict';
module.exports = (sequelize, DataTypes) => {
  const ItemUsage = sequelize.define('ItemUsage', {
    personId: DataTypes.INTEGER,
    resourceType: DataTypes.STRING,
    resourceId: DataTypes.INTEGER,
    lotSpaceId: DataTypes.STRING,
    usageStatus: DataTypes.INTEGER,
    createdBy:DataTypes.INTEGER,
    updatedBy:DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    deletedBy: DataTypes.INTEGER,
    Sale_Item_ID: DataTypes.INTEGER
  }, {
    tableName: 'ItemUsage',
    timestamps: true
  });
  ItemUsage.associate = function(models) {
    // associations can be defined here
    ItemUsage.belongsTo(models.AgreementLocationItem, {foreignKey: 'resourceId', as: 'agreementItems'})
    ItemUsage.belongsTo(models.AgreementMemorialItem, {foreignKey: 'resourceId', as: 'agreementMemorialItems'})
    ItemUsage.belongsTo(models.AgreementProperty, {foreignKey: 'resourceId', as: 'agreementProperties'})
    ItemUsage.belongsTo(models.ItemUsageStatus, {foreignKey: 'usageStatus', as: 'status'})
    ItemUsage.belongsTo(models.Person, {foreignKey: 'personId', as: 'person'})
    ItemUsage.hasOne(models.ScheduledCemeteryService, {foreignKey: 'itemUsageId', as: 'scheduledCemeteryService'})
    ItemUsage.hasOne(models.PurchaseOrderItem, {foreignKey: 'itemUsageId', as: 'poItemDetails'})
    
    ItemUsage.addScope('itemUsageStatusScope', {
      include: [
        {
          model: models.ItemUsageStatus,
          as: 'status',
          required: true
        }
      ]
    })
    ItemUsage.addScope('agreementProperty', {
      include: [
        {
          model: models.AgreementProperty.scope('propertyScope'),
          as: 'agreementProperties',
          required: true
        }
      ]
    })

    // this scope is for wholesale cremation
    ItemUsage.addScope('wholesaleCremation', {
      include: [
        {
          model: models.ScheduledCemeteryService,
          as: 'scheduledCemeteryService',
          attributes: ['id','personId', 'itemUsageId'],
          include: [
            {
              model: models.WorkOrder,
              as: 'workOrder',
              include: [
                {
                  model: models.WorkOrderStatus,
                  as: 'status'
                }
              ],
              attributes: ['id','resourceId', 'statusId']
            }
          ]
        }
      ]
    })
  };
  return ItemUsage;
};