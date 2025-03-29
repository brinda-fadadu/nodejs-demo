'use strict';

const formRecipientRoles = [
  {
  id: 141,
  formId: 44,
  docusignRole: 'Funeral Arranger',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 142,
  formId: 44,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 143,
  formId: 43,
  docusignRole: 'Funeral Arranger',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 144,
  formId: 43,
  docusignRole: 'Beneficiary',
  roleType: 'self',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 145,
  formId: 43,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 146,
  formId: 43,
  docusignRole: 'Payor',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 147,
  formId: 43,
  docusignRole: 'Spouse Of Purchaser',
  roleType: 'otherRecipient',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 148,
  formId: 43,
  docusignRole: 'Legal Representative Of Purchaser',
  roleType: 'otherRecipient',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 149,
  formId: 43,
  docusignRole: 'Vp Of Sales',
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
