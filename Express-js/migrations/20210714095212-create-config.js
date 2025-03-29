'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Config', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      configName: {
        type: Sequelize.STRING(50),
        unique: true
      },
      configValue: {
        type: Sequelize.STRING(1000)
      }
    }, {
      tableName: 'Config'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Config');
  }
};
