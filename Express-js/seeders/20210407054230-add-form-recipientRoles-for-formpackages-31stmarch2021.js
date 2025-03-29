'use strict';
const formRecipientRoles = [
  {
    id: 210,
    formId: 56,
    docusignRole: 'Funeral Director',
    roleType: 'staff',
    docusignRecipientType: 'signer',
    isMandatory: 1
  },
  {
    id: 211,
    formId: 56,
    docusignRole: 'Purchaser',
    roleType: 'family',
    docusignRecipientType: 'signer',
    isMandatory: 1
  },
  {
    id: 212,
    formId: 56,
    docusignRole: 'Co-Purchaser',
    roleType: 'family',
    docusignRecipientType: 'signer',
    isMandatory: 0
    
  }, 
  {
    id: 214,
    formId: 56,
    docusignRole: 'Arranger2',
    roleType: 'staff',
    docusignRecipientType: 'signer',
    isMandatory: 0
  },
  {
    id: 215,
    formId: 56,
    docusignRole: 'Arranger3',
    roleType: 'staff',
    docusignRecipientType: 'signer',
    isMandatory: 0
  },
  {
    id: 216,
    formId: 56,
    docusignRole: 'Payor',
    roleType: 'family',
    docusignRecipientType: 'signer',
    isMandatory: 1
  },
  {
    id: 217,
    formId: 56,
    docusignRole: 'Co-Payor',
    roleType: 'family',
    docusignRecipientType: 'signer',
    isMandatory: 0
  },
  {
    id: 218,
    formId: 56,
    docusignRole: 'Funeral Home Manager',
    roleType: 'staff',
    docusignRecipientType: 'signer',
    isMandatory: 1
  },
  {
    id: 220,
    formId: 55,
    docusignRole: 'Arranger',
    roleType: 'staff',
    docusignRecipientType: 'signer',
    isMandatory: 1
  },
  {
    id: 221,
    formId: 55,
    docusignRole: 'Purchaser',
    roleType: 'family',
    docusignRecipientType: 'signer',
    isMandatory: 1
  },
  {
    id: 222,
    formId: 55,
    docusignRole: 'Co-Purchaser',
    roleType: 'family',
    docusignRecipientType: 'signer',
    isMandatory: 0
  },
  {
    id: 223,
    formId: 55,
    docusignRole: 'Beneficiary',
    roleType: 'self',
    docusignRecipientType: 'signer',
    isMandatory: 1
  },
  {
    id: 224,
    formId: 55,
    docusignRole: 'Payor',
    roleType: 'family',
    docusignRecipientType: 'signer',
    isMandatory: 0
  },
  // {
  //   id: 225,
  //   formId: 55,
  //   docusignRole: 'Co-Payor',
  //   roleType: 'family',
  //   docusignRecipientType: 'signer',
  //   isMandatory: 0
  // },
  {
    id: 226,
    formId: 55,
    docusignRole: 'Legal Representative Of Purchaser',
    roleType: 'otherRecipient',
    docusignRecipientType: 'signer',
    isMandatory: 0
  },
  {
    id: 227,
    formId: 55,
    docusignRole: 'Spouse Of Purchaser',
    roleType: 'otherRecipient',
    docusignRecipientType: 'signer',
    isMandatory: 0
  },
  {
    id: 228,
    formId: 55,
    docusignRole: 'Arranger2',
    roleType: 'staff',
    docusignRecipientType: 'signer',
    isMandatory: 0
  },
  {
    id: 229,
    formId: 55,
    docusignRole: 'Arranger3',
    roleType: 'staff',
    docusignRecipientType: 'signer',
    isMandatory: 0
  },
  {
    id: 230,
    formId: 55,
    docusignRole: 'Vp Of Sales',
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
