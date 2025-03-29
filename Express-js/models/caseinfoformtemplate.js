'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CaseInfoFormTemplate extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      CaseInfoFormTemplate.belongsTo(models.CaseInfoForm, { foreignKey: 'caseInfoFormId', as: 'caseInfoForm' })
      CaseInfoFormTemplate.belongsTo(models.Form, { foreignKey: 'formId', as: 'form' })
    }
  };
  CaseInfoFormTemplate.init({
    caseInfoFormId: DataTypes.INTEGER,
    formId: DataTypes.INTEGER,
    addendumId: DataTypes.INTEGER,
    agreementId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'CaseInfoFormTemplate',
    tableName: 'CaseInfoFormTemplate',
    timestamps: false
  });
  return CaseInfoFormTemplate;
};