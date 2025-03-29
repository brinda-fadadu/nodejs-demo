'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('FormRecipientRoleCarboncopyEmail', [
      {
        "id": 1,
        "formId": 3,
        "formRecipientRoleId": 170,
        "email": "c@gmail.com"
      }, 
      {
        "id": 2,
        "formId": 3,
        "formRecipientRoleId": 170,
        "email": "c@gmail.com"
      },{
        "id": 3,
        "formId": 3,
        "formRecipientRoleId": 170,
        "email": "a@gmail.com"
      },{
        "id": 4,
        "formId": 3,
        "formRecipientRoleId": 170,
        "email": "s@gmail.com"
      },
    ], { logging: console.log, timestamp: false }, {
      id: {
        autoIncrement: true
      },
      timestamps: false
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('FormRecipientRoleCarboncopyEmail', null, {});

  }
};
