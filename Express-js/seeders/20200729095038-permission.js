'use strict';


module.exports = {
  up: async (queryInterface, Sequelize) => {
    const {modules, userRoles} = require('../config/seed')
    const csv = require('csvtojson')
    const _ = require('underscore')
    let userModules = await modules()
    let allUserRoles = await userRoles()
    let allPermissions = await csv().fromFile(process.cwd()+'/seeders/User-roles.csv')
    let permissions  = []
    allPermissions = _.groupBy(allPermissions, 'Role')    
    for(let role in allPermissions) {            
      for(let userModule in allPermissions[role][0]){
        if(userModules[userModule]) {
          let permission = {}
          permission.userRoleId = allUserRoles[role]
          permission.moduleId = userModules[userModule]
          let access = allPermissions[role][0][userModule]
          access = access.split('/')          
          permission.read = access.indexOf('R') > -1 ? true : false
          permission.write = access.indexOf('W') > -1 ? true : false
          permission.delete = access.indexOf('D') > -1 ? true : false
          permissions.push(permission)
        }
      }
    }
    return queryInterface.bulkInsert('Permission', permissions, {

    }, {

    })
    
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Permission', null, {})
  }
};
