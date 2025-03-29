'use strict';

const formCategoryRecords = [
  {
    id: 9,
    name: 'Package'
  }
]

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('FormCategory', formCategoryRecords, null, {
      id: {
        autoIncrement: true
      }
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('FormCategory', null, {})
  }
};
