'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('AgreementItemMapper', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      active: {
        type: Sequelize.BOOLEAN
      }
    },{
      tableName: 'AgreementItemMapper'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('AgreementItemMapper');
  }
};
