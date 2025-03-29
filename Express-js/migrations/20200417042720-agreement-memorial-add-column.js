'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('AgreementMemorial', 'memorialTypeAttributeValueId',{
      type: Sequelize.STRING
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('AgreementMemorial', 'memorialTypeAttributeValueId')
  }
};
