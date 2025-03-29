'use strict';
const moment = require('moment')
const startDate = moment().subtract(1, 'days').format('YYYY/MM/DD HH:mm:ss')
const endDate = moment(startDate, "YYYY/MM/DD").add('years', 120).format('L')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    let data = [{
      "title": "Property Transfer Credit",
      "adjustmentTypeId":3,
      "agreementTypeId":2,
      "discountUnit":'$',
      "startDate":startDate,
      "endDate":endDate,
      "isApprovalNeeded": false,
      "isCustomAmount": true,
      "isOnlyDiscount": false,
      "isDisabled": false,
      "createdAt": startDate,
      "updatedAt": startDate
    }]
    return queryInterface.bulkInsert('Adjustment', data, {}, {
      id: {
        autoIncrement: true
      }
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Adjustment', null, { truncate: true });
  }
};
