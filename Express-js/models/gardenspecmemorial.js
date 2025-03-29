'use strict';
module.exports = (sequelize, DataTypes) => {
  const GardenSpecMemorial = sequelize.define('GardenSpecMemorial', {
    intermentRightsId: DataTypes.INTEGER,
    memorialTypeAttributeValueId: DataTypes.INTEGER,
    memorialSizeAttributeValueId: DataTypes.INTEGER
  }, {
    timestamps: false,
    tableName: 'GardenSpecMemorial'
  });
  GardenSpecMemorial.associate = function(models) {
    // associations can be defined here
    GardenSpecMemorial.belongsTo(models.IntermentRights, {foreignKey: 'intermentRightsId', targetKey: 'id'})
  };
  return GardenSpecMemorial;
};