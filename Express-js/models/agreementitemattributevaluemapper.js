'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementItemAttributeValueMapper = sequelize.define('AgreementItemAttributeValueMapper', {
    agreementItemMapperId: DataTypes.INTEGER,
    attributeValueId: DataTypes.INTEGER
  }, {
    tableName: 'AgreementItemAttributeValueMapper'
  });
  AgreementItemAttributeValueMapper.associate = function(models) {
    // associations can be defined here
  };
  return AgreementItemAttributeValueMapper;
};