'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('PropertyCampus', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      code: {
        type: Sequelize.STRING
      }
    },{
      tableName:'PropertyCampus'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('PropertyCampus');
  }
};