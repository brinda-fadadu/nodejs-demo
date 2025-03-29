'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([queryInterface.addColumn('CasketSection', 'resourceType', {
      type: Sequelize.STRING
    }),
    queryInterface.addColumn('UrnInformationSection', 'resourceType', {
      type: Sequelize.STRING
    }),
    queryInterface.addColumn('VaultSection', 'resourceType', {
      type: Sequelize.STRING
    }),
    queryInterface.addColumn('IntermentInformationSection', 'isPreburied', {
      type: Sequelize.STRING
    })
  ])

  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('CasketSection', 'resourceType'),
      queryInterface.removeColumn('UrnInformationSection', 'resourceType'),
      queryInterface.removeColumn('VaultSection', 'resourceType'),
      queryInterface.removeColumn('IntermentInformationSection', 'isPreburied')
    ])
  }
};
