'use strict';
module.exports = (sequelize, DataTypes) => {
  const PropertyGarden = sequelize.define('PropertyGarden', {
    name: DataTypes.STRING,
    code: DataTypes.STRING,
    propertyCampusId: DataTypes.INTEGER
  }, {
    tableName: 'PropertyGarden',
    timestamps: false
  });
  PropertyGarden.associate = function(models) {
    // associations can be defined here
    PropertyGarden.belongsTo(models.PropertyCampus, { foreignKey: 'propertyCampusId', targetKey: 'id', as: 'propertyCampus' })
    PropertyGarden.hasMany(models.Property, { foreignKey: 'propertyGardenId', as: 'properties', sourceKey: 'id' })
  };
  return PropertyGarden;
};
