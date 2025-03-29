'use strict';

const formRecords = {
  id: 58,
  title: 'Notice of Right to Cancel',
  description: 'Notice of Right to Cancel',
  formCategoryId: 5,
  docusignTemplateId: 'db8c609d-588c-4d67-9287-2c3d2a78b9da',
  isList: 1,
  formType: 'Cemetery'
}
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