'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('CasketSection', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      casketId: {
        type: Sequelize.INTEGER
      },
      isOutSideCasket: {
        type: Sequelize.BOOLEAN
      },
      casketType: {
        type: Sequelize.STRING
      }
    }, {
      tableName: 'CasketSection'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('CasketSection');
  }
};