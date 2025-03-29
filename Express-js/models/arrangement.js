'use strict';
module.exports = (sequelize, DataTypes) => {
  const Arrangement = sequelize.define('Arrangement', {
    personId: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER
  }, {
    tableName: 'Arrangement',
    timestamps: true
  });
  Arrangement.associate = function(models) {
    // associations can be defined here
  };
  return Arrangement;
};