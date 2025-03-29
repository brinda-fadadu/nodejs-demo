'use strict';
const Op = require('sequelize').Op
module.exports = (sequelize, DataTypes) => {
  const Service = sequelize.define('Service', {
    code: DataTypes.STRING,
    name: DataTypes.STRING,
    description: DataTypes.STRING,
    price: DataTypes.DOUBLE,
    isDisabled: DataTypes.BOOLEAN,
    taxRate: DataTypes.DOUBLE,
    contractType: DataTypes.INTEGER,  //Comes from config
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    isSchedulingRequired: DataTypes.BOOLEAN
  }, {
      defaultScope: {
        where: {
          [Op.or]: [
            {
              IsDisabled: false
            },
            {
              IsDisabled: null
            }
          ]
        }
      },
      tableName: 'Service'
    });
  Service.associate = function (models) {
    // associations can be defined here
    //Service.hasMany(models.PackageItem, { foreignKey: 'ResourceId' })
  };
  return Service;
};