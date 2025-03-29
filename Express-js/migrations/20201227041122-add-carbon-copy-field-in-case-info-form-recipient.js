'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('CaseInfoFormRecipient', 'formRecipientRoleCarbonCopyEmailId', {
      type: Sequelize.INTEGER
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('CaseInfoFormRecipient', 'formRecipientRoleCarbonCopyEmailId')
  }
};