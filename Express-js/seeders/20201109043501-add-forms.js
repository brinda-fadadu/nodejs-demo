'use strict';

const formRecords = [{
  id: 39,
  title: 'PN Statement of Goods and Services - Trust',
  description: 'PN Statement of Goods and Services - Trust',
  formCategoryId: 7,
  docusignTemplateId: '6f74d7d1-0058-4726-8d83-7e96f64d62ef',
  isList: 0,
  formType: 'Other'
},
{
  id: 40,
  title: 'PN Statement of Goods and Services - Insurance',
  description: 'PN Statement of Goods and Services - Insurance',
  formCategoryId: 7,
  docusignTemplateId: 'cb4e795d-e97a-44ef-8afe-9f6bf862d1fd',
  isList: 0,
  formType: 'Other'
},
{
  id: 41,
  title: 'PN Quote - Funeral',
  description: 'PN Quote - Funeral',
  formCategoryId: 7,
  docusignTemplateId: 'eb972535-66f4-400c-8fc0-2e4d6889057c',
  isList: 1,
  formType: 'Other'
},
{
  id: 42,
  title: 'Quote - Cemetery',
  description: 'Quote - Cemetery',
  formCategoryId: 5,
  docusignTemplateId: 'bf551290-f90c-45c5-9b42-7607b7b2edc9',
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
