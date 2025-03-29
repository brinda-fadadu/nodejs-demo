'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
     
     await queryInterface.changeColumn('DecedentAndCremationDetails', 'expedite', {
      type: Sequelize.STRING
    })
    return Promise.all([ queryInterface.sequelize.query(`update DecedentAndCremationDetails set expedite = null where  expedite = '0'`),  queryInterface.sequelize.query(`update DecedentAndCremationDetails set expedite = '24H' where  expedite = '1'`)])
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
     return queryInterface.changeColumn('DecedentAndCremationDetails', 'expedite', {
      type: Sequelize.BOOLEAN
    })
  }
};
