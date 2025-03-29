'use strict';
module.exports = (sequelize, DataTypes) => {
  const Qualification = sequelize.define('Qualification', {
    name: DataTypes.STRING
  }, {
    tableName: 'Qualification',
    timestamps: false
  });
  Qualification.associate = function(models) {
    // associations can be defined here
    // Qualification.hasMany(models.PersonInfo, { foreignKey: 'QualificationId', as: 'AsQualificationToIdentity' })
  };
  return Qualification;
};