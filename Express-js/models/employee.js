'use strict'
const seed = require('../config/seed').seed
const _ = require('underscore')
let contactTypes = _.invert(seed.ContactType)
module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define(
    'Employee',
    {
      name: DataTypes.STRING,
      salesCounselorId: DataTypes.INTEGER,
      email: DataTypes.STRING,
      phoneNumber: DataTypes.STRING,
      employeeTypeId: DataTypes.INTEGER,
      isActive: DataTypes.BOOLEAN,
      locationId: DataTypes.INTEGER
    },
    {
      tableName: 'Employee',
      timestamps: false
    }
  )
  Employee.associate = function(models) {
    // associations can be defined here
    Employee.belongsTo(models.EmployeeType, { foreignKey: 'employeeTypeId', as: 'employeeType' })
    Employee.hasMany(models.PersonContact, { foreignKey: 'resourceId', constraints: false, scope: {
      resourceType: 'Employee'
    }})
    // Employee.hasMany(models.Call, { foreignKey: 'assignedToId', sourceKey: 'id' })
    Employee.hasMany(models.CallAssignment, { foreignKey: 'assignedToId', as: 'assignedTo' })
    Employee.hasMany(models.Ticket, { foreignKey: 'assignedTo', sourceKey: 'id' })
    Employee.belongsTo(models.Location, { foreignKey: 'locationId', as: 'location' })

    
    //scopes of employee
    Employee.addScope('withEmployeeLocation', {
      include: [
        {
          model: models.Location,
          as: 'location'
        }
      ]
    })

  };
  Employee.declareHooks = function(models) {
    Employee.addHook('beforeCreate', async (employee, option) => {
      if (employee.location) {
        const locationData = await models.Location.findOne({
          where: {
            code: employee.location
          }
        })
        if (locationData) {
          employee.locationId = locationData.id
        }
      }
    })
  }
  return Employee;
};
