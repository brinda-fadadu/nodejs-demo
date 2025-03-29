'use strict';

const formRecipientRoles = [
  {
    id: 236,
    formId: 60,
    docusignRole: 'Witness1',
    roleType: 'staff',
    docusignRecipientType: 'signer',
    isMandatory: 1
  },
  {
    id: 237,
    formId: 60,
    docusignRole: 'Witness2',
    roleType: 'staff',
    docusignRecipientType: 'signer',
    isMandatory: 1
  },
  {
    id: 238,
    formId: 60,
    docusignRole: 'Crematory',
    roleType: 'otherRecipient',
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
