'use strict';

const formRecipientRoles = [
  {
    id: 165,
    formId: 50,
    docusignRole: 'Arranger',
    roleType: 'staff',
    docusignRecipientType: 'signer',
    isMandatory: 1
  },
  {
    id: 166,
    formId: 50,
    docusignRole: 'Payor',
    roleType: 'family',
    docusignRecipientType: 'signer',
    isMandatory: 1
  }, {
    id: 167,
    formId: 50,
    docusignRole: 'Co-Payor',
    roleType: 'family',
    docusignRecipientType: 'signer',
    isMandatory: 0
  },
  {
    id: 168,
    formId: 24,
    docusignRole: 'CoPurchaser2',
    roleType: 'family',
    docusignRecipientType: 'signer',
    isMandatory: 0
  },
  {
    id: 169,
    formId: 32,
    docusignRole: 'Co-Payor',
    roleType: 'family',
    docusignRecipientType: 'signer',
    isMandatory: 0
  }
]
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('FormRecipientRole', formRecipientRoles, null, {
      id: {
        autoIncrement: true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('FormRecipientRole', null, {})
  }
};
