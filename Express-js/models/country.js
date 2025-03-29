'use strict';
module.exports = (sequelize, DataTypes) => {
  const Country = sequelize.define('Country', {
    name: DataTypes.STRING,
    code: DataTypes.STRING,
    currencySymbol: DataTypes.STRING
  }, {
    tableName: 'Country',
    timestamps: false
  });
  Country.associate = function(models) {
    // associations can be defined here    
    Country.hasMany(models.State, { foreignKey: 'countryId', as: 'AsCountryToState' })
  };
  return Country;
};