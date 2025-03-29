'use strict';
module.exports = (sequelize, DataTypes) => {
  const Ethnicity = sequelize.define('Ethnicity', {
    isHispanic: DataTypes.BOOLEAN,    
    edrsCode: DataTypes.INTEGER,
    name: DataTypes.STRING
  }, {
    tableName:'Ethnicity',
    timestamps: false
  });
  Ethnicity.associate = function(models) {
    // associations can be defined here
    Ethnicity.belongsTo(models.Race, {
      foreignKey: 'edrsCode',
      targetKey: 'edrsCode'
    })
  };
  return Ethnicity;
};