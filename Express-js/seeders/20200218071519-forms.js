'use strict';

const formRecords = [{
  id: 1,
  title: 'Release Authorization',
  description: 'Body Release',
  formCategoryId: 1,
  docusignTemplateId: 'c14f8da8-50a8-4ced-9edd-adb42b6c8c9f',
  isList: 1,
  formType: 'Other'
},
{
  id: 2,
  title: 'Witness of Removal',
  description: 'Witness Removal',
  formCategoryId: 1,
  docusignTemplateId: '200743ef-68e9-4fca-b74e-83357c922f21',
  isList: 1,
  formType: 'Other'
},
{
  id: 3,
  title: 'Authorization to Accept or Decline Embalming',
  description: 'Embalming Authorization',
  formCategoryId: 1,
  docusignTemplateId: 'e0e9af39-ac61-4b26-803b-dc355453744a',
  isList: 1,
  formType: 'Funeral'
},
{
  id: 4,
  title: 'Affidavit of Disposition of Control Over Remains',
  description: 'Affidavit of Disposition of Control over Remains',
  formCategoryId: 1,
  docusignTemplateId: 'c480938a-a48d-4e40-85ee-36d274633f48',
  isList: 1,
  formType: 'Funeral and Cemetery'
},
{
  id: 5,
  title: 'Disclosure of Preneed Funeral Arrangement',
  description: 'PreNeed Disclosure',
  formCategoryId: 1,
  docusignTemplateId: '771be934-d655-4552-9be8-05daf55d751f',
  isList: 1,
  formType: 'Other'
},
{
  id: 6,
  title: 'Foreign Language Release',
  description: 'Foreign Language Release',
  formCategoryId: 2,
  docusignTemplateId: '98b0b3fe-b29d-40d4-b917-f4096ef1f818',
  isList: 1,
  formType: 'Funeral and Cemetery'
},
{
  id: 7,
  title: 'Claim and Assignment of Insurance Policy',
  description: 'Claim and Assignment of Insurance Policy',
  formCategoryId: 3,
  docusignTemplateId: 'ea64f2e7-0a8f-4838-ac90-258fda714d85',
  isList: 1,
  formType: 'AN Funeral and Cemetery'
},
{
  id: 8,
  title: 'Notice of Right to Cancel-Homesteaders',
  description: 'Notice of Right to Cancel Homesteaders',
  formCategoryId: 3,
  docusignTemplateId: 'a1e1b51b-2aa6-49be-9be1-67dc18572a80',
  isList: 1,
  formType: 'Other'
},
{
  id: 9,
  title: 'Cremation and Disposition Authorization',
  description: 'Cremation Authorization',
  formCategoryId: 4,
  docusignTemplateId: 'b2eb0271-5fc6-4dfa-b4b3-26f042a964fe',
  isList: 1,
  formType: 'Funeral and Cemetery'
},
{
  id: 10,
  title: 'Declaration for Disposition of Cremated Remains',
  description: 'Declaration of Disposition Cremated Remains',
  formCategoryId: 4,
  docusignTemplateId: '6fea19a6-1149-4a2a-823a-85ee8d9ca5e9',
  isList: 1,
  formType: 'Funeral and Cemetery'
},
{
  id: 11,
  title: 'Witness of Cremation Release',
  description: 'Witness Cremation',
  formCategoryId: 4,
  docusignTemplateId: 'c56d8299-d7b8-4fa3-b343-fc878bd9c199',
  isList: 1,
  formType: 'AN Funeral and Cemetery'
},
{
  id: 12,
  title: 'Cremated Remains Receipt',
  description: 'Release of Cremated Remains Authorization Receipt',
  formCategoryId: 4,
  docusignTemplateId: 'd1f78fbf-c11f-4f09-8f92-094e62fbfb1c',
  isList: 1,
  formType: 'AN Funeral and Cemetery'
},
{
  id: 13,
  title: 'Pre-need Trust Agreement',
  description: 'PreNeed Trust Agreement',
  formCategoryId: 3,
  docusignTemplateId: 'eb77e63b-0802-46fa-881f-6361f37cb379',
  isList: 1,
  formType: 'Other'
},
{
  id: 14,
  title: 'Declaration of Intent Regarding Preneed Funeral Arrangement by Beneficiary',
  description: 'Declaration of Intention Regarding PN Funeral Arrangements by Beneficiary',
  formCategoryId: 3,
  docusignTemplateId: '2d80977f-30cd-41e1-ac62-62ede86ab644',
  isList: 1,
  formType: 'Other'
},
{
  id: 15,
  title: 'Disinterment Witness Disclosure and Acknowledgement and Release of Liability',
  description: 'Disinterment Witness Disclosure Acknowledgement and Release of Liability',
  formCategoryId: 1,
  docusignTemplateId: 'b6c99668-1e57-4982-9b46-0a31baae0350',
  isList: 1,
  formType: 'Other'
},
{
  id: 16,
  title: 'Authorization and Release of Abandoned and Unclaimed Cremated Remains',
  description: 'Authorization and Release of Abandoned and Unclaimed Cremated Remains',
  formCategoryId: 4,
  docusignTemplateId: '725a624f-06b1-4989-8909-740356b61c44',
  isList: 1,
  formType: 'Other'
},
// {
//   id: 17,
//   title: 'Participation Agreement TPI',
//   description: 'Travel Protection Insurance Participation Agreement',
//   formCategoryId: 3,
//   docusignTemplateId: 'e503648a-f7d3-4154-a481-8081cbd4ffca',
//   isList: 1
// },
{
  id: 21,
  title: 'Death Certificate Working Copy-dev',
  description: 'Death Certificate Working Copy-dev',
  formCategoryId: 6,
  docusignTemplateId: '26850cb8-beb6-436f-9c1e-5e819bacbc72',
  isList: 0,
  formType: 'Other'
},
{
  id: 22,
  title: 'AN Statement of Goods and Services',
  description: 'AN Statement of Goods and Services',
  formCategoryId: 7,
  docusignTemplateId: '864cc79f-c0c3-4c51-9318-7b7c27fd0534',
  isList: 0,
  formType: 'Other'
},
{
  id: 23,
  title: 'Purchase Order form to send to Vendors',
  description: 'Purchase Order form to send to Vendors',
  formCategoryId: 8,
  docusignTemplateId: '907f9d4e-81da-41cb-ac45-2b5dd9239b90',
  isList: 0,
  formType: 'Other'
},
{
  id: 24,
  title: 'Retail Installment Agreement',
  description: 'Retail Installment Agreement',
  formCategoryId: 7,
  docusignTemplateId: '8dfe01d2-d69b-4cb2-8b16-cf0c0c9646c3',
  isList: 0,
  formType: 'Other'
},
{
  id: 25,
  title: 'Installment Agreement Addendum',
  description: 'Installment Agreement Addendum',
  formCategoryId: 7,
  docusignTemplateId: 'c6beec7e-26fb-4579-998b-d9a7c7d92d9a',
  isList: 0,
  formType: 'Other'
},
{
  id: 26,
  title: 'CA Cheque Request',
  description: 'CA Cheque Request',
  formCategoryId: 2,
  docusignTemplateId: '301da93e-9ea0-4908-8a8f-31aec2938734',
  isList: 0,
  formType: 'Other'
},
{
  id: 27,
  title: 'Acceptance-decline video streaming services',
  description: 'Acceptance-decline video streaming services',
  formCategoryId: 7,
  docusignTemplateId: 'cbff887a-b183-4590-9ca9-04f7ba46c9fd',
  isList: 1,
  formType: 'Other'
},
{
  id: 28,
  title: 'Designation of Interment Rights',
  description: 'Designation of Interment Rights',
  formCategoryId: 5,
  docusignTemplateId: 'bce68ffb-0f7c-4ac6-90df-6ff4481b7b18',
  isList: 1,
  formType: 'Cemetery'
},
{
  id: 29,
  title: 'Assignment of Contract and-or Interment Rights',
  description: 'Assignment of Contract and-or Interment Rights',
  formCategoryId: 5,
  docusignTemplateId: '24349f09-706a-40d4-a84b-c128d5245173',
  isList: 1,
  formType: 'Cemetery'
},
{
  id: 30,
  title: 'Family Protection Plan',
  description: 'Family Protection Plan',
  formCategoryId: 5,
  docusignTemplateId: '63c074ac-80a6-4110-9277-71e7ac57a362',
  isList: 1,
  formType: 'Cemetery'
},
{
  id: 31,
  title: 'Child and Grandchild Protection Plan',
  description: 'Child and Grandchild Protection Plan',
  formCategoryId: 5,
  docusignTemplateId: '97119d05-00c8-4371-8f77-adb0eb631bd0',
  isList: 1,
  formType: 'Cemetery'
},
{
  id: 32,
  title: 'Authorization Agreement for Preauthorized Payments',
  description: 'Authorization Agreement for Preauthorized Payments',
  formCategoryId: 5,
  docusignTemplateId: '0b9c6026-a3e1-4962-be48-b15732201295',
  isList: 1,
  formType: 'Cemetery'
},
{
  id: 33,
  title: 'Quitclaim and Transfer - Property Only',
  description: 'Quitclaim and Transfer - Property Only',
  formCategoryId: 5,
  docusignTemplateId: '1caba88c-7723-41e4-8170-08b88de8c18a',
  isList: 1,
  formType: 'Cemetery'
},
{
  id: 34,
  title: 'Deed Replacement',
  description: 'Deed Replacement',
  formCategoryId: 5,
  docusignTemplateId: 'c45a4f55-cf03-4b23-910c-c93f826f8546',
  isList: 1,
  formType: 'Cemetery'
},
{
  id: 35,
  title: 'Interment Order Authorization Form',
  description: 'Interment Order Authorization Form',
  formCategoryId: 5,
  docusignTemplateId: '8df08ebf-30fd-4aac-be3c-3cda3ef4474b',
  isList: 1,
  formType: 'Cemetery'
},
{
  id: 36,
  title: 'Order and Authorization for Disinterment and Removal',
  description: 'Order and Authorization for Disinterment and Removal',
  formCategoryId: 5,
  docusignTemplateId: '2e98ba46-dd88-431e-abb3-b2659a69d6c3',
  isList: 1,
  formType: 'Cemetery'
},
{
  id: 37,
  title: 'Temporary Release and Assignment of Cremated Remains',
  description: 'Temporary Release and Assignment of Cremated Remains',
  formCategoryId: 5,
  docusignTemplateId: '482afb8f-a456-480f-b88d-0c6ad3e39e4b',
  isList: 1,
  formType: 'Cemetery'
},
{
  id: 38,
  title: 'XX SPLIT DEPOSIT FORM',
  description: 'XX SPLIT DEPOSIT FORM',
  formCategoryId: 5,
  docusignTemplateId: '4cd42b63-f6c8-48b5-b704-60abef4c16ec',
  isList: 1,
  formType: 'Cemetery'
}
]
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Form', formRecords, null, {
      id: {
        autoIncrement: true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Form', null, {})
  }
};
