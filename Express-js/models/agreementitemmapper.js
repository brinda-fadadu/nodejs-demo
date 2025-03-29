'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementItemMapper = sequelize.define('AgreementItemMapper', {
    name: DataTypes.STRING,
    active: DataTypes.BOOLEAN
  }, {
    tableName: 'AgreementItemMapper'
  });
  AgreementItemMapper.associate = function(models) {
    // associations can be defined here
  };
  return AgreementItemMapper;
};