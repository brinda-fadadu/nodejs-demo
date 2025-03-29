'use strict';
const models = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    let userRoles = await models.UserRole.findAll({ where: {} })
    userRoles = JSON.parse(JSON.stringify(userRoles))
    const CEO = userRoles.find(ele => ele.name === 'CEO').id
    const CFO = userRoles.find(ele => ele.name === 'CFO').id
    

    return queryInterface.bulkInsert('AgreementPropertyApprovalRoles', [
      {
        id: 1,
        roleId: CEO
      },
      {
        id: 2,
        roleId: CFO
      }
    ], {logging: console.log},{
      id:{
        autoIncrement: true        //Enables identity insertion
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('AgreementPropertyApprovalRoles', null, {});

  }
};
