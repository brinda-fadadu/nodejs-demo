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
      queryInterface.addColumn('WorkOrderChamberAccountabilityLog', 'clFacilityLocationId', {
        type: Sequelize.INTEGER
      }),
      queryInterface.addColumn('WorkOrderChamberAccountabilityLog', 'serviceLocationId', {
        type: Sequelize.INTEGER
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
    queryInterface.removeColumn('WorkOrderChamberAccountabilityLog', 'clFacilityLocationId'),
    queryInterface.removeColumn('WorkOrderChamberAccountabilityLog', 'serviceLocationId'),
  ])
  }
};
