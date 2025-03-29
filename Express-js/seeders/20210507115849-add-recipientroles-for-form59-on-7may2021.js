'use strict';

const formRecipientRoles = [
  {
    id: 234,
    formId: 59,
    docusignRole: 'Arranger',
    roleType: 'staff',
    docusignRecipientType: 'signer',
    isMandatory: 1
  },
  {
    id: 235,
    formId: 59,
    docusignRole: 'Manager',
    roleType: 'staff',
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
