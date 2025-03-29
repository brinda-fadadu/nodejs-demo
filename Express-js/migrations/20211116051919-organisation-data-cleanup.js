'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
     return Promise.all([queryInterface.sequelize.query(`update Organization set deletedAt=getdate(),deletedBy=1`)],
     [queryInterface.sequelize.query(`update Certifier set deletedAt=getdate(),deletedBy=1`)])
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
     return Promise.all([queryInterface.sequelize.query(`update Organization set deletedAt=null,deletedBy=null`)],
     [queryInterface.sequelize.query(`update Certifier set deletedAt=null,deletedBy=null`)])
  }
};
