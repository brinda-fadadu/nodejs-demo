'use strict';

const formRecipientRoles = [
  {
    id: 241,
    formId: 62,
    docusignRole: 'Arranger',
    roleType: 'staff',
    docusignRecipientType: 'signer',
    isMandatory: 1
  },
  {
    id: 242,
    formId: 62,
    docusignRole: 'Purchaser',
    roleType: 'family',
    docusignRecipientType: 'signer',
    isMandatory: 1
  },
  {
    id: 243,
    formId: 62,
    docusignRole: 'CoPurchaser',
    roleType: 'family',
    docusignRecipientType: 'signer',
    isMandatory: 0
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
