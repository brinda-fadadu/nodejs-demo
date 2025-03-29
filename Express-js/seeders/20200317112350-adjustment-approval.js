'use strict';
const models = require('../models');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let userRoles = await models.UserRole.findAll({ where: {} })
    userRoles = JSON.parse(JSON.stringify(userRoles))
    const ceoId = userRoles.find(ele => ele.name === 'CEO').id
    const cfoId = userRoles.find(ele => ele.name === 'CFO').id
    const vpOfFuneralHomeId = userRoles.find(ele => ele.name === 'VP_Of_Funeral_Home').id
    const funeralHomeManagerId = userRoles.find(ele => ele.name === 'Funeral_Home_Manager').id
    const saleManagerId = userRoles.find(ele => ele.name === 'Sales_Managers').id
    const vpOfSalesId = userRoles.find(ele => ele.name === 'VP_Of_Sales').id

    let adjustments = await models.Adjustment.findAll({ where: {} })
    adjustments = JSON.parse(JSON.stringify(adjustments))
    const acc_matchingId = adjustments.find(a => a.title === 'Accommodation - Matching').id
    const acc_specialId = adjustments.find(a => a.title === 'Accommodation - Special').id
    const acc_otherId = adjustments.find(a => a.title === 'Accommodation - Other').id
    const acc_courtesyId = adjustments.find(a => a.title === 'Accommodation - Courtesy').id
    const acc_infantId = adjustments.find(a => a.title === 'Accommodation - Infant / Children').id
    const acc_priceMatchId = adjustments.find(a => a.title === 'Accommodation - Price Match').id
    const acc_hardshipId = adjustments.find(a => a.title === 'Accommodation - Hardship').id
    const acc_documentFeeDiscountId = adjustments.find(a => a.title === 'Accommodation - Document Fee Discount').id

    const customerServiceCurrentId = adjustments.find(a => a.title === 'Customer Service Refund - Current Year').id
    const customerServicePriorId = adjustments.find(a => a.title === 'Customer Service Refund - Prior Year').id

    return queryInterface.bulkInsert('AdjustmentApproval', [
      {
        id: 1,
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: adjustments.find(a => a.title === 'Employee Discount').id,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 2,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: 500,
        greaterThanOrEquals: null,
        adjustmentId: acc_matchingId,
        approvalRoleId: funeralHomeManagerId,
        approvalTime: 300000
      },{
        id: 3,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_matchingId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      },{
        id: 4,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_matchingId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 5,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_matchingId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      },{
        id: 6,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_matchingId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 7,
        type: 'cemetery',
        lessThanOrEquals: 500,
        greaterThanOrEquals: null,
        adjustmentId: acc_matchingId,
        approvalRoleId: saleManagerId,
        approvalTime: 300000
      },{
        id: 8,
        type: 'cemetery',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_matchingId,
        approvalRoleId: vpOfSalesId,
        approvalTime: 300000
      },{
        id: 9,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_matchingId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },

      {
        id: 10,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: 500,
        greaterThanOrEquals: null,
        adjustmentId: acc_specialId,
        approvalRoleId: funeralHomeManagerId,
        approvalTime: 300000
      },{
        id: 11,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_specialId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      },{
        id: 12,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_specialId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 13,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_specialId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      },{
        id: 14,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_specialId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 15,
        type: 'cemetery',
        lessThanOrEquals: 500,
        greaterThanOrEquals: null,
        adjustmentId: acc_specialId,
        approvalRoleId: saleManagerId,
        approvalTime: 300000
      },{
        id: 16,
        type: 'cemetery',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_specialId,
        approvalRoleId: vpOfSalesId,
        approvalTime: 300000
      },{
        id: 17,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_specialId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },

      {
        id: 18,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: 500,
        greaterThanOrEquals: null,
        adjustmentId: acc_otherId,
        approvalRoleId: funeralHomeManagerId,
        approvalTime: 300000
      },{
        id: 19,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_otherId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      },{
        id: 20,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_otherId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 21,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_otherId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      },{
        id: 22,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_otherId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 23,
        type: 'cemetery',
        lessThanOrEquals: 500,
        greaterThanOrEquals: null,
        adjustmentId: acc_otherId,
        approvalRoleId: saleManagerId,
        approvalTime: 300000
      },{
        id: 24,
        type: 'cemetery',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_otherId,
        approvalRoleId: vpOfSalesId,
        approvalTime: 300000
      },{
        id: 25,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_otherId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },

      {
        id: 26,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: 500,
        greaterThanOrEquals: null,
        adjustmentId: acc_courtesyId,
        approvalRoleId: funeralHomeManagerId,
        approvalTime: 300000
      },{
        id: 27,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_courtesyId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      },{
        id: 28,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_courtesyId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 29,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_courtesyId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      },{
        id: 30,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_courtesyId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 31,
        type: 'cemetery',
        lessThanOrEquals: 500,
        greaterThanOrEquals: null,
        adjustmentId: acc_courtesyId,
        approvalRoleId: saleManagerId,
        approvalTime: 300000
      },{
        id: 32,
        type: 'cemetery',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_courtesyId,
        approvalRoleId: vpOfSalesId,
        approvalTime: 300000
      },{
        id: 33,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_courtesyId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },

      {
        id: 34,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: 500,
        greaterThanOrEquals: null,
        adjustmentId: acc_infantId,
        approvalRoleId: funeralHomeManagerId,
        approvalTime: 300000
      },{
        id: 35,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_infantId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      },{
        id: 36,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_infantId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 37,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_infantId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      },{
        id: 38,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_infantId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 39,
        type: 'cemetery',
        lessThanOrEquals: 500,
        greaterThanOrEquals: null,
        adjustmentId: acc_infantId,
        approvalRoleId: saleManagerId,
        approvalTime: 300000
      },{
        id: 40,
        type: 'cemetery',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_infantId,
        approvalRoleId: vpOfSalesId,
        approvalTime: 300000
      },{
        id: 41,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_infantId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },

      {
        id: 42,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: 500,
        greaterThanOrEquals: null,
        adjustmentId: acc_priceMatchId,
        approvalRoleId: funeralHomeManagerId,
        approvalTime: 300000
      },{
        id: 43,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_priceMatchId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      },{
        id: 44,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_priceMatchId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 45,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_priceMatchId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      },{
        id: 46,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_priceMatchId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 47,
        type: 'cemetery',
        lessThanOrEquals: 500,
        greaterThanOrEquals: null,
        adjustmentId: acc_priceMatchId,
        approvalRoleId: saleManagerId,
        approvalTime: 300000
      },{
        id: 48,
        type: 'cemetery',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_priceMatchId,
        approvalRoleId: vpOfSalesId,
        approvalTime: 300000
      },{
        id: 49,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_priceMatchId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },

      {
        id: 50,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: 500,
        greaterThanOrEquals: null,
        adjustmentId: acc_hardshipId,
        approvalRoleId: funeralHomeManagerId,
        approvalTime: 300000
      },{
        id: 51,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_hardshipId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      },{
        id: 52,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_hardshipId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 53,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_hardshipId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      },{
        id: 54,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_hardshipId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 55,
        type: 'cemetery',
        lessThanOrEquals: 500,
        greaterThanOrEquals: null,
        adjustmentId: acc_hardshipId,
        approvalRoleId: saleManagerId,
        approvalTime: 300000
      },{
        id: 56,
        type: 'cemetery',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_hardshipId,
        approvalRoleId: vpOfSalesId,
        approvalTime: 300000
      },{
        id: 57,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_hardshipId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },

      {
        id: 58,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: 500,
        greaterThanOrEquals: null,
        adjustmentId: acc_documentFeeDiscountId,
        approvalRoleId: funeralHomeManagerId,
        approvalTime: 300000
      },{
        id: 59,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_documentFeeDiscountId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      },{
        id: 60,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_documentFeeDiscountId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 61,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_documentFeeDiscountId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      },{
        id: 62,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_documentFeeDiscountId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },{
        id: 63,
        type: 'cemetery',
        lessThanOrEquals: 500,
        greaterThanOrEquals: null,
        adjustmentId: acc_documentFeeDiscountId,
        approvalRoleId: saleManagerId,
        approvalTime: 300000
      },{
        id: 64,
        type: 'cemetery',
        lessThanOrEquals: 1000,
        greaterThanOrEquals: null,
        adjustmentId: acc_documentFeeDiscountId,
        approvalRoleId: vpOfSalesId,
        approvalTime: 300000
      },{
        id: 65,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_documentFeeDiscountId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },

      {
        id: 66,
        type: 'funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: customerServiceCurrentId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      }, {
        id: 67,
        type: 'funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: customerServiceCurrentId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      }, {
        id: 68,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: customerServiceCurrentId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },

      {
        id: 69,
        type: 'funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: customerServicePriorId,
        approvalRoleId: vpOfFuneralHomeId,
        approvalTime: 300000
      }, {
        id: 70,
        type: 'funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: customerServicePriorId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      }, {
        id: 71,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: customerServicePriorId,
        approvalRoleId: ceoId,
        approvalTime: 300000
      },
      {
        id: 72,
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: adjustments.find(a => a.title === 'Employee Discount').id,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 73,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_matchingId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 74,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_matchingId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 75,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_matchingId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 76,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_specialId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 77,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_specialId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 78,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_specialId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 79,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_otherId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 80,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_otherId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 81,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_otherId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 82,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_courtesyId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 83,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_courtesyId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 84,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_courtesyId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 85,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_infantId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 86,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_infantId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 87,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_infantId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 88,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_priceMatchId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 89,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_priceMatchId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 90,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_priceMatchId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 91,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_hardshipId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 92,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_hardshipId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 93,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_hardshipId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 94,
        type: 'funeral',
        subType: 'an-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_documentFeeDiscountId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 95,
        type: 'funeral',
        subType: 'pn-funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_documentFeeDiscountId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 96,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: acc_documentFeeDiscountId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 97,
        type: 'funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: customerServiceCurrentId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 98,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: customerServiceCurrentId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 99,
        type: 'funeral',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: customerServicePriorId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      },
      {
        id: 100,
        type: 'cemetery',
        lessThanOrEquals: null,
        greaterThanOrEquals: null,
        adjustmentId: customerServicePriorId,
        approvalRoleId: cfoId,
        approvalTime: 300000
      }
    ], { logging: console.log, timestamp: false }, {
      id: {
        autoIncrement: true
      },
      timestamps: false
    })
  },

  down: (queryInterface, Sequelize) => {
      return queryInterface.bulkDelete('AdjustmentApproval', null, {});

  }
};
