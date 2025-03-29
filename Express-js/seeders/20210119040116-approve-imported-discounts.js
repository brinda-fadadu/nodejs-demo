'use strict'
const models = require('../models')
const moment = require('moment')
module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
     */
    let adjustmentRecordsQuery = `SELECT AA.* FROM AgreementAdjustment AA
              INNER JOIN Adjustment A
                  ON AA.adjustmentId = A.id
              WHERE A.isApprovalNeeded = 1`
    const adjustmentRecords = await models.sequelize.query(adjustmentRecordsQuery, {
      type: models.sequelize.QueryTypes.SELECT
    })

    const userDetails = await models.sequelize.query(
      `select * from [User] where name like '%Data Sync%'`,
      { type: models.sequelize.QueryTypes.SELECT }
    )

    let approvalData = []

    await Promise.all(
      adjustmentRecords.map(async adj => {
        let approvalRecord = await models.sequelize.query(
          `select * from Approval where resourceType='AgreementAdjustment' AND resourceId=${adj.id}`,
          { type: models.sequelize.QueryTypes.SELECT }
        )

        if (approvalRecord && !approvalRecord.length) {
          let payload = {
            resourceType: 'AgreementAdjustment',
            resourceId: adj.id,
            status: 2, // 2- Approved statusId from approvals controller
            approvedOrRejectedBy: userDetails[0].id,
            approvedOrRejectedAt: moment().format('YYYY-MM-DD HH:mm:ss'),
            requestedBy: userDetails[0].id,
            actionNotes: '-',
            requestInformation: null,
            createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
            updatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
          }
          approvalData.push(payload)
        }
      })
    )

    return queryInterface.bulkInsert('Approval', approvalData, {}, {
        id: {
          autoIncrement: true
        }
      }
    )
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
}
