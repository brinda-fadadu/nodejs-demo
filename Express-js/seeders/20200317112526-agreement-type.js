'use strict';
const moment = require('moment')
const startDate = moment().format('YYYY/MM/DD HH:mm:ss')
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('AgreementType',[{
      "id": 1,
      "agreementType": "Funeral"
    },
    {
      "id": 2,
      "agreementType": "Cemetry"
    },
    {
      "id": 3,
      "agreementType": "Both"
    },
    {
      "id": 4,
      "agreementType": "Wholesale Cremation"
    },
    {
      "id": 5,
      "agreementType": 'Miscellaneous Sales'
    }
  ],{logging: console.log},{
      id:{
        autoIncrement:true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('AgreementType', null, {});
  }
};
