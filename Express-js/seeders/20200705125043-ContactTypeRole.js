'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('contactTypeRole',[
        {
            id: 1,
            roleId: 9,
            contactType: 1
        },
        {
            id: 2,
            roleId: 3,
            contactType: 3
        },
        {
            id: 3,
            roleId: 2,
            contactType: 3
        },
        {
            id: 4,
            roleId: 4,
            contactType: 3
        },
        {
            id: 5,
            roleId: 5,
            contactType: 3
        },
        {
            id: 6,
            roleId: 13,
            contactType: 3
        },
        {
            id: 7,
            roleId: 6,
            contactType: 3
        },
        {
            id: 8,
            roleId: 11,
            contactType: 2
        },
        {
            id: 9,
            roleId: 7,
            contactType: 1
        },
        {
            id: 10,
            roleId: 1,
            contactType: 1
        },
        {
            id: 11,
            roleId: 11,
            contactType: 1
        },
        {
            id: 12,
            roleId: 10,
            contactType: 1
        },
        {
            id: 13,
            roleId: 12,
            contactType: 1
        },
        {
            id: 14,
            roleId: 14,
            contactType: 1
        },
        {
            id: 15,
            roleId: 3,
            contactType: 1
        },
        {
            id: 16,
            roleId: 8,
            contactType: 1
        },
        {
            id: 17,
            roleId: 1,
            contactType: 2
        }
      ],{

    },{
      id: {
        autoIncrement: true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('contactTypeRole', null, {})
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkDelete('People', null, {});
    */
  }
};
