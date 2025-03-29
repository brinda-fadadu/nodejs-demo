'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    let data = [{
      id:1,
      name: 'chapel'
    },{
      id:2,
      name: 'crematory'
    }]
    return queryInterface.bulkInsert('ChapelType', data, {}, {
      id: {
        autoIncrement: true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('ChapelType', null, { truncate: true })
  }
};
