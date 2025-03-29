'use strict';
module.exports = (sequelize, DataTypes) => {
  const Industry = sequelize.define('Industry', {
    name: DataTypes.STRING,
    sectorCode: DataTypes.INTEGER
  }, {
    tableName: 'Industry',
    timestamps: false
  });
  Industry.associate = function(models) {
    // associations can be defined here
  };
  return Industry;
};