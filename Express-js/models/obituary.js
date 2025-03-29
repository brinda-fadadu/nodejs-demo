'use strict';
module.exports = (sequelize, DataTypes) => {
  const Obituary = sequelize.define('Obituary', {
    personId: DataTypes.INTEGER,
    obituary: DataTypes.STRING,
    obituaryBy: DataTypes.STRING,
    createdBy: DataTypes.INTEGER
  }, {
    tableName: 'Obituary',
    timestamps: true
  });
  Obituary.associate = function(models) {
    // associations can be defined here
    Obituary.belongsTo(models.Person, { foreignKey: 'personId', as: 'Person' })
    Obituary.belongsTo(models.User, {foreignKey:'createdBy'})
  };
  return Obituary;
};