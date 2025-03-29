'use strict';
module.exports = (sequelize, DataTypes) => {
  const FormQuestion = sequelize.define('FormQuestion', {
    formId: DataTypes.INTEGER,
    question: DataTypes.STRING,
    options: DataTypes.TEXT,
    isMandatory: DataTypes.BOOLEAN
  }, {
    timestamps: false,
    tableName: 'FormQuestion'
  });
  FormQuestion.associate = function(models) {
    // associations can be defined here
    FormQuestion.belongsTo(models.Form, { foreignKey: 'formId', as: 'formQuestions' })
  };
  return FormQuestion;
};