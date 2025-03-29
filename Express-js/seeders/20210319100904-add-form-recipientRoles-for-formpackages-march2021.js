'use strict';

const formRecipientRoles = [{
  id: 171,
  formId: 54,
  docusignRole: 'Sales Counselor',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 172,
  formId: 54,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 173,
  formId: 54,
  docusignRole: 'Co-Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
}, {
  id: 174,
  formId: 54,
  docusignRole: 'Sales Manager',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 175,
  formId: 53,
  docusignRole: 'FuneralAssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 176,
  formId: 53,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 177,
  formId: 53,
  docusignRole: 'Co-Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
}, {
  id: 178,
  formId: 53,
  docusignRole: 'FuneralAuthorizer',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 179,
  formId: 52,
  docusignRole: 'FuneralAssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 180,
  formId: 52,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 181,
  formId: 52,
  docusignRole: 'Co-Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
}, {
  id: 182,
  formId: 52,
  docusignRole: 'FuneralAuthorizer',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 183,
  formId: 52,
  docusignRole: 'Next Of Kin 1',
  roleType: 'self and family',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 184,
  formId: 52,
  docusignRole: 'Next Of Kin 2',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
}, {
  id: 185,
  formId: 52,
  docusignRole: 'Next Of Kin 3',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
}, {
  id: 186,
  formId: 52,
  docusignRole: 'Next Of Kin 4',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
}, {
  id: 187,
  formId: 52,
  docusignRole: 'Next Of Kin 5',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
}, {
  id: 188,
  formId: 52,
  docusignRole: 'Next Of Kin 6',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
}, {
  id: 189,
  formId: 52,
  docusignRole: 'Next Of Kin 7',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
}, {
  id: 190,
  formId: 52,
  docusignRole: 'Next Of Kin 8',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
}, {
  id: 191,
  formId: 51,
  docusignRole: 'AssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 192,
  formId: 51,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 193,
  formId: 51,
  docusignRole: 'Co-Purchaser1',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
}, {
  id: 194,
  formId: 51,
  docusignRole: 'Co-Purchaser2',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
}, {
  id: 195,
  formId: 51,
  docusignRole: 'Sales Manager',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 197,
  formId: 51,
  docusignRole: 'Authorizer',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 198,
  formId: 51,
  docusignRole: 'Legal Representative',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 199,
  formId: 51,
  docusignRole: 'Owner',
  roleType: 'propertyOwner',
  docusignRecipientType: 'signer',
  isMandatory: 0
}, {
  id: 200,
  formId: 57,
  docusignRole: 'AssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 201,
  formId: 57,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 202,
  formId: 57,
  docusignRole: 'Co-Purchaser1',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 203,
  formId: 57,
  docusignRole: 'Co-Purchaser2',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
}, {
  id: 204,
  formId: 57,
  docusignRole: 'Payor',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 206,
  formId: 57,
  docusignRole: 'Co-Payor',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
}, {
  id: 207,
  formId: 57,
  docusignRole: 'Owner',
  roleType: 'propertyOwner',
  docusignRecipientType: 'signer',
  isMandatory: 1
}, {
  id: 208,
  formId: 57,
  docusignRole: 'Co-Owner',
  roleType: 'propertyOwner',
  docusignRecipientType: 'signer',
  isMandatory: 0
}, {
  id: 209,
  formId: 57,
  docusignRole: 'Sales Manager',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
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
