'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('CaseInfoFormRecipient', 'docusignClientUserId', {
      type: Sequelize.STRING
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('CaseInfoFormRecipient', 'docusignClientUserId')
  }
};
