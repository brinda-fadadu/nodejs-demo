'use strict';

const formRecipientRoles = [{
  id: 1,
  formId: 1,
  docusignRole: 'FuneralAssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 2,
  formId: 1,
  docusignRole: 'FuneralAuthorizer',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 3,
  formId: 2,
  docusignRole: 'FuneralAssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 4,
  formId: 2,
  docusignRole: 'FuneralAuthorizer',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 5,
  formId: 2,
  docusignRole: 'RemovalWitness',
  roleType: 'otherRecipient',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 6,
  formId: 3,
  docusignRole: 'FuneralAssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 7,
  formId: 3,
  docusignRole: 'FuneralAuthorizer',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 8,
  formId: 4,
  docusignRole: 'AssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 9,
  formId: 4,
  docusignRole: 'Authorizer',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 10,
  formId: 5,
  docusignRole: 'FuneralAssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 11,
  formId: 5,
  docusignRole: 'FuneralAuthorizer',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 12,
  formId: 6,
  docusignRole: 'AssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 13,
  formId: 6,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 14,
  formId: 6,
  docusignRole: 'Co-Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 15,
  formId: 7,
  docusignRole: 'AssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 16,
  formId: 7,
  docusignRole: 'Beneficiary 1',
  roleType: 'self and family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 17,
  formId: 7,
  docusignRole: 'Beneficiary 2',
  roleType: 'otherRecipient',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 18,
  formId: 8,
  docusignRole: 'FuneralAssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 19,
  formId: 8,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 20,
  formId: 9,
  docusignRole: 'AssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 21,
  formId: 9,
  docusignRole: 'Next Of Kin 1',
  roleType: 'self and family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 22,
  formId: 9,
  docusignRole: 'Next Of Kin 2',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 24,
  formId: 10,
  docusignRole: 'AssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 25,
  formId: 10,
  docusignRole: 'Authorizer',
  roleType: 'self and family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 26,
  formId: 10,
  docusignRole: 'Next of kin 1',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 27,
  formId: 10,
  docusignRole: 'Next Of Kin 2',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 28,
  formId: 11,
  docusignRole: 'AssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 29,
  formId: 11,
  docusignRole: 'Witness1',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 30,
  formId: 11,
  docusignRole: 'Witness2',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 31,
  formId: 12,
  docusignRole: 'AssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 32,
  formId: 12,
  docusignRole: 'Appointed Designee',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 33,
  formId: 12,
  docusignRole: 'Legal Representative1',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 34,
  formId: 12,
  docusignRole: 'Legal Representative2',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 35,
  formId: 13,
  docusignRole: 'Funeral Director',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 36,
  formId: 13,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 37,
  formId: 13,
  docusignRole: 'Funeral Home Manager',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 38,
  formId: 14,
  docusignRole: 'Funeral Director',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 39,
  formId: 14,
  docusignRole: 'Beneficiary',
  roleType: 'self',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 40,
  formId: 15,
  docusignRole: 'Cemetery representative',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 41,
  formId: 15,
  docusignRole: 'Witness 1',
  roleType: 'otherRecipient',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 42,
  formId: 15,
  docusignRole: 'Witness 2',
  roleType: 'otherRecipient',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 43,
  formId: 16,
  docusignRole: 'Funeral Director',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 44,
  formId: 16,
  docusignRole: 'Next of kin 1',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 45,
  formId: 16,
  docusignRole: 'Next of kin 2',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
// {
//   id: 46,
//   formId: 17,
//   docusignRole: 'Funeral Director',
//   roleType: 'staff',
//   docusignRecipientType: 'signer'
// },
// {
//   id: 47,
//   formId: 17,
//   docusignRole: 'Purchaser',
//   roleType: 'staff',
//   docusignRecipientType: 'signer'
// },
// {
//   id: 48,
//   formId: 18,
//   docusignRole: 'FuneralHomeRepresentative',
//   roleType: 'staff',
//   docusignRecipientType: 'signer'
// },
// {
//   id: 49,
//   formId: 18,
//   docusignRole: 'AuthorizedRepresentative',
//   roleType: 'staff',
//   docusignRecipientType: 'signer'
// },
// {
//   id: 50,
//   formId: 19,
//   docusignRole: 'FuneralHomeRepresentative(inperson)',
//   roleType: 'staff',
//   docusignRecipientType: 'inpersonsigner'
// },
// {
//   id: 51,
//   formId: 19,
//   docusignRole: 'AuthorizedRepresentative',
//   roleType: 'staff',
//   docusignRecipientType: 'inpersonsigner'
// },
// {
//   id: 52,
//   formId: 20,
//   docusignRole: 'AuthorizedRepresentative',
//   roleType: 'staff',
//   docusignRecipientType: 'signer'
// },
// {
//   id: 53,
//   formId: 20,
//   docusignRole: 'FuneralHomeRepresentative',
//   roleType: 'staff',
//   docusignRecipientType: 'signer'
// },
{
  id: 54,
  formId: 21,
  docusignRole: 'FuneralDirector',
  roleType: 'staff',
  docusignRecipientType: 'signer'
},
{
  id: 55,
  formId: 21,
  docusignRole: 'Informant',
  roleType: 'family',
  docusignRecipientType: 'signer'
},
{
  id: 56,
  formId: 22,
  docusignRole: 'FuneralAssignedTo',
  roleType: 'staff',
  docusignRecipientType: 'signer'
},
{
  id: 57,
  formId: 22,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer'
},
{
  id: 58,
  formId: 22,
  docusignRole: 'Co-Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer'
},
{
  id: 59,
  formId: 23,
  docusignRole: 'Purchasing Dept',
  roleType: 'staff',
  docusignRecipientType: 'signer'
},
{
  id: 60,
  formId: 23,
  docusignRole: 'Vendor',
  roleType: 'staff',
  docusignRecipientType: 'certifiedDeliveries'
},
{
  id: 61,
  formId: 23,
  docusignRole: 'Alternate Vendor',
  roleType: 'staff',
  docusignRecipientType: 'signer'
},
{
  id: 62,
  formId: 24,
  docusignRole: 'Sales Counselor',
  roleType: 'staff',
  docusignRecipientType: 'signer'
},
{
  id: 63,
  formId: 24,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer'
},
{
  id: 64,
  formId: 24,
  docusignRole: 'CoPurchaser1',
  roleType: 'family',
  docusignRecipientType: 'signer'
},{
  id: 65,
  formId: 24,
  docusignRole: 'Sales Manager',
  roleType: 'staff',
  docusignRecipientType: 'signer'
},
{
  id: 66,
  formId: 25,
  docusignRole: 'Sales Counselor',
  roleType: 'staff',
  docusignRecipientType: 'signer'
},
{
  id: 67,
  formId: 25,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer'
},
{
  id: 68,
  formId: 25,
  docusignRole: 'CoPurchaser',
  roleType: 'family',
  docusignRecipientType: 'signer'
},
{
  id: 69,
  formId: 25,
  docusignRole: 'Sales Manager',
  roleType: 'staff',
  docusignRecipientType: 'signer'
},

{
  id: 70,
  formId: 11,
  docusignRole: 'Witness3',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 71,
  formId: 11,
  docusignRole: 'Witness4',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 72,
  formId: 11,
  docusignRole: 'Witness5',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 73,
  formId: 11,
  docusignRole: 'Witness6',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 74,
  formId: 10,
  docusignRole: 'Next Of Kin 3',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},

{
  id: 75,
  formId: 15,
  docusignRole: 'Witness 3',
  roleType: 'otherRecipient',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 76,
  formId: 15,
  docusignRole: 'Witness 4',
  roleType: 'otherRecipient',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 78,
  formId: 9,
  docusignRole: 'Next Of Kin 3',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 79,
  formId: 9,
  docusignRole: 'Next Of Kin 4',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 80,
  formId: 9,
  docusignRole: 'Next Of Kin 5',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 81,
  formId: 9,
  docusignRole: 'Next Of Kin 6',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 82,
  formId: 9,
  docusignRole: 'Next Of Kin 7',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 83,
  formId: 9,
  docusignRole: 'Next Of Kin 8',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 84,
  formId: 26,
  docusignRole: 'Funeral Admin',
  roleType: 'self',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 85,
  formId: 26,
  docusignRole: 'AP',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 86,
  formId: 27,
  docusignRole: 'Funeral Director',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 87,
  formId: 27,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 88,
  formId: 27,
  docusignRole: 'Co-Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 89,
  formId: 28,
  docusignRole: 'Sales Counselor',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 90,
  formId: 28,
  docusignRole: 'Purchaser',
  roleType: 'propertyOwner',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 91,
  formId: 28,
  docusignRole: 'Co-Purchaser',
  roleType: 'propertyOwner',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 92,
  formId: 29,
  docusignRole: 'Sales Counselor',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 93,
  formId: 29,
  docusignRole: 'Owner',
  roleType: 'propertyOwner',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 94,
  formId: 29,
  docusignRole: 'Co-Owner',
  roleType: 'propertyOwner',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 95,
  formId: 29,
  docusignRole: 'Assignee1',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 96,
  formId: 29,
  docusignRole: 'Assignee2',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 97,
  formId: 30,
  docusignRole: 'Sales Counselor',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 98,
  formId: 30,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 99,
  formId: 30,
  docusignRole: 'Co-Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 100,
  formId: 30,
  docusignRole: 'Sales Manager',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 101,
  formId: 31,
  docusignRole: 'Sales Counselor',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 102,
  formId: 31,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 103,
  formId: 31,
  docusignRole: 'Co-Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 104,
  formId: 31,
  docusignRole: 'Sales Manager',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 105,
  formId: 32,
  docusignRole: 'Sales counselor',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 106,
  formId: 32,
  docusignRole: 'Payor',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 107,
  formId: 33,
  docusignRole: 'Owner',
  roleType: 'oldPropertyOwner',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 108,
  formId: 33,
  docusignRole: 'Co-Owner',
  roleType: 'oldPropertyOwner',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 109,
  formId: 33,
  docusignRole: 'New Owner',
  roleType: 'propertyOwner',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 110,
  formId: 33,
  docusignRole: 'New Co-Owner',
  roleType: 'propertyOwner',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 111,
  formId: 33,
  docusignRole: 'Sales Counselor',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 112,
  formId: 34,
  docusignRole: 'Owner',
  roleType: 'propertyOwner',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 113,
  formId: 34,
  docusignRole: 'Co-Owner',
  roleType: 'propertyOwner',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 114,
  formId: 34,
  docusignRole: 'Sales Counselor',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 115,
  formId: 34,
  docusignRole: 'Admin',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 116,
  formId: 35,
  docusignRole: 'Sales Counselor',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 117,
  formId: 35,
  docusignRole: 'Legal Representative',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 118,
  formId: 35,
  docusignRole: 'Owner',
  roleType: 'propertyOwner',
  docusignRecipientType: 'signer',
  isMandatory: 0
},
{
  id: 119,
  formId: 36,
  docusignRole: 'Sales Counselor',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 120,
  formId: 36,
  docusignRole: 'Legal Representative1',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 121,
  formId: 36,
  docusignRole: 'Legal Representative2',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 122,
  formId: 36,
  docusignRole: 'Owner',
  roleType: 'propertyOwner',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 123,
  formId: 37,
  docusignRole: 'Staff',
  roleType: 'staff',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 124,
  formId: 37,
  docusignRole: 'Legal Representative1',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},
{
  id: 125,
  formId: 38,
  docusignRole: 'Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 1
},{
  id: 126,
  formId: 38,
  docusignRole: 'Co-Purchaser',
  roleType: 'family',
  docusignRecipientType: 'signer',
  isMandatory: 0
},{
  id: 127,
  formId: 38,
  docusignRole: 'Sales Counselor',
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
