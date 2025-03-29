'use strict'
const moment = require('moment')
const startDate = moment()
  .subtract(1, 'days')
  .format('YYYY/MM/DD HH:mm:ss')
const endDate = moment(startDate, 'YYYY/MM/DD')
  .add('years', 120)
  .format('L')
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      'Adjustment',
      [
        {
          title: 'Partial Interest Adjustment',
          agreementTypeId: 3,
          adjustmentTypeId: 3,
          discountUnit: '$',
          startDate: startDate,
          endDate: endDate,
          isApprovalNeeded: false,
          isCustomAmount: false,
          isOnlyDiscount: false,
          isDisabled: false,
          createdAt: startDate,
          updatedAt: startDate
        }
      ],
      { logging: console.log },
      {
        id: {
          autoIncrement: true
        }
      }
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Adjustment', null, {})
  }
}