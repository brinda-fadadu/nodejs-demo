'use strict';
module.exports = (sequelize, DataTypes) => {
  const Veteran = sequelize.define('Veteran', {
    personId: {
      type: DataTypes.INTEGER
    },
    serviceBranchId: DataTypes.INTEGER,
    serviceEra: DataTypes.STRING,
    isUnknown: DataTypes.BOOLEAN,
    isVeteran: DataTypes.STRING
  }, {
    tableName: 'Veteran' 
  });

  Veteran.associate = function(models) {
    // associations can be defined here
    Veteran.belongsTo(models.ServiceBranch, {foreignKey:'serviceBranchId', as: 'serviceBranch'})  
    Veteran.belongsTo(models.Person, { foreignKey: 'personId'})  

    Veteran.addScope('commonIncludes', {
      include: [
        {
          model: models.ServiceBranch,
          as: 'serviceBranch'
        }
      ]
    })
  };
  return Veteran;
};