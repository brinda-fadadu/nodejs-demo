'use strict';
module.exports = (sequelize, DataTypes) => {
  const PersonRemainsInfo = sequelize.define('PersonRemainsInfo', {
    personId: DataTypes.INTEGER,
    embalmerId: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    isEmbalmingSelfApproved: DataTypes.BOOLEAN,
    isEmbalmingNotAssigned: DataTypes.BOOLEAN,
    isCremationSelfApproved: DataTypes.BOOLEAN,
    finalDisposition: DataTypes.STRING,
    isEmbalmingApproved: DataTypes.BOOLEAN,
    isEmbalmingNotAssigned: DataTypes.BOOLEAN,
    isCremationApproved: DataTypes.BOOLEAN,
    finalRestingPlace: DataTypes.STRING,
    bodyTransferTrackingNumber: DataTypes.STRING
  }, {
    tableName: 'PersonRemainsInfo',
    timestamps: true
  });
  PersonRemainsInfo.associate = function(models) {
    // associations can be defined here
    PersonRemainsInfo.belongsTo(models.Person, {foreignKey:'personId', sourceKey:'id'});
    PersonRemainsInfo.hasMany(models.PersonRemainsApproval, { foreignKey: 'personRemainsId', as: 'personRemainsApproval'})
    PersonRemainsInfo.belongsTo(models.Employee, { foreignKey: 'embalmerId', as: 'embalmer' })
    PersonRemainsInfo.belongsTo(models.User, {foreignKey:'createdBy', targetKey: 'id', as: 'createdUser'});
    PersonRemainsInfo.belongsTo(models.User, {foreignKey:'updatedBy', targetKey: 'id', as: 'updatedUser'});

  };
  return PersonRemainsInfo;
};