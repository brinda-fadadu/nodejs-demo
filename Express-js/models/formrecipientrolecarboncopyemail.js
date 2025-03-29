'use strict';
module.exports = (sequelize, DataTypes) => {
  const FormRecipientRoleCarboncopyEmail = sequelize.define('FormRecipientRoleCarboncopyEmail', {
    formId: DataTypes.INTEGER,
    formRecipientRoleId: DataTypes.INTEGER,
    email: DataTypes.STRING
  }, {
      timestamps: false,
      tableName: 'FormRecipientRoleCarboncopyEmail'
  });
  FormRecipientRoleCarboncopyEmail.associate = function(models) {
    FormRecipientRoleCarboncopyEmail.belongsTo(models.FormRecipientRole, { foreignKey: 'formRecipientRoleId', as: 'formRecipientRoleCarboncopyEmail'})
    // associations can be defined here
  };
  return FormRecipientRoleCarboncopyEmail;
};