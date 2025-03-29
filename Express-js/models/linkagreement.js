'use strict';
module.exports = (sequelize, DataTypes) => {
  const LinkAgreement = sequelize.define('LinkAgreement', {
    agreementId: DataTypes.INTEGER,
    hmisContractNumber: DataTypes.STRING,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    arrangerId: DataTypes.INTEGER,
    hmisSalesId: DataTypes.INTEGER,
    hmisContractType: DataTypes.INTEGER,
    statusId: DataTypes.INTEGER,
    hmisSalesFinanceId: DataTypes.INTEGER,
    agreementType: DataTypes.INTEGER
  }, {
    timestamps: true,
    tableName: 'LinkAgreement'
  });
  LinkAgreement.associate = function(models) {
    // associations can be defined here
    LinkAgreement.hasMany(models.LinkAgreementPerson, {foreignKey: 'linkAgreementId',as: 'linkedPerson'})  };
  return LinkAgreement;
};