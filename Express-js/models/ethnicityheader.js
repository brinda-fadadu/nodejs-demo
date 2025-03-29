'use strict';
module.exports = (sequelize, DataTypes) => {
  const EthnicityHeader = sequelize.define('EthnicityHeader', {
    name: DataTypes.STRING
  }, {
    tableName:'EthnicityHeader',
    timestamps: false
  });
  EthnicityHeader.associate = function(models) {
    // associations can be defined here
    
  };
  return EthnicityHeader;
};