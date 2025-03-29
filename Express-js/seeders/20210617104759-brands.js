'use strict';
let models = require('../models')
let docuSignClient = require('../services/docusign')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await docuSignClient.docuSignClient.getBrands().then(async (data) => {
      if (data && data.brands && data.brands.length > 0) {
        let brands = data.brands.filter(b => b.brandCompany).map((d) => {
            return {
              brandId: d['brandId'],
              brandName: d['brandName'],
              brandCompany: d['brandCompany']
            };
        });
        await queryInterface.bulkInsert('Docusignbrand', brands, { logging: console.log }, {
          id: {
            autoIncrement: true        // Enables identity insert true
          }
        });
      }
    }).catch((error) => {
      console.log(error);
    });

  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Docusignbrand', null, {});
  }
};

