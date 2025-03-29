'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('LinkAgreement', 'hmisContractType', {
      type: Sequelize.STRING
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('LinkAgreement', 'hmisContractType', {
      type: Sequelize.INTEGER
    })
  }
};
