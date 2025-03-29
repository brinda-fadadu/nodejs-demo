'use strict';

const formRecipientRoles = [
  {
    id: 233,
    formId: 10,
    docusignRole: 'Purchaser',
    roleType: 'family',
    docusignRecipientType: 'signer',
    isMandatory: 1
  }
]
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('FormRecipientRole', formRecipientRoles, null, {
      id: {
        autoIncrement: true
      }
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('FormRecipientRole', null, {})
  }
};
