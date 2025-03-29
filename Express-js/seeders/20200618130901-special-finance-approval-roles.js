'use strict';
const models = require('../models')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    let userRoles = await models.UserRole.findAll({ where: {} })
    userRoles = JSON.parse(JSON.stringify(userRoles))
    const vpOfSalesId = userRoles.find(ele => ele.name === 'VP_Of_Sales').id
    const ceoId = userRoles.find(ele => ele.name === 'CEO').id
    const cfoId = userRoles.find(ele => ele.name === 'CFO').id

    return queryInterface.bulkInsert('SpecialFinanceApprovalRoles', [
      {
        id: 1,
        roleId: ceoId
      },
      {
        id: 2,
        roleId: vpOfSalesId
      },
      {
        id:3,
        roleId: cfoId
      }
    ], {logging: console.log},{
      id:{
        autoIncrement:true        //Enables identity insertion
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('SpecialFinanceApprovalRoles', null, {});

  }
};
