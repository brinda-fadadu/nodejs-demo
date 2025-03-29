'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */

    return Promise.all([
      queryInterface.addColumn('WorkOrderChamberAccountabilityLog', 'urnSelection', {
        type: Sequelize.STRING
      }),
      queryInterface.addColumn('WorkOrderChamberAccountabilityLog', 'urnDeliveryDate', {
        type: Sequelize.DATE
      })
    ])
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
   return Promise.all([
    queryInterface.removeColumn('WorkOrderChamberAccountabilityLog', 'urnSelection'),
    queryInterface.removeColumn('WorkOrderChamberAccountabilityLog', 'urnDeliveryDate'),
  ])
  }
};
