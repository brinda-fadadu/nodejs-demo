'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('CaseInfoFormRecipient', 'agreementPropertyOwnerId', {
      type: Sequelize.INTEGER,
      defaultValue: false
    })
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('CaseInfoFormRecipient', 'agreementPropertyOwnerId')
  }
};