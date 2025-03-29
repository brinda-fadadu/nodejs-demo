'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
      await queryInterface.addColumn('Place', 'addressTypeId', {
        type: Sequelize.INTEGER
      }),
      await queryInterface.addConstraint('Place', ['addressTypeId'], {
        type: 'foreign key',
        name: 'FK_Race_AddressTypes_addressTypeId',
        references: {
          table: 'AddressTypes',
          field: 'id'
        },
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })
    
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Place', 'addressTypeId')
  }
};
