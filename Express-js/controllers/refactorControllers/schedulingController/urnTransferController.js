const logger = require('../../../lib/logger')
const _ = require('lodash')
const { upsert } = require('../utils')
const models = require('../../../models')
const { seed } = require('../../../config/seed')
const { getKey } = require('../../../lib/util')
const moment = require('moment')
class UrnTransferController {
    /**
     * This method checks if there is an entry in the UrnTransfer table with the received filters.
     * @param {*} filters
     * @param {*} transaction
     */
    async urnTransferDetailsDataCheck (filters, transaction) {
        try {
            let urnTransferDetails = await models.UrnTransfer.findOne(
                {
                    where: filters,
                    transaction
                }
            )
            return urnTransferDetails
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method takes care of the creation, updation and deletion of the urnTransferData from the schedule service module.
     * @param {*} data
     * @param {string} type
     * @param {*} transaction
     */
    async upsertUrnTransferDetails (data, type, transaction) {
        try {
            let result = null
            let tableId = null
            let tableName = null
            let addendumId = null
            let agreementId = null
            let serviceDate = _.get(data, 'schedulingDetails.beginningTime', null) || _.get(data, 'intermentInformationDetails.beginningTime', null) || _.get(data, 'disintermentInformationDetails.beginningTime', null)
            let addendumNumber = null
            let contractNumber = null
            let scheduleServiceId = _.get(data, 'id', null)
            let isTransferRequired = _.get(data, 'urnInformationDetails.isTransferRequired')
            let urnTransferDetails = null
            let conditionalJoinQuery = ''

            // Fetching the table and it's id to fetch the agreement and addendum info.
            if (data.agreementCashAdvancedItemId) {
                tableName = 'AgreementCashAdvancedItem'
                tableId = data.agreementCashAdvancedItemId
                conditionalJoinQuery = `
                INNER JOIN Agreement ON Agreement.id = ${tableName}.agreementId
                LEFT JOIN Addendum ON Addendum.id = ${tableName}.addendumId`
            } else if (data.agreementLocationItemId) {
                tableName = 'AgreementLocationItem'
                tableId = data.agreementLocationItemId
                conditionalJoinQuery = `
                INNER JOIN Agreement ON Agreement.id = ${tableName}.agreementId
                LEFT JOIN Addendum ON Addendum.id = ${tableName}.addendumId`
            } else if (data.agreementPackageItemId) {
                tableName = 'AgreementPackageItem'
                tableId = data.agreementPackageItemId
                conditionalJoinQuery = `
                INNER JOIN AgreementPackage ON AgreementPackage.id = ${tableName}.agreementPackageId
                INNER JOIN Agreement ON Agreement.id = AgreementPackage.agreementId
                LEFT JOIN Addendum ON Addendum.id = AgreementPackage.addendumId`
            } else if (data.itemUsageId) {
                tableName = 'ItemUsage'
                tableId = data.itemUsageId
                conditionalJoinQuery = `
                INNER JOIN AgreementLocationItem ON AgreementLocationItem.id = ${tableName}.resourceId and ${tableName}.resourceType='AgreementLocationItem'
                INNER JOIN Agreement ON Agreement.id = AgreementLocationItem.agreementId
                LEFT JOIN Addendum ON Addendum.id = AgreementLocationItem.addendumId`
            }

            // Fetching the agreementId, contractNumber, addednumId and addendumNumber
            if (tableName && tableId) {
                let contractDetailsQuery = `
                SELECT
                Agreement.id AS agreementId,
                Agreement.contractNumber,
                Addendum.id AS addendumId,
                Addendum.addendumNumber
                FROM ${tableName}
                ${conditionalJoinQuery}
                WHERE ${tableName}.id = ${tableId}
                `

                let contractDetails = await models.sequelize.query(contractDetailsQuery, {
                    type: models.sequelize.QueryTypes.SELECT,
                    transaction
                })

                addendumId = _.get(contractDetails, '[0].addendumId', null)
                agreementId = _.get(contractDetails, '[0].agreementId', null)
                contractNumber = _.get(contractDetails, '[0].contractNumber', null)
                addendumNumber = _.get(contractDetails, '[0].addendumNumber', null)
            }

            // Checking if there is any existing open urn transfer entry for the received service.
            let filters = {
                resourceType: type,
                resourceId: scheduleServiceId,
                // status: Number(getKey(seed.UrnTransferStatus, 'Open')),
                deletedAt: null,
                deletedBy: null
            }

            urnTransferDetails = await this.urnTransferDetailsDataCheck(filters, transaction)

            // Setting the payload for creation of UrnTransfer entry.
            let payload = {
                agreementId,
                addendumId,
                status: Number(getKey(seed.UrnTransferStatus, 'Open')),
                resourceType: type,
                resourceId: scheduleServiceId,
                contractNumber,
                addendumNumber,
                serviceDate: serviceDate
            }

            if (isTransferRequired === true) {
                // Doing no changes to the payload, if it's the first time the isTransfer is checked.
                if (urnTransferDetails && urnTransferDetails.status === Number(getKey(seed.UrnTransferStatus, 'Open'))) {
                    // Updating the existing urnTransferDetails, if an entry already exists for the service and is in open state.
                    payload.id = urnTransferDetails.id
                } else if (urnTransferDetails && urnTransferDetails.status === Number(getKey(seed.UrnTransferStatus, 'Completed'))) {
                    // Nothing if the urnTransfer data is in completed state.
                    payload = null
                }
            } else if (isTransferRequired === false) {
                if (!urnTransferDetails) {
                    // Nothing if the isTransfer button is unchecked and there is no data in the urnTransfer table.
                    payload = null
                } else if (urnTransferDetails && urnTransferDetails.status === Number(getKey(seed.UrnTransferStatus, 'Open'))) {
                    // Deleting the urnTransfer record if it's in open state.
                    payload.id = urnTransferDetails.id
                    payload.deletedAt = moment().format('MM/DD/YYYY HH:mm:ss')
                    payload.deletedBy = data.userId
                } else if (urnTransferDetails && urnTransferDetails.status === Number(getKey(seed.UrnTransferStatus, 'Completed'))) {
                    // Nothing if the isTransfer button is unchecked and the status is completed
                    payload = null
                }
            }

            if (payload) {
                result = await upsert('UrnTransfer', payload, transaction, { userId: data.userId })
            }
            return result
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
   * This function gets all the urn transfer records based on filters.
   * @param {string} status EX: Open, Completed
   * @param {object} filters
   * @param {integer} filters.limit default= 10
   * @param {integer} filters.page default = 1
   * @param {string} filters.timezone
   */
    async getUrnTransfer (status = 'Open', filters = {}) {
        let transaction = await models.sequelize.transaction()
        try {
            let { page = 1, limit = 10, timezone } = filters

            let offset = (page - 1) * limit

            let statusId = Number(getKey(seed.UrnTransferStatus, status))

            let urnTransferPrimaryQuery = `
            SELECT *
            FROM UrnTransfer
            WHERE status = ${statusId}
            AND deletedAt IS NULL
            AND deletedBy IS NULL
            ORDER BY id DESC
            OFFSET ${offset} ROWS FETCH  NEXT ${limit} ROWS ONLY`

            const urnTransferPrimaryDetails = await models.sequelize.query(urnTransferPrimaryQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })

            console.log('urnTransferPrimaryDetails', urnTransferPrimaryDetails)

            let cemeteryUrnTransferIds = []
            let funeralUrnTransferIds = []
            let cemeteryUrnIds = []
            let funeralUrnIds = []
            let urnTransfers = []

            for (let item of urnTransferPrimaryDetails) {
                if (item.resourceId && item.resourceType && item.resourceType === 'ScheduledCemeteryService') {
                    cemeteryUrnTransferIds.push(item.resourceId)
                    cemeteryUrnIds.push(item.id)
                } else {
                    funeralUrnTransferIds.push(item.resourceId)
                    funeralUrnIds.push(item.id)
                }
            }

            let scheduleServiceAttribute = await models.Attribute.findOne({ where: { name: 'Scheduling Service' } })
            const scheduleServiceAttributeId = _.get(scheduleServiceAttribute, 'id')

            let urnTransferDetailsQueries = []
            let urnTransferDetails = []

            // Fetching the funeral urn transfer details
            if (funeralUrnTransferIds.length) {
                let funeralUrnTransferQuery = `
                SELECT
                DISTINCT
                UrnTransfer.id AS urnTransferId,
                UrnTransfer.updatedAt AS transferCompletedOn,
                [User].[name] AS transferCompletedBy,
                Person.firstName,
                Person.lastName,
                Person.middleName,
                PersonVerificationDetails.onePortalId,
                UrnTransfer.contractNumber,
                UrnTransfer.addendumNumber,
                UrnTransfer.serviceDate AS beginningTime,
                CASE 
                    WHEN [Location].[name] IS NULL THEN Organization.name 
                    ELSE [Location].[name] 
                END AS facilityName,
                AttributeValue.name AS serviceName,
                CASE
                    WHEN UrnInformationSection.isFamilyOwnedUrn = 1 THEN 'Family Owned Urn'
                    ELSE urnName.name
                END AS urnName
                FROM UrnTransfer
                INNER JOIN ScheduledFuneralService ON ScheduledFuneralService.id = UrnTransfer.resourceId AND UrnTransfer.resourceType = 'ScheduledFuneralService' AND UrnTransfer.id IN (:funeralUrnIds)
                INNER JOIN Person ON Person.id = ScheduledFuneralService.personId
                INNER JOIN PersonVerificationDetails ON PersonVerificationDetails.personId = Person.id
                INNER JOIN SchedulingSection ON SchedulingSection.id = ScheduledFuneralService.schedulingSectionId
                LEFT JOIN CemeteryInformationSection ON CemeteryInformationSection.id= ScheduledFuneralService.cemeteryInformationSectionId
                LEFT JOIN Location ON Location.id in  (SchedulingSection.clFacilityLocationId, CemeteryInformationSection.clCemeteryLocationId)
                LEFT JOIN Place on Place.id in  (SchedulingSection.serviceLocationId, CemeteryInformationSection.cemeteryLocationId)
                LEFT JOIN Organization on Organization.id= Place.organizationId
                LEFT JOIN AgreementLocationItem ON AgreementLocationItem.id = ScheduledFuneralService.agreementLocationItemId
                LEFT JOIN AgreementPackageItem ON AgreementPackageItem.id = ScheduledFuneralService.agreementPackageItemId
                LEFT JOIN AgreementCashAdvancedItem ON AgreementCashAdvancedItem.id = ScheduledFuneralService.agreementCashAdvancedItemId
                LEFT JOIN AgreementPackage ON AgreementPackage.id = AgreementPackageItem.agreementPackageId
                LEFT JOIN [User] ON [User].id = UrnTransfer.updatedBy
                INNER JOIN LocationItem ON LocationItem.id IN (AgreementLocationItem.locationItemId, AgreementPackageItem.locationItemId, AgreementCashAdvancedItem.locationItemId)
                INNER JOIN Item ON Item.id = LocationItem.itemId
                INNER JOIN ItemAttributeValue ON ItemAttributeValue.itemId = Item.id
                INNER JOIN AttributeValue ON AttributeValue.id = ItemAttributeValue.attributeValueId AND AttributeValue.attributeId = ${scheduleServiceAttributeId}
                INNER JOIN UrnInformationSection ON UrnInformationSection.id = ScheduledFuneralService.urnInformationSectionId
                LEFT JOIN AgreementLocationItem AS urnAgreementLocationItem ON urnAgreementLocationItem.id = UrnInformationSection.urnId AND UrnInformationSection.resourceType = 'AgreementLocationItem'
                LEFT JOIN ItemUsage AS urnItemUsage ON urnItemUsage.id = UrnInformationSection.urnId AND UrnInformationSection.resourceType = 'ItemUsage'
                LEFT JOIN AgreementLocationItem AS urnItemUsageAgreementLocationItem ON urnItemUsageAgreementLocationItem.id = urnItemUsage.resourceId AND urnItemUsage.resourceType = 'AgreementLocationItem'
                LEFT JOIN LocationItem AS urnLocationItem ON urnLocationItem.id IN (urnAgreementLocationItem.locationItemId, urnItemUsageAgreementLocationItem.locationItemId)
                LEFT JOIN Item AS urnName ON urnName.id = urnLocationItem.itemId
                WHERE ScheduledFuneralService.id IN (:funeralUrnTransferIds)`

                urnTransferDetailsQueries.push(funeralUrnTransferQuery)
            }

            // Fetching the cemetery services urn transfer details
            if (cemeteryUrnTransferIds.length) {
                let cemeteryUrnTransferQuery = `
                SELECT
                DISTINCT
                UrnTransfer.id AS urnTransferId,
                UrnTransfer.updatedAt AS transferCompletedOn,
                [User].[name] AS transferCompletedBy,
                Person.firstName,
                Person.lastName,
                Person.middleName,
                PersonVerificationDetails.onePortalId,
                UrnTransfer.contractNumber,
                UrnTransfer.addendumNumber,
                UrnTransfer.serviceDate AS beginningTime,
                NULL AS facilityName,
                AttributeValue.name AS serviceName,
                CASE
                    WHEN UrnInformationSection.isFamilyOwnedUrn = 1 THEN 'Family Owned Urn'
                    ELSE urnName.name
                END AS urnName
                FROM UrnTransfer
                INNER JOIN ScheduledCemeteryService ON ScheduledCemeteryService.id = UrnTransfer.resourceId AND UrnTransfer.resourceType = 'ScheduledCemeteryService' AND UrnTransfer.id IN (:cemeteryUrnIds)
                INNER JOIN Person ON Person.id = ScheduledCemeteryService.personId
                INNER JOIN PersonVerificationDetails ON PersonVerificationDetails.personId = Person.id
                INNER JOIN ItemUsage ON ItemUsage.id = ScheduledCemeteryService.itemUsageId
                INNER JOIN AgreementLocationItem ON AgreementLocationItem.id = ItemUsage.resourceId and ItemUsage.resourceType='AgreementLocationItem'
                INNER JOIN LocationItem ON LocationItem.id = AgreementLocationItem.locationItemId
                INNER JOIN Item ON Item.id = LocationItem.itemId
                INNER JOIN ItemAttributeValue ON ItemAttributeValue.itemId = Item.id
                INNER JOIN AttributeValue ON AttributeValue.id = ItemAttributeValue.attributeValueId AND AttributeValue.attributeId = ${scheduleServiceAttributeId}
                LEFT JOIN [User] ON [User].id = UrnTransfer.updatedBy
                LEFT JOIN IntermentInformationSection ON ScheduledCemeteryService.intermentInformationSectionId = IntermentInformationSection.id
                LEFT JOIN DisintermentInfoSection ON ScheduledCemeteryService.disintermentInfoSectionId = DisintermentInfoSection.id
                INNER JOIN UrnInformationSection ON UrnInformationSection.id = ScheduledCemeteryService.urnInformationSectionId
                LEFT JOIN AgreementLocationItem AS urnAgreementLocationItem ON urnAgreementLocationItem.id = UrnInformationSection.urnId AND UrnInformationSection.resourceType = 'AgreementLocationItem'
                LEFT JOIN ItemUsage AS urnItemUsage ON urnItemUsage.id = UrnInformationSection.urnId AND UrnInformationSection.resourceType = 'ItemUsage'
                LEFT JOIN AgreementLocationItem AS urnItemUsageAgreementLocationItem ON urnItemUsageAgreementLocationItem.id = urnItemUsage.resourceId AND urnItemUsage.resourceType = 'AgreementLocationItem'
                LEFT JOIN LocationItem AS urnLocationItem ON urnLocationItem.id IN (urnAgreementLocationItem.locationItemId, urnItemUsageAgreementLocationItem.locationItemId)
                LEFT JOIN Item AS urnName ON urnName.id = urnLocationItem.itemId
                WHERE ScheduledCemeteryService.id IN (:cemeteryUrnTransferIds)`

                urnTransferDetailsQueries.push(cemeteryUrnTransferQuery)
            }

            // Combining both the details
            if (urnTransferDetailsQueries.length) {
                let urnTransferDetailMainQuery = urnTransferDetailsQueries.join(' UNION ')
                urnTransferDetails = await models.sequelize.query(urnTransferDetailMainQuery, {
                    type: models.sequelize.QueryTypes.SELECT,
                    replacements: {
                        cemeteryUrnTransferIds,
                        funeralUrnTransferIds,
                        cemeteryUrnIds,
                        funeralUrnIds
                    },
                    transaction
                })
            }

            console.log(urnTransferDetails)

            // Adjusting the beginning time based on the received timezone.
            urnTransferDetails = urnTransferDetails.map((item) => {
                if (item.beginningTime) {
                    return {
                        ...item,
                        beginningTime: moment(item.beginningTime).tz(timezone).format('LLLL')
                    }
                } else {
                    return item
                }
            })

            // Adjusting the completedOn time based on the received timezone
            urnTransferDetails = urnTransferDetails.map((item) => {
                if (item.transferCompletedOn) {
                    return {
                        ...item,
                        transferCompletedOn: moment(item.transferCompletedOn).tz(timezone).format('Do MMMM, YYYY')
                    }
                } else {
                    return item
                }
            })

            // Sorting on the basis of desc beginning time
            urnTransfers = urnTransferDetails.sort((a, b) => new Date(b.beginningTime).getTime() - new Date(a.beginningTime).getTime())

            let countQuery = `
            SELECT COUNT(UrnTransfer.id) AS total, UrnTransfer.status
            FROM UrnTransfer
            WHERE deletedAt IS NULL
            AND deletedBy IS NULL
            GROUP BY UrnTransfer.status`

            let count = await models.sequelize.query(countQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })

            let openCount = count.filter((itemCount) => itemCount.status === Number(getKey(seed.UrnTransferStatus, 'Open')))
            let completedCount = count.filter((itemCount) => itemCount.status === Number(getKey(seed.UrnTransferStatus, 'Completed')))

            await transaction.commit()
            return {
                openCount: _.get(openCount, '[0].total', 0),
                completedCount: _.get(completedCount, '[0].total', 0),
                urnTransfers
            }
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * This method updates the status of an urnTransfer records from open to completed, if there are any records with open status.
     * @param {integer} urnTransferId
     * @param {integer} userId
     */
    async updateUrnTransferStatusToCompleted (urnTransferId, userId) {
        let transaction = await models.sequelize.transaction()
        try {
            // Checking if there is any existing open urn transfer entry for the received urnTransferId.
            let filters = {
                id: urnTransferId,
                status: Number(getKey(seed.UrnTransferStatus, 'Open')),
                deletedAt: null,
                deletedBy: null
            }
            let urnTransferDetails = await this.urnTransferDetailsDataCheck(filters, transaction)
            if (urnTransferDetails) {
                // Updating the status of the urnTransfer to completed, if there is a valid data in the urnTransfer table.
                await models.UrnTransfer.update({
                    status: Number(getKey(seed.UrnTransferStatus, 'Completed')),
                    updatedBy: userId
                }, {
                    where: {
                        id: urnTransferId
                    },
                    transaction
                })
            } else {
                // Throwing an error, when there is no valid data for the received urnTransferId.
                throw new Error('URN_TRANSFER_RECORD_NOT_FOUND')
            }
            await transaction.commit()
            return true
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * This method deletes the urnTransferDetails.
     * @param {integer} resourceId
     * @param {string} resourceType
     * @param {integer} userId
     * @param {*} transaction
     */
    async deleteUrnTransfer (resourceId, resourceType, userId, transaction) {
        try {
            // Checking if there is any existing open urn transfer entry for the received urnTransferId.
            let filters = {
                resourceId,
                resourceType,
                status: Number(getKey(seed.UrnTransferStatus, 'Open')),
                deletedAt: null,
                deletedBy: null
            }
            let urnTransferDetails = await this.urnTransferDetailsDataCheck(filters, transaction)
            if (urnTransferDetails) {
                // Deleting the urnTransfer detail, if there is any valid entry
                await models.UrnTransfer.update({
                    deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                    deletedBy: userId
                }, {
                    where: {
                        id: urnTransferDetails.id
                    },
                    transaction
                })
            }
            return true
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
}
module.exports = exports = UrnTransferController
