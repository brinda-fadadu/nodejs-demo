'use strict';
module.exports = (sequelize, DataTypes) => {
  const CertificateOfSepulcher = sequelize.define('CertificateOfSepulcher', {
    agreementPropertyId: DataTypes.INTEGER,
    agreementId: DataTypes.INTEGER,
    azureFileUrl: DataTypes.STRING,
    createdBy: DataTypes.INTEGER,
    updatedBy: DataTypes.INTEGER,
    deletedAt: DataTypes.DATE,
    deletedBy: DataTypes.INTEGER,
    certificateNumber: DataTypes.STRING
  }, {
    tableName: 'CertificateOfSepulcher',
    timestamps: true
  });
  CertificateOfSepulcher.associate = function(models) {
    // associations can be defined here
    CertificateOfSepulcher.belongsTo(models.Agreement, {foreignKey: 'agreementId', as: 'agreement'})
    CertificateOfSepulcher.belongsTo(models.AgreementProperty, {foreignKey:'agreementPropertyId', as: 'agreementProperty'})
  };
  return CertificateOfSepulcher;
};