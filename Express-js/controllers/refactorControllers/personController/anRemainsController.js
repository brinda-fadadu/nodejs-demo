const models = require('../../../models/index')
const { upsert, getContactRoles, convertToJson, commonDownloadFileWithSignature } = require('../utils')
const _ = require('lodash')
const moment = require('moment')
const AddressController = require('../addressController/addressController')
const ResourceDocumentsController = require('../resourceDocuments/resourceDocumentsController')
const logger = require('../../../lib/logger')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const { getKey } = require('../../../lib/util')
const { seed } = require('../../../config/seed')
class ANRemainsController {
    constructor (id) {
        this.personId = id
    }

    /**
     * @typedef {Object} Organization
     * @property {string} name
     * @property {number} organizationTypeId
     * @property {number} id
     * @property {string} phoneNumber
     */

    /**
      * @typedef {Object} Address
      * @property {string} line1
      * @property {string} line2
      * @property {string} country
      * @property {string} line1
      * @property {string} city
      * @property {string} state
      * @property {string} county
      * @property {string} zipcode
      */

    /**
     * @typedef {Object} Place
     * @property {Organization} - is the organization details of the place. it exists only if the place is an organization
     * @property {Address} - is the address details object
     */

    async _loadPerson (transaction) {
        const person = await models.Person.findOne({
            where: {
                id: this.personId,
                isVerified: true,
                isAlive: false
            },
            transaction
        })
        if (!person) {
            throw new Error('PERSON_NOT_FOUND')
        }
        this.person = person
    }

    async getANRemainsInfo (transaction) {
        if (!this.person) { await this._loadPerson(transaction) }
        const personRemainsInfo = await models.PersonRemainsInfo.findOne({
            where: {
                personId: this.personId
            },
            include: [
                {
                    model: models.PersonRemainsApproval,
                    as: 'personRemainsApproval',
                    include: [
                        {
                            model: models.PersonContact,
                            as: 'approvedContacts',
                            include: [
                                {
                                    model: models.Person,
                                    as: 'person'
                                }
                            ],
                            required: false
                        }
                    ]
                },
                {
                    model: models.Employee,
                    as: 'embalmer'
                }
            ],
            transaction
        })
        let embalmer
        if (personRemainsInfo) {
            const embalmingApprovedBy = personRemainsInfo.personRemainsApproval.filter(approval => {
                return approval.type === 'embalming'
            })
            const cremationApprovedBy = personRemainsInfo.personRemainsApproval.filter(approval => {
                return approval.type === 'cremation'
            })
            if (personRemainsInfo.isEmbalmingNotAssigned) {
                embalmer = { name: 'Not Assigned' }
            }
            const response = {
                ...personRemainsInfo.toJSON(),
                embalmingApprovedBy,
                cremationApprovedBy

            }
            if (embalmer) {
                response.embalmer = embalmer
            }
            delete response.personRemainsApproval
            return response
        }
        return personRemainsInfo
    }

