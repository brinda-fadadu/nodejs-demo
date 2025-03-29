'use strict';
module.exports = (sequelize, DataTypes) => {
  const State = sequelize.define('State', {
    name: DataTypes.STRING,
    countryId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Country',
        key: 'id'
      }
    },
    code: DataTypes.STRING,
  }, {
    tableName: 'State',
    timestamps: false
  });
  State.associate = function(models) {
    // associations can be defined here    
    State.hasMany(models.City, {foreignKey:'stateId', as: 'State'});
    State.belongsTo(models.Country, { foreignKey: 'countryId', targetKey: 'id' })
  };
  return State;
};