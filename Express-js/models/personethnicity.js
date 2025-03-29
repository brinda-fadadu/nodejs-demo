'use strict';
module.exports = (sequelize, DataTypes) => {
  const PersonEthnicity = sequelize.define('PersonEthnicity', {
    personId: DataTypes.INTEGER,
    isHispanic: DataTypes.BOOLEAN,
    hispanicId: DataTypes.INTEGER,
    ethnicityOneId: DataTypes.INTEGER,    
    raceOneId: DataTypes.INTEGER,
    ethnicityTwoId: DataTypes.INTEGER,
    raceTwoId: DataTypes.INTEGER,
    ethnicityThreeId: DataTypes.INTEGER,
    raceThreeId: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER
  }, {
    tableName: 'PersonEthnicity',
    timestamps: true
  });
  PersonEthnicity.associate = function(models) {
    // associations can be defined here
    PersonEthnicity.belongsTo(models.Race, {foreignKey:'raceOneId', as: 'raceOne'})
    PersonEthnicity.belongsTo(models.Race, {foreignKey:'raceTwoId', as: 'raceTwo'})
    PersonEthnicity.belongsTo(models.Race, {foreignKey: 'raceThreeId', as: 'raceThree'})
    PersonEthnicity.belongsTo(models.Ethnicity, {foreignKey: 'hispanicId', as: 'hispanic'})
    PersonEthnicity.belongsTo(models.Ethnicity, {foreignKey: 'ethnicityOneId', as: 'ethnicityOne'})
    PersonEthnicity.belongsTo(models.Ethnicity, {foreignKey: 'ethnicityTwoId', as: 'ethnicityTwo'})
    PersonEthnicity.belongsTo(models.Ethnicity, {foreignKey: 'ethnicityThreeId', as: 'ethnicityThree'})
    PersonEthnicity.belongsTo(models.User, {foreignKey: 'createdBy'})
    PersonEthnicity.belongsTo(models.User, {foreignKey: 'updatedBy'})
    PersonEthnicity.belongsTo(models.Person, { foreignKey: 'personId'})
  };
  return PersonEthnicity;
};