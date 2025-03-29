'use strict';

const formRecipientRoles = [
  {
    id: 231,
    formId: 58,
    docusignRole: 'Sales Counselor',
    roleType: 'staff',
    docusignRecipientType: 'signer',
    isMandatory: 1
  }, {
    id: 232,
    formId: 58,
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
