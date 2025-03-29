'use strict';
module.exports = (sequelize, DataTypes) => {
  const FormRecipientRole = sequelize.define('FormRecipientRole', {
    formId: DataTypes.INTEGER,
    docusignRole: DataTypes.STRING,
    roleType: DataTypes.STRING,
    docusignRecipientType: DataTypes.STRING,
    isMandatory: DataTypes.BOOLEAN
  }, {
    timestamps: false,
    tableName: 'FormRecipientRole'
  });
  FormRecipientRole.associate = function(models) {
    // associations can be defined here
    FormRecipientRole.belongsTo(models.Form, { foreignKey: 'formId', as: 'formRecipientRoles' })
    FormRecipientRole.hasMany(models.FormRecipientContactRole, { foreignKey: 'formRecipientRoleId', as: 'formRecipientContactRoles'})
    FormRecipientRole.hasMany(models.FormRecipientAgreementRole, { foreignKey: 'formRecipientRoleId', as: 'formRecipientAgreementRoles'})
    FormRecipientRole.hasMany(models.FormRecipientRoleCarboncopyEmail, { foreignKey: 'formRecipientRoleId', as: 'formRecipientRoleCarboncopyEmail'})
    FormRecipientRole.hasMany(models.CaseInfoFormRecipient, { foreignKey: 'formRecipientRoleId'})
  };
  return FormRecipientRole;
};