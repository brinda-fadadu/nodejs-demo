'use strict';

const formRecords = [{
  id: 61,
  title: 'Pre-Need Trust Notice of Cancellation',
  description: 'Pre-Need Trust Notice of Cancellation',
  formCategoryId: 7,
  docusignTemplateId: '03a37234-f241-4a4b-9f8c-6a4662060458',
  isList: 1,
  formType: 'Funeral'
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
