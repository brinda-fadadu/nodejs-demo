'use strict';

const formRecords = [{
  id: 63,
  title: 'Quotation',
  description: 'Quotation',
  formCategoryId: 7,
  docusignTemplateId: '488caca5-a4a7-4f43-b2e9-beb3be7face2',
  isList: 0,
  formType: 'Funeral and Cemetery'
}]

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Form', formRecords, null, {
      id: {
        autoIncrement: true
      }
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Form', null, {})
  }
};
