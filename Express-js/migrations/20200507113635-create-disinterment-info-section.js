'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('DisintermentInfoSection', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      propertyId: {
        type: Sequelize.INTEGER
      },
      beginningTime: {
        type: Sequelize.DATE
      },
      endingTime: {
        type: Sequelize.DATE
      },
      disintermentReason: {
        type: Sequelize.STRING
      },
      disintermentType: {
        type: Sequelize.STRING
      },
      instruction: {
        type: Sequelize.TEXT
      }
    },{
      tableName: 'DisintermentInfoSection'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('DisintermentInfoSection');
  }
};