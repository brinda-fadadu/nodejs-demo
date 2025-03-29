'use strict';
const moment = require('moment')
const startDate = moment().subtract(1, 'days').format('YYYY/MM/DD HH:mm:ss')
const endDate = moment(startDate, "YYYY/MM/DD").add('years', 120).format('L')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    let data = [{
      "title": "Reverse Tax (Ship Out of Country)",
      "adjustmentTypeId": 3,
      "agreementTypeId": 1,
      "code": null,
      "description": null,
      "discountUnit": "$",
      "maxDiscountValue": null,
      "discountValue": null,
      "startDate": startDate,
      "endDate": endDate,
      "isApprovalNeeded": false,
      "isCustomAmount": true,
      "isOnlyDiscount": false,
      "isDisabled": false,
      "createdBy": null,
      "updatedBy": null,
      "deletedBy": null,
      "deletedAt": null,
      "createdAt": startDate,
      "updatedAt": startDate,
      "hMISAdjustmentCode": null,
      "hmisItemCode": 'CSHIPOUTAX'
    }]
    return queryInterface.bulkInsert('Adjustment', data, {}, {
      id: {
        autoIncrement: true
      }
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Adjustment', null, { truncate: true });
  }
};
