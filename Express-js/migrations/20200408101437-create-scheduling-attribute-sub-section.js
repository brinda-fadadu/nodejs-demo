'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('SchedulingAttributeSubSection', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      schedulingAttributeSectionId: {
        type: Sequelize.INTEGER
      },
      subSection: {
        type: Sequelize.STRING
      },
      subSectionLabel: {
        type: Sequelize.STRING
      }
    }, {
      tableName: 'SchedulingAttributeSubSection'
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('SchedulingAttributeSubSection');
  }
};