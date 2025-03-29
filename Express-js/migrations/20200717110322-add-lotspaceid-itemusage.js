module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('ItemUsage', 'lotSpaceId', {
      type: Sequelize.STRING
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('DeathDetails', 'lotSpaceId')
  }
};