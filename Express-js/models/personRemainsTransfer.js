'use strict';
module.exports = (sequelize, DataTypes) => {
  const PersonRemainsTransfer = sequelize.define('PersonRemainsTransfer', {
    personId: DataTypes.INTEGER,
    identifier: DataTypes.STRING,
    transferType: DataTypes.INTEGER,
    transferDateTime: DataTypes.DATE,
    neededByDate: DataTypes.DATE, 
    isTransferReady: DataTypes.BOOLEAN, 
    isTransferComplete: DataTypes.BOOLEAN,  
    transferFromPlaceId: DataTypes.INTEGER,
    transferFromLocationId: DataTypes.INTEGER,
    transferToPlaceId: DataTypes.INTEGER,
    transferToLocationId: DataTypes.INTEGER,
    transferToPrepLocationId: DataTypes.INTEGER,
    transferReason: DataTypes.STRING,
    primaryDriverId: DataTypes.INTEGER,  
    secondaryDriverId: DataTypes.INTEGER,  
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    deletedBy: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE
  }, {
    tableName:'PersonRemainsTransfer',
    timestamps: true
  });
  
  PersonRemainsTransfer.declareHooks = function (models) {
    PersonRemainsTransfer.addHook('beforeCreate', async (transferObj, option) => {
      transferObj.identifier = 'TRN-' + new Date().getTime().toString().slice(-6);
    });
  }
  PersonRemainsTransfer.associate = function(models) {
    // associations can be defined here    
    PersonRemainsTransfer.belongsTo(models.User, {foreignKey:'createdBy', targetKey: 'id', as: 'createdUser'});
    PersonRemainsTransfer.belongsTo(models.User, {foreignKey:'updatedBy', targetKey: 'id', as: 'updatedUser'});
    PersonRemainsTransfer.belongsTo(models.Person, {foreignKey:'personId', as: 'decedent'})

    PersonRemainsTransfer.belongsTo(models.Location, {foreignKey: 'transferFromLocationId', as:'transferFromLocation'})
    PersonRemainsTransfer.belongsTo(models.Location, {foreignKey: 'transferToLocationId', as:'transferToLocation'})
    PersonRemainsTransfer.belongsTo(models.Place, {foreignKey: 'transferFromPlaceId', as:'transferFromPlace'})
    PersonRemainsTransfer.belongsTo(models.Place, {foreignKey: 'transferToPlaceId', as:'transferToPlace'})
    PersonRemainsTransfer.belongsTo(models.Employee, {foreignKey: 'primaryDriverId', as: 'primaryDriverDetails'})
    PersonRemainsTransfer.belongsTo(models.Employee, {foreignKey: 'secondaryDriverId', as: 'secondaryDriverDetails'})
    PersonRemainsTransfer.hasMany(models.ResourceDocuments, { foreignKey: 'resourceId', constraints: false, scope: {
      resourceType: 'Transfer'
    }, as: 'transferDocuments'})

    PersonRemainsTransfer.addScope('defaultScope', {
      where: {
        deletedBy: null,
        deletedAt: null
      }
    })
    PersonRemainsTransfer.addScope('withTransferDocuments', {
      include: [
        {
          model: models.ResourceDocuments,
          as: 'transferDocuments',
          include: [{
            model: models.File,
            as: 'resourceDocumentImageUrl',
            where: {resourceName: 'ResourceDocuments'},
            required: false
          }]
        }
      ]
    })
  };
  return PersonRemainsTransfer;
};