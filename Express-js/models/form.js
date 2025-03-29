'use strict';
module.exports = (sequelize, DataTypes) => {
  const Form = sequelize.define('Form', {
    title: DataTypes.STRING,
    description: DataTypes.STRING,
    formCategoryId: DataTypes.INTEGER,
    docusignTemplateId: DataTypes.STRING,
    isList: DataTypes.BOOLEAN,
    formType: DataTypes.STRING
  }, {
    timestamps: false,
    tableName: 'Form'
  });
  Form.associate = function(models) {
    // associations can be defined here
    Form.belongsTo(models.FormCategory, { foreignKey: 'formCategoryId', as: 'forms' })
    Form.hasMany(models.FormRecipientRole, { foreignKey: 'formId', as: 'formRecipientRoles'})
    Form.hasMany(models.CaseInfoForm, { foreignKey: 'formId'})
    Form.hasMany(models.FormQuestion, { foreignKey: 'formId', as: 'formQuestions'})
  };
  return Form;
};