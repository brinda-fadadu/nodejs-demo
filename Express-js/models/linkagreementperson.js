'use strict';
module.exports = (sequelize, DataTypes) => {
  const LinkAgreementPerson = sequelize.define('LinkAgreementPerson', {
    linkAgreementId: DataTypes.INTEGER,
    personId: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER
  }, {
    timestamps: true,
    tableName: 'LinkAgreementPerson'
  });
  LinkAgreementPerson.associate = function(models) {
    // associations can be defined here
  };
  return LinkAgreementPerson;
};