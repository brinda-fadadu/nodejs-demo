'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('CertificateOfSepulcher', 'certificateNumber', {
      type: Sequelize.STRING
    })
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('CertificateOfSepulcher', 'certificateNumber')
  }
};
