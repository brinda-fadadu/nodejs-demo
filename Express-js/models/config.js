'use strict';
module.exports = (sequelize, DataTypes) => {
  const Config = sequelize.define('Config', {
    configName: DataTypes.STRING,
    configValue: DataTypes.STRING
  }, {
    tableName: 'Config',
    timestamps: false
  });
  Config.associate = function(models) {
    // associations can be defined here
  };
  return Config;
};
