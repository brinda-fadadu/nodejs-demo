'use strict';
const models = require('../../models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkInsert('People', [{
        name: 'John Doe',
        isBetaMember: false
      }], {});
    */
   if (process.env.NODE_ENV !== 'UAT') {
   let userRoles = await models.UserRole.findAll({ where: {} })
   userRoles = JSON.parse(JSON.stringify(userRoles))
   const executiveId = userRoles.find(ele => ele.name === 'CEO').id
   const vpOfFuneralHomeId = userRoles.find(ele => ele.name === 'VP_Of_Funeral_Home').id
   const funeralHomeManagerId = userRoles.find(ele => ele.name === 'Funeral_Home_Manager').id
   const saleManagerId = userRoles.find(ele => ele.name === 'Sales_Managers').id
   const vpOfSalesId = userRoles.find(ele => ele.name === 'VP_Of_Sales').id
   const arrangerId = userRoles.find(ele => ele.name === 'Arrangers').id

     const dataToInsert = [
       {
         ldapId: 'b',
         name: 'nm',
         email: 'c@outlook.com',
         userRoleId: arrangerId,
         phoneNumber: '+1 3173188374',
         createdAt: new Date(),
         updatedAt: new Date()
       },
       {
        ldapId: 'v',
        name: 'd',
        email: 'd@gmail.com',
        userRoleId: executiveId,
        phoneNumber: '+1 4842589381',
        createdAt: new Date(),
        updatedAt: new Date()
      },{
        ldapId: 'f',
        name: 'h',
        email: 'h@gmail.com',
        userRoleId: funeralHomeManagerId,
        phoneNumber: '+1 3152819168',
        createdAt: new Date(),
        updatedAt: new Date()
      },{
        ldapId: 'k',
        name: 'u',
        email: 'e@gmail.com',
        userRoleId: saleManagerId,
        phoneNumber: '+1 3162859106',
        createdAt: new Date(),
        updatedAt: new Date()
      },{
        ldapId: 'l',
        name: 'e',
        email: 'q@gmail.com',
        userRoleId: vpOfFuneralHomeId,
        phoneNumber: '+1 5153290236',
        createdAt: new Date(),
        updatedAt: new Date()
      },{
        ldapId: 'p',
        name: 'u',
        email: 'u@outlook.com',
        userRoleId: vpOfSalesId,
        phoneNumber: '+1 2898043745',
        createdAt: new Date(),
        updatedAt: new Date()
      }
     ]
     return queryInterface.bulkInsert('User', dataToInsert, {
    },{
      id:{
        autoIncrement: true
      }
    })
  }
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkDelete('People', null, {});
    */
   if (process.env.NODE_ENV !== 'UAT') {
    return models.User.destroy({
     where: {
      email: [
        'l@outlook.com',
        'd@gmail.com',
        'srini.v@gmail.com',
        'p@gmail.com',
        'g.b@gmail.com'
      ],
     }
    })
  }
  }
};
