'use strict';

const formRecipientRoles = [
  {
  id: 150,
  formId: 45,
  docusignRole: 'Sales Counselor',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 151,
  formId: 45,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 152,
  formId: 45,
  docusignRole: 'Co-Purchaser1',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 153,
  formId: 45,
  docusignRole: 'Co-Purchaser2',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 154,
  formId: 45,
  docusignRole: 'Co-Purchaser3',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 155,
  formId: 46,
  docusignRole: 'Funeral Admin',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 156,
  formId: 46,
  docusignRole: 'Certifier',
  roleType: 'certifier',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 157,
  formId: 47,
  docusignRole: 'Arranger',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 158,
  formId: 47,
  docusignRole: 'Manager',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 159,
  formId: 48,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 160,
  formId: 48,
  docusignRole: 'Arranger',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 161,
  formId: 49,
  docusignRole: 'Arranger1',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 162,
  formId: 49,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 163,
  formId: 49,
  docusignRole: 'Arranger2',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 164,
  formId: 49,
  docusignRole: 'Arranger3',
  roleType: 'staff',
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
