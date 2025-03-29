'use strict';
module.exports = (sequelize, DataTypes) => {
  const AgreementRole = sequelize.define('AgreementRole', {
    name: DataTypes.STRING
  }, {
    tableName: 'AgreementRole',
    timestamps: false
  });
  AgreementRole.associate = function(models) {
    // associations can be defined here
  };
  return AgreementRole;
};