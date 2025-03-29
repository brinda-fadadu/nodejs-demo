'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('ChapelTypeChapel', [
      {
        id: 19,
        chapelId: 18,
        chapelTypeId: 3,
      }, {
        id: 20,
        chapelId: 19,
        chapelTypeId: 3,
      }, , {
        id: 21,
        chapelId: 20,
        chapelTypeId: 3,
      }, {
        id: 22,
        chapelId: 21,
        chapelTypeId: 3,
      }
    ], {
      logging: false
    }, {
      id: {
        autoIncrement: true
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('ChapelTypeChapel', {}, {
      truncate: true,
      restartIdentity: true
    })
  }
};
