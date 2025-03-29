'use strict';
module.exports = (sequelize, DataTypes) => {
  const FormCategory = sequelize.define('FormCategory', {
    name: DataTypes.STRING
  }, {
    timestamps: false,
    tableName: 'FormCategory'
  });
  FormCategory.associate = function(models) {
    // associations can be defined here
     FormCategory.hasMany(models.Form, { foreignKey: 'formCategoryId', as: 'forms' })
  };
  return FormCategory;
}