'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    const staftypes = [
      { id: 1, name: 'staff' },
      { id: 2, name: 'leadIn' },
      { id: 3, name: 'backUp' },
      { id: 4, name: 'apc' },
    ];
    return queryInterface.bulkInsert(
      'StaffType',
      staftypes,
      {},
      {
        id: {
          autoIncrement: true
        }
      }
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('StaffType', null, { truncate: true })
  }
};
