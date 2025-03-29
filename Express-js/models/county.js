'use strict';
module.exports = (sequelize, DataTypes) => {
  const County = sequelize.define('County', {
    stateId: DataTypes.INTEGER,    
    description: DataTypes.STRING,
    code: DataTypes.INTEGER
  }, {
    tableName: 'County',
    timestamps: false
  });
  County.associate = function(models) {
    // associations can be defined here
    County.belongsTo(models.State, { foreignKey: 'stateId' })
  };
  return County;
};