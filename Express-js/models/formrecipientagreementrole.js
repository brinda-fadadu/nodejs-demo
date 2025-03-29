'use strict';
module.exports = (sequelize, DataTypes) => {
  const FormRecipientAgreementRole = sequelize.define('FormRecipientAgreementRole', {
    formRecipientRoleId: DataTypes.INTEGER,
    agreementRoleId: DataTypes.INTEGER
  }, {
    timestamps: false,
    tableName: 'FormRecipientAgreementRole'
  });
  FormRecipientAgreementRole.associate = function(models) {
    // associations can be defined here
    FormRecipientAgreementRole.belongsTo(models.FormRecipientRole, { foreignKey: 'formRecipientRoleId', as: 'formRecipientContactRoles'})
    FormRecipientAgreementRole.belongsTo(models.AgreementRole, { foreignKey: 'agreementRoleId', as: 'formAgreementRoles' })
  };
  return FormRecipientAgreementRole;
};