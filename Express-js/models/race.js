'use strict';
module.exports = (sequelize, DataTypes) => {
  const Race = sequelize.define('Race', {
    headerId: DataTypes.INTEGER,
    name: DataTypes.STRING,
    edrsCode: DataTypes.INTEGER
  }, {
    tableName: 'Race',
    timestamps: false
  });
  Race.associate = function(models) {
    // associations can be defined here
    Race.belongsTo(models.EthnicityHeader, {
      foreignKey: 'headerId'
    })
  };
  return Race;
};