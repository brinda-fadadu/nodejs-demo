'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    const workOrderStatus = [
      { id: 1, name: 'unassigned' },
      { id: 2, name: 'assigned' },
      { id: 3, name: 'closed' }
    ];
    return queryInterface.bulkInsert(
      'WorkOrderStatus',
      workOrderStatus,
      {},
      {
        id: {
          autoIncrement: true
        }
      }
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('WorkOrderStatus', null, { truncate: true })
  }
};