    /**
     * function to create/edit the remains info of a person
     * @param {Object} reqBody
     * @param {Number} reqBody.embalmerId - id of the employee who does the embalming for the remains
     * @param {Boolean} reqBody.isEmbalmingSelfApproved - boolean to define if the embalming is approved by the person(self)
     * @param {Boolean} reqBody.isCremationSelfApproved - boolean to define if the cremation is approved by the person(self)
     * @param {Number} reqBody.embalmingApprovedBy - it is the id of the contact who has approved the emablming
     * @param {Array} reqBody.cremationApprovedBy - it is array of id's of the contacts who has approved cremation.
     * @param {Boolean} reqBody.isEmbalmingApproved - boolean to define if the emablming is approved
     * @param {Boolean} reqBody.isCremationApproved - boolean to define if the cremation is approved
     */
    async createOrEditANRemainsInfo (reqBody) {
        let transaction
        try {
            const userId = reqBody.userId
            reqBody.personId = this.personId
            transaction = await models.sequelize.transaction()

            if (!this.person) { await this._loadPerson(transaction) }

            const personRemains = await upsert('PersonRemainsInfo', reqBody, transaction, { userId })

            if (reqBody.id) {
                await models.PersonRemainsApproval.destroy({
                    where: {
                        personRemainsId: personRemains.id
                    }
                })
            }

            let personRemainsApproval = []
            if (reqBody.isEmbalmingApproved) {
                if (!reqBody.isEmbalmingSelfApproved) {
                    await this.validateRemainsApprovedBy([reqBody.embalmingApprovedBy], transaction)

                    personRemainsApproval.push({
                        personRemainsId: personRemains.id,
                        type: 'embalming',
                        contactId: reqBody.embalmingApprovedBy
                    })
                }
            }
            if (reqBody.isCremationApproved) {
                if (!reqBody.isCremationSelfApproved) {
                    await this.validateRemainsApprovedBy(reqBody.cremationApprovedBy, transaction)

                    reqBody.cremationApprovedBy.map(e => {
                        personRemainsApproval.push({
                            personRemainsId: personRemains.id,
                            type: 'cremation',
                            contactId: e
                        })
                    })
                }
            }
            await models.PersonRemainsApproval.bulkCreate(personRemainsApproval, {
                transaction
            })
            await transaction.commit()
            return this.getANRemainsInfo()
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * function to validate the contacts who has approved the embalming/cremation
     * @param {Array<{Number}>} approvedBy - array of id's of the contacts who wants to approve embalming/cremation
     * @param {*} transaction
     */
    async validateRemainsApprovedBy (approvedBy, transaction) {
        const roles = await getContactRoles([1], ['Funeral Authorizer', 'Next of Kin', 'Power of Attorney'], 'array', transaction)
        const VerifiedPersonController = require('../personController/verifiedPersonController')
        const verifiedPersonController = new VerifiedPersonController(this.personId)
        const contacts = await verifiedPersonController.getListOfContacts({ contactRoles: roles }, transaction)
        const contactIds = contacts.map(contact => contact.id)
        if (_.difference(approvedBy, contactIds).length > 0) {
            throw new Error('INVALID_APPROVED_BY_CONTACTS')
        }
        return true
    }

    /**
     * add transfer for a person(decedent)
     * @param {Object} reqBody
     * @param {Number} reqBody.transferType - type of the transfer
     * @param {Date} reqBody.neededByDate - transfer needed by date
     * @param {Date} reqBody.transferDateTime - transfer date and time
     * @param {Boolean} reqBody.isTransferReady - boolean to know if the transfer is ready
     * @param {Boolean} reqBody.isTransferComplete - boolean to know if the transfer is complete
     * @param {Number} reqBody.primaryDriverId - id of the employee who is a primary driver for the tarnsfer
     * @param {Number} reqBody.secondaryDriverId - id of the employee who is a secondary driver for the tarnsfer
     * @param {Place} reqBody.transferFromPlace - transfer from place details
     * @param {Place} reqBody.transferToPlace - transfer to place details
    * @param {Number} reqBody.transferFromLocationId - location id from where the transfer is started
     * @param {Number} reqBody.transferToLocationId- location id to where the transfer is taken to
     * @param {Number} reqBody.userId - id of the currently logged in user
     */
    async createOrEditTransfer (reqBody) {
        let transaction, addressPlace
        try {
            const userId = reqBody.userId
            reqBody.personId = this.personId
            transaction = await models.sequelize.transaction()
            if (!this.person) {
                await this._loadPerson(transaction)
            }
            if (!_.isEmpty(reqBody.transferFromPlace)) {
                addressPlace = await AddressController.managePlace(reqBody.transferFromPlace, transaction)
                reqBody.transferFromPlaceId = _.get(addressPlace, 'id')
                reqBody.transferFromLocationId = null
            } else {
                reqBody.transferFromPlaceId = null
            }
            if (!_.isEmpty(reqBody.transferToPlace)) {
                addressPlace = await AddressController.managePlace(reqBody.transferToPlace, transaction)
                reqBody.transferToPlaceId = _.get(addressPlace, 'id')
                reqBody.transferToLocationId = null
            } else {
                reqBody.transferToPlaceId = null
            }
            if ((reqBody.transferFromLocationId && reqBody.transferToLocationId) && reqBody.transferFromLocationId === reqBody.transferToLocationId) {
                throw new Error('TRANSFER_FROM_AND_TRANSFER_TO_CAN_NOT_BE_SAME')
            }
            if ((reqBody.transferFromPlaceId && reqBody.transferToPlaceId) && reqBody.transferFromPlaceId === reqBody.transferToPlaceId) {
                throw new Error('TRANSFER_FROM_AND_TRANSFER_TO_CAN_NOT_BE_SAME')
            }
            if (reqBody.primaryDriverId && reqBody.secondaryDriverId && (reqBody.primaryDriverId === reqBody.secondaryDriverId)) {
                throw new Error('DRIVERS_CAN_NOT_BE_SAME')
            }
            logger.info(`${reqBody.transferType} -  ${reqBody.personId} - ${reqBody.transferToLocationId} Checking genrate Body Tracking No`)
            logger.info(reqBody)
            logger.info(`${(reqBody.transferType === 1 || reqBody.transferType === 5 || reqBody.transferType === 6) && reqBody.transferToLocationId != null} validate genrate Body Tracking No`)
            if ((reqBody.transferType === 1 || reqBody.transferType === 5 || reqBody.transferType === 6) && reqBody.transferToLocationId != null) {
                logger.info(`${reqBody.transferType} -  ${reqBody.personId} - ${reqBody.transferToLocationId}  IN genrate Body Tracking No`)
                const info = await models.PersonRemainsInfo.findOne({ where: { personId: reqBody.personId } })
                logger.info(`${info} - Exising genrate Body Tracking No`)
                if (!info || _.get(info, 'bodyTransferTrackingNumber', null) === null) {
                    logger.info(`${reqBody.transferType} -  ${reqBody.personId}  Body Tracking No Started Generate `)
                    const payload = {
                        id: _.get(info, 'id'),
                        personId: reqBody.personId,
                        bodyTransferTrackingNumber: await this.constructor._createBodyTrackingNumber(reqBody.transferToLocationId, transaction)
                    }
                    logger.info(payload)
                    await upsert('PersonRemainsInfo', payload, transaction, { userId })
                    logger.info(`${reqBody.transferType} -  ${reqBody.personId}  Body Tracking No Generated `)
                }
                logger.info(`${reqBody.transferType} -  ${reqBody.personId} - ${reqBody.transferToLocationId}  Out genrate Body Tracking No`)
            }
            logger.info(`${reqBody.transferType} -  ${reqBody.personId} - ${reqBody.transferToLocationId}  Close genrate Body Tracking No`)
            const transfer = await upsert('PersonRemainsTransfer', reqBody, transaction, { userId })
            if (_.get(reqBody, 'documents')) {
                await ResourceDocumentsController.createOrEditDocuments(transfer.id, 'Transfer', _.get(reqBody, 'documents', []), transaction)
            }
            await transaction.commit()
            return transfer
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * Genrate Body Tracking number (decedent)
     */
    async generateBodyTracking (userId) {
        //  seedData.TransferType
        let transaction, personInfo
        try {
            transaction = await models.sequelize.transaction()
            const whereObj = {
                personId: this.personId,
                transferType: {
                    [Op.in]: [getKey(seed.TransferType, 'Transfer In'), getKey(seed.TransferType, 'Ship In'), getKey(seed.TransferType, 'Other In')]
                },
                transferToLocationId: {
                    [Op.ne]: null
                },
                deletedAt: null
            }
            const info = await models.PersonRemainsInfo.findOne({ where: { personId: this.personId } })
            const transfer = await models.PersonRemainsTransfer.findOne({ where: whereObj, order: [['createdAt', 'ASC']] })
            if (!transfer || !_.get(transfer, 'id', false) || !_.get(transfer, 'transferToLocationId', false)) {
                throw new Error('TRANSFER_NOT_AVAILABLE')
            }
            if (info && (_.get(info, 'bodyTransferTrackingNumber', false) || _.get(info, 'bodyTransferTrackingNumber', null) != null)) {
                throw new Error('ALREADY_BODY_TRACKING_GENERATED')
            }
            // Generating the body tracking number for shipIn , transferIn and OtherIn transfer types
            logger.info(`${transfer.transferType} -  ${this.personId} IN Manual genrate Body Tracking No`)
            logger.info(`${info} - Exising Manual genrate Body Tracking No`)
            if (!info || _.get(info, 'bodyTransferTrackingNumber', null) === null || _.get(info, 'bodyTransferTrackingNumber') === '') {
                logger.info(`${transfer.transferType} -  ${this.personId} Manual Body Tracking No Started Generate `)
                const trackingNo = await this.constructor._createBodyTrackingNumber(transfer.transferToLocationId, transaction)
                const payload = {
                    id: _.get(info, 'id', false),
                    personId: this.personId,
                    bodyTransferTrackingNumber: trackingNo
                }
                personInfo = await upsert('PersonRemainsInfo', payload, transaction, { userId })
                logger.info(`${transfer.transferType} -  ${this.personId} Manual Body Tracking No Generated `)
            }
            logger.info(`${transfer.transferType} -  ${this.personId} Out genrate Manual Body Tracking No`)
            await transaction.commit()
            return personInfo
        } catch (error) {
            await transaction.rollback()
            logger.error(error.message)
            throw error
        }
    }

    /**
     * @param {number} transferId - id of the trasfer of which we need the details
     * @returns object - details of the transfer
     */
    async getTransferDetails (transferId) {
        if (!this.person) {
            await this._loadPerson()
        }
        let transferDetails = await models.PersonRemainsTransfer.scope('withTransferDocuments').findOne({
            where: {
                personId: this.personId,
                id: transferId
            },
            include: [
                ...this.returnCommonIncludes()
            ]
        })
        if (!transferDetails) {
            throw new Error('TRANSFER_NOT_FOUND')
        } else {
            if (transferDetails.transferDocuments && transferDetails.transferDocuments.length) {
                transferDetails.transferDocuments = await Promise.all(transferDetails.transferDocuments.map(async doc => {
                    if ((doc.resourceDocumentImageUrl && doc.resourceDocumentImageUrl.originalFileName) || doc.imageUrl) {
                        doc.imageUrl = await commonDownloadFileWithSignature(doc.resourceDocumentImageUrl, doc.imageUrl)
                        return doc
                    }
                }))
            }
            return transferDetails
        }
    }

    /**
     * get an remains transfers list of the person(decedent)
     * @returns array - list of the transfer added for the person
     */
    async listTransfers () {
        if (!this.person) {
            await this._loadPerson()
        }
        const includeObj = [
            ...this.returnCommonIncludes()
        ]
        const transfers = await models.PersonRemainsTransfer.findAll({
            where: {
                personId: this.personId
            },
            include: includeObj,
            order: [['id', 'ASC']]
        })
        let transfersList = Promise.all(_.map(JSON.parse(JSON.stringify(transfers)), async res => {
            const getWORelatedPersonRemainsTransferInfoQuery = `SELECT PRT.* FROM PersonRemainsTransfer AS PRT
            INNER JOIN WorkOrder AS W ON W.personRemainsTransferId = PRT.id
            WHERE PRT.personId = ${res.personId} AND PRT.id = ${res.id} AND W.statusId = 3 ORDER BY W.completedOn DESC`
            const getWORelatedPersonRemainsTransferInfoRes = await models.sequelize.query(getWORelatedPersonRemainsTransferInfoQuery, { type: models.sequelize.QueryTypes.SELECT })
            res.isWOCompleted = !!_.get(getWORelatedPersonRemainsTransferInfoRes, '[0].id', null)
            return res
        }))
        return transfersList
    }

    /**
     * @param {number} transferId - id of the to be deleted transfer
     * @param {number} userId - id of the currently loggedin user
     * @returns object - deleted transfer
     */
    async deleteTransfer (transferId, userId) {
        if (!this.person) {
            await this._loadPerson()
        }
        const transfer = await this.getTransferDetails(transferId)
        transfer.deletedAt = moment().format('MM/DD/YYYY HH:mm:ss')
        transfer.deletedBy = userId
        await transfer.save()
        return transfer
    }

    /**
     * get an Decdent Tracking list of the remains transfers
     *  * @param {*} queryObj is the object of all the queries done for fetching the Decedent List
     *  @param {Number} status to filter calls based on status of the call. ex: converted, no contact etc
     * @param {Number} limit number of records to fetch
     * @param {Number} page the page number to fetch data
     * @param {Number[]} locationIds to filter calls based on locations
     * @param {Date} createdFromDate to filter calls based on date
     * @param {Number[]} reason get the calls list based on the callReason. call reason is an Number[] of Numbers
     * @param {Date} createdToDate to filter calls based on the date
     * @param {string} callId search the call through callId (which is identifier in table)
     * @param {string} callerName search the call through caller name
     * @param {date[]}  createdAt get the calls list based on the createdAt. createdAt is an Number[] of date of length 2
     * @param {string} contactNo get the calls list based on the phoneNumber
     * @param {Number} assignedTo get the calls list based on the staffId.
     * @param {string} sortOrder get the calls list based on the first modified or last modified
     * @param {String} contactNoOrEmail query to fetch the calls based on contact number or email. based on what matches
     * @returns array - list of the transfer added for the person
     */
    async listofDecedents (queryObj) {
        try {
            /**
             * forming the query to fetch the Decedents
             */
            let listQuery = await this.constructor._queryObjForDecedents(queryObj)
            const offset = (queryObj.page - 1) * queryObj.limit
            const sortOrder = queryObj.sortOrder || 'desc'
            const orderByQuery = `ORDER BY [PersonRemainsTransfer].[updatedAt] ${sortOrder}`
            const joinQuery = ` INNER JOIN [Person] AS [decedent] ON [PersonRemainsTransfer].[personId] = [decedent].[id]
            LEFT JOIN [PersonVerificationDetails] AS [personVerificationDetails] ON [decedent].[id] = [personVerificationDetails].[personId]
            INNER JOIN [Location] AS [transferToLocation] ON [PersonRemainsTransfer].[transferToLocationId] = [transferToLocation].[id] 
            LEFT JOIN [Location] AS [transferToPrepLocation] ON [PersonRemainsTransfer].[transferToPrepLocationId] = [transferToPrepLocation].[id]
            LEFT JOIN [PersonRemainsInfo] AS [info] ON [info].[personId] = [PersonRemainsTransfer].[personId]
            LEFT JOIN [Agreement] AS [funeralAgreement] ON [funeralAgreement].[id] = ( 
                SELECT TOP 1 MAX([funeralAgreement].[id]) FROM [Agreement] AS [funeralAgreement]
                INNER JOIN [AgreementPerson] AS [beneficiary] ON [funeralAgreement].[id] = [beneficiary].[agreementId] AND [beneficiary].[personId] = [PersonRemainsTransfer].[personId] AND  (([beneficiary].[deletedBy] IS NULL AND [beneficiary].[deletedAt] IS NULL) AND [beneficiary].[roleId] = 3)
                WHERE [funeralAgreement].[type] = '1' AND [funeralAgreement].[arrangerId] IS NOT NULL
                GROUP BY [funeralAgreement].[id]
            )
            LEFT JOIN [Employee] AS [arranger] ON [arranger].[id] = [funeralAgreement].[arrangerId]
            LEFT JOIN WorkOrder as wo ON wo.id = (
                SELECT TOP 1 wor.id as id FROM WorkOrder AS wor
                LEFT JOIN [ScheduledFuneralService] AS [sfs] ON sfs.personId = [PersonRemainsTransfer].[personId]
                LEFT JOIN ScheduledCemeteryService AS scs  ON scs.personId = [PersonRemainsTransfer].[personId]
                WHERE (sfs.id = wor.resourceId OR scs.id = wor.resourceId ) 
                 AND NOT EXISTS (
                    SELECT id FROM WorkOrder where 
                    ( resourceId IN ( SELECT sfss.id from [ScheduledFuneralService] AS [sfss] WHERE sfss.personId = [PersonRemainsTransfer].[personId] ) 
                    OR resourceId IN 
                    ( SELECT scss.id FROM [ScheduledCemeteryService] AS [scss] WHERE scss.personId = [PersonRemainsTransfer].[personId] ) 
                    ) AND 
                    statusId != 3 AND deletedAt IS NULL)
                ORDER BY wor.completedOn DESC
            )
            LEFT JOIN WorkOrderStatus AS wos ON wos.id = wo.statusId
            LEFT JOIN WorkOrder AS woComplete ON woComplete.id = (
                SELECT TOP 1  WorkOrder.id
                        FROM WorkOrder
                        LEFT JOIN ScheduledFuneralService ON ScheduledFuneralService.id = WorkOrder.resourceId AND WorkOrder.resourceType = 'ScheduledFuneralService' AND ScheduledFuneralService.personId = [PersonRemainsTransfer].[personId]
                        LEFT JOIN ScheduledCemeteryService ON ScheduledCemeteryService.id = WorkOrder.resourceId AND WorkOrder.resourceType = 'ScheduledCemeteryService' AND ScheduledCemeteryService.personId = [PersonRemainsTransfer].[personId]
                        LEFT JOIN ItemUsage ON ItemUsage.id IN (ScheduledCemeteryService.itemUsageId)
                        LEFT JOIN AgreementLocationItem ON AgreementLocationItem.id IN (ScheduledFuneralService.agreementLocationItemId, ItemUsage.resourceId)
                        LEFT JOIN AgreementPackageItem ON AgreementPackageItem.id IN (ScheduledFuneralService.agreementPackageItemId)
                        LEFT JOIN AgreementCashAdvancedItem ON AgreementCashAdvancedItem.id IN (ScheduledFuneralService.agreementCashAdvancedItemId)
                        INNER JOIN LocationItem ON LocationItem.id IN (AgreementLocationItem.locationItemId, AgreementPackageItem.locationItemId, AgreementCashAdvancedItem.locationItemId)
                        INNER JOIN Item ON Item.id = LocationItem.itemId
                        INNER JOIN ItemAttributeValue ON ItemAttributeValue.itemId = Item.id
                        INNER JOIN AttributeValue ON AttributeValue.id = ItemAttributeValue.attributeValueId
                        INNER JOIN Attribute ON Attribute.id = AttributeValue.attributeId
                        WHERE  Attribute.name = 'Scheduling Service'
                        AND AttributeValue.name LIKE '%Cremation%'
                        AND WorkOrder.deletedAt IS NULL
                       order by WorkOrder.updatedAt desc
            )
            LEFT JOIN ScheduledFuneralService ON ScheduledFuneralService.id = woComplete.resourceId 
            LEFT JOIN ScheduledCemeteryService ON ScheduledCemeteryService.id = woComplete.resourceId
            LEFT JOIN SchedulingSection as ss ON ss.id = ScheduledFuneralService.schedulingSectionId
            LEFT JOIN IntermentInformationSection iis on ScheduledCemeteryService.intermentInformationSectionId=iis.id
            LEFT JOIN DisintermentInfoSection dis on ScheduledCemeteryService.disintermentInfoSectionId= dis.id
            where [PersonRemainsTransfer].[id] in (
                SELECT DISTINCT  MAX([PersonRemainsTransfer].[id]) as [id] 
                from [PersonRemainsTransfer]  WHERE [PersonRemainsTransfer].[transferToLocationID] IS NOT NULL AND transferType = 1 AND [PersonRemainsTransfer].[deletedAt] IS NULL
                GROUP BY [PersonRemainsTransfer].[personId]) AND ${listQuery}`
            let Query = `
            SELECT [PersonRemainsTransfer].[id], [PersonRemainsTransfer].[personId], [info].[bodyTransferTrackingNumber] AS identifier, [PersonRemainsTransfer].[transferType], [PersonRemainsTransfer].[transferDateTime], [PersonRemainsTransfer].[isTransferReady], [PersonRemainsTransfer].[isTransferComplete], [PersonRemainsTransfer].[transferToLocationId], [PersonRemainsTransfer].[CreatedAt],
            CASE WHEN [info].[isEmbalmingApproved] = 1 THEN 'YES'
                 ELSE 'NO' END as [embalming], 
            CASE WHEN [info].[isCremationApproved] = 1 THEN 'YES'
                 ELSE 'NO' END as [cremation], 
            wo.resourceId, wo.completedOn, wo.onePortalWorkOrderId, [funeralAgreement].[status] as faStatus, wos.name as woStatus, 
            CASE WHEN [funeralAgreement].[status] = 'In progress' OR [funeralAgreement].[status] IS NULL THEN 'In progress'
                 WHEN [funeralAgreement].[status] = 'Submitted' AND wos.name = 'closed' THEN 'Completed'
                 WHEN [funeralAgreement].[status] = 'Submitted' THEN 'Submitted' END AS status,
            (
                SELECT [decedent].[id] AS [id], [decedent].[firstName] AS [firstName], [decedent].[middleName] AS [middleName], [decedent].[lastName] AS [lastName], [personVerificationDetails].[id] AS [personVerificationDetails.id], [personVerificationDetails].[onePortalId] AS [personVerificationDetails.onePortalId], [personVerificationDetails].[ssn] AS [personVerificationDetails.ssn]
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            ) AS decedent,
            (
                SELECT [transferToLocation].[id] AS [id], [transferToLocation].[addressId] AS [addressId], [transferToLocation].[name] AS [name]
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            ) AS transferToPlace,
            CASE WHEN [PersonRemainsTransfer].[transferToPrepLocationId] IS NOT NULL THEN 
                ( SELECT [transferToPrepLocation].[id] AS [id], [transferToPrepLocation].[addressId] AS [addressId], [transferToPrepLocation].[name] AS [name]
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            ) ELSE NULL END AS transferToPrep,
            [PersonRemainsTransfer].[transferToPrepLocationId] AS transferToPrepLocationId,
            (
                SELECT [arranger].[id] AS [id], [arranger].[name] AS [name], [arranger].[email] AS [email]
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            ) AS arranger,
            CASE WHEN [funeralAgreement].[contractNumber] IS NOT NULL THEN (
                SELECT [funeralAgreement].[id] AS [id], [funeralAgreement].[contractNumber] AS [identifier]
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            ) ELSE NULL END AS 'case',
            COALESCE(ss.beginningTime, iis.beginningTime, dis.beginningTime) AS cremationDate
            from [PersonRemainsTransfer] 
            ${joinQuery} `
            let countQuery = ` SELECT COUNT(DISTINCT([PersonRemainsTransfer].[personId])) as [count] from [PersonRemainsTransfer]
             ${joinQuery}`
            if (queryObj.page) Query += ` ${orderByQuery} OFFSET ${offset} ROWS FETCH NEXT ${queryObj.limit} ROWS ONLY`
            let listCount = await models.sequelize.query(countQuery, { type: models.sequelize.QueryTypes.SELECT })
            let list = await models.sequelize.query(Query, { type: models.sequelize.QueryTypes.SELECT })
            list.map(e => convertToJson(e))
            return {
                list,
                count: listCount[0].count
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * forming the query based on the requested queries
     * @param {Object} queryObj is the object of queries made for fetching the Decedents
     */
    static async _queryObjForDecedents (queryObj) {
        let sql = `[PersonRemainsTransfer].[transferToLocationID] IS NOT NULL AND transferType = 1 AND [PersonRemainsTransfer].[deletedAt] IS NULL `
        Object.keys(queryObj).map((e) => {
            switch (e) {
            case 'transferIds':
                sql += ` AND [PersonRemainsTransfer].[id] IN (select value from STRING_SPLIT('${queryObj.transferIds}', ','))`
                break
            case 'transferNumber':
                sql += ` AND [info].[bodyTransferTrackingNumber] LIKE '%${queryObj.transferNumber}%'`
                break
            case 'locationId':
                sql += ` AND [PersonRemainsTransfer].[transferToLocationId] = ${queryObj.locationId}`
                break
            case 'propLocationId':
                sql += ` AND [PersonRemainsTransfer].[transferToPrepLocationId] = ${queryObj.propLocationId}`
                break
            case 'name':
                let words = '\'' + queryObj.name.split(' ').join('\',\'') + '\''
                sql += ` AND (decedent.firstName LIKE '%${queryObj.name}%' OR decedent.middleName LIKE '%${queryObj.name}%' OR decedent.lastName LIKE '%${queryObj.name}%' OR decedent.firstName IN (${words}) OR decedent.middleName IN (${words}) OR decedent.lastName IN (${words})) `
                break
            case 'arranger':
                sql += ` AND [arranger].[id] = ${queryObj.arranger}`
                break
            case 'status':
                if (queryObj.status === 'In progress') sql += ` AND ([funeralAgreement].[status] = '${queryObj.status}' OR [funeralAgreement].[status] IS NULL )`
                else if (queryObj.status === 'Submitted') sql += ` AND [funeralAgreement].[status] = '${queryObj.status}' AND wos.name IS NULL`
                else if (queryObj.status === 'Completed') sql += ` AND [funeralAgreement].[status] = 'Submitted' AND wos.name = 'closed'`
                break
            default:
                break
            }
        })
        if (queryObj.transferFromDate && queryObj.transferToDate) {
            let startDate = moment.utc(queryObj.transferFromDate).format('YYYY/MM/DD')
            let endDate = moment.utc(queryObj.transferToDate).format('YYYY/MM/DD')
            sql += ` AND cast([PersonRemainsTransfer].[transferDateTime] as date) between '${startDate}' AND '${endDate}'`
        }
        if (queryObj.completionFromDate && queryObj.completionToDate) {
            let startDate = moment.utc(moment(queryObj.completionFromDate).tz(queryObj.timezone).startOf('day')).format('YYYY/MM/DD HH:mm')
            let endDate = moment.utc(moment(queryObj.completionToDate).tz(queryObj.timezone).endOf('day')).format('YYYY/MM/DD HH:mm')
            sql += ` AND [wo].[completedOn] between '${startDate}' AND '${endDate}'`
        }
        if (queryObj.cremationFromDate && queryObj.cremationToDate) {
            let startDate = moment.utc(moment(queryObj.cremationFromDate).tz(queryObj.timezone).startOf('day')).format('YYYY/MM/DD HH:mm')
            let endDate = moment.utc(moment(queryObj.cremationToDate).tz(queryObj.timezone).endOf('day')).format('YYYY/MM/DD HH:mm')
            sql += ` AND (  COALESCE(ss.beginningTime, iis.beginningTime, dis.beginningTime) between '${startDate}' AND '${endDate}')`
        }
        return sql
    }

    /**
     * @param {Function} returnCommonIncludes A function to return the include models for the anremains actions
     */
    returnCommonIncludes () {
        return [
            {
                model: models.Place,
                as: 'transferFromPlace',
                include: [
                    {
                        model: models.Organization,
                        as: 'organization'
                    },
                    {
                        model: models.Address,
                        as: 'address'
                    }
                ]
            },
            {
                model: models.Place,
                as: 'transferToPlace',
                include: [
                    {
                        model: models.Organization,
                        as: 'organization'
                    },
                    {
                        model: models.Address,
                        as: 'address'
                    }
                ]
            },
            {
                model: models.Location,
                as: 'transferFromLocation',
                attributes: ['addressId', 'name'],
                include: [
                    {
                        model: models.Place,
                        as: 'place',
                        include: [
                            {
                                model: models.Address,
                                as: 'address'
                            }
                        ]
                    }
                ]
            },
            {
                model: models.Location,
                as: 'transferToLocation',
                attributes: ['addressId', 'name'],
                include: [
                    {
                        model: models.Place,
                        as: 'place',
                        include: [
                            {
                                model: models.Address,
                                as: 'address'
                            }
                        ]
                    }
                ]
            }
        ]
    }

    /**
     * This method creates the unique identifier string for the Body Tracking Transfer Number
     * @returns {String}
     * @param {Number} locationId - id of the transfer to location
     * @param {*} transaction
     */
    static async _createBodyTrackingNumber (locationId, transaction) {
        try {
            const year = (new Date()).getFullYear()
            const location = await models.Location.findOne({ where: { id: locationId }, transaction })
            const counterCondtions = {
                year,
                locationId
            }
            const [bodyTrackingNumberCounter] = await models.BodyTrackingNumberCounter.findOrCreate({
                where: counterCondtions,
                transaction
            })
            await bodyTrackingNumberCounter.increment('value', { transaction })
            const uniqueNo = String(bodyTrackingNumberCounter.value + 1).padStart(5, '0')
            const identifier = `${year}${location.code}-TR${uniqueNo}`
            return identifier
        } catch (error) {
            logger.error(error.message)
            throw error
        }
    }
}

module.exports = ANRemainsController
