'use strict';
module.exports = (sequelize, DataTypes) => {
  const CrematoryRetorts = sequelize.define('CrematoryRetorts', {
    name: DataTypes.STRING,
    chamber: DataTypes.STRING
  }, {
    tableName: 'CrematoryRetorts',
    timestamps: false
  });
  CrematoryRetorts.associate = function(models) {
    // associations can be defined here
  };
  return CrematoryRetorts;
};