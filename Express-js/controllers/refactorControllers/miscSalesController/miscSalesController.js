const _ = require('lodash')
const models = require('../../../models')
const AgreementController = require('../agreementController/agreementController')
const AgreementItemController = require('../agreementController/agreementItemController')
const { upsert, getAgreementRoles, validateLocationIds, convertToJson } = require('../utils')
const logger = require('../../../lib/logger')
const VerifiedPersonController = require('../personController/verifiedPersonController')
const moment = require('moment')
class MiscSalesController {
    constructor (miscSaleId) {
        this.miscSaleId = miscSaleId
    }
    static get REQUEST_FROM () {
        return {
            Funeral: 1,
            Cemetery: 2,
            All: 3
        }
    }

    /**
     *
     * @param {Object} reqBody
     * @param {number} reqBody.arrangerId id of the arranger for the misc sale
     * @param {number} reqBody.locationId id of the locations where the misc sale is created
     * @param {number} userId id of the currently loggedIn user
     */
    static async createMiscSale (reqBody, userId) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            const miscSaleIdentifier = await this._createMiscSaleIdentifier(transaction)
            const needTypes = AgreementController.NEED_TYPES
            const miscSalesReqBody = {
                contractNumber: miscSaleIdentifier,
                arrangerId: reqBody.arrangerId,
                locationId: reqBody.locationId,
                saleTypeId: reqBody.saleTypeId,
                type: AgreementController.TYPES['Miscellaneous Sales'],
                status: 'In progress',
                needType: needTypes['AN'] // for misc sales need type will always be AN
            }
            await validateLocationIds(reqBody.locationId, transaction)
            const miscSales = await upsert('Agreement', miscSalesReqBody, transaction, { userId: userId })
            const agreementRoles = await getAgreementRoles('map', transaction)
            // Adding Decedent
            if (reqBody.decedent) {
                await this._validateDecedent(reqBody.decedent, transaction)
                const decedent = {
                    personId: reqBody.decedent,
                    agreementId: miscSales.id,
                    roleId: agreementRoles['Beneficiary']
                }
                await upsert('AgreementPerson', decedent, transaction, { userId: userId })
            }
            // Adding Purchaser
            const verifiedPersonController = new VerifiedPersonController(reqBody.personId)
            await verifiedPersonController.getVerifiedPerson(transaction)
            const person = {
                agreementId: miscSales.id,
                personId: reqBody.personId,
                roleId: agreementRoles['Purchaser'],
                isOwner: true
            }
            await upsert('AgreementPerson', person, transaction, { userId: userId })
            await transaction.commit()
            return miscSales
        } catch (error) {
            logger.error(error)
            await transaction.rollback()
            throw error
        }
    }

    /**
     *
     * @param {Object} reqBody
     * @param {number} reqBody.arrangerId id of the arranger for the misc sale
     * @param {number} reqBody.locationId id of the locations where the misc sale is created
     * @param {number} userId id of the currently loggedIn user
     */
    async editMiscSale (reqBody, userId) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            await this._getMiscSaleDetails(transaction)
            if (!this.miscSaleDetails) {
                throw new Error('MISC_SALE_CREMATION_NOT_FOUND')
            }
            if ((_.get(this.miscSaleDetails, 'purchaser.personId') && (_.get(this.miscSaleDetails, 'purchaser.personId') !== reqBody.personId)) || (_.get(this.miscSaleDetails, 'beneficiary[0].personId') && (_.get(this.miscSaleDetails, 'beneficiary[0].personId') !== reqBody.decedent))) {
                const serviceQuery = `select * from Agreement a
                INNER Join AgreementLocationItem ali on ali.agreementId = a.id
                WHERE a.id = ${this.miscSaleId} AND ali.deletedAt IS NULL
                `
                const query = `select * from Agreement a
                INNER Join AgreementCashAdvancedItem acd on acd.agreementId = a.id
                WHERE a.id = ${this.miscSaleId} AND acd.deletedAt IS NULL`
                let service = await models.sequelize.query(serviceQuery, { type: models.sequelize.QueryTypes.SELECT })
                let cashAdvanceService = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
                if (service.length || cashAdvanceService.length) {
                    throw new Error('Please remove the selected item')
                }
            }
            // only miscsalecremation in in-progress can be edited
            if (this.miscSaleDetails.status === 'In progress') {
                const existingDecedent = _.find(this.miscSaleDetails.beneficiary, ['personId', reqBody.decedent])
                const agreementRoles = await getAgreementRoles('map', transaction)
                if (!existingDecedent) {
                    // delete Existing Decedent record
                    if (reqBody.decedent) {
                        await this.constructor._validateDecedent(reqBody.decedent, transaction)
                        // Adding Decedent record
                        const decedent = {
                            id: _.get(this.miscSaleDetails, 'beneficiary[0].id'),
                            personId: reqBody.decedent,
                            agreementId: this.miscSaleDetails.id,
                            roleId: agreementRoles['Beneficiary']
                        }
                        await upsert('AgreementPerson', decedent, transaction, { userId: userId })
                    } else if (_.get(this.miscSaleDetails, 'beneficiary[0].id', false)) {
                        await models.AgreementPerson.destroy({ where: { id: _.get(this.miscSaleDetails, 'beneficiary[0].id') } }, transaction)
                    }
                }
                if (reqBody.personId !== _.get(this.miscSaleDetails, 'purchaser.personId')) {
                    // Updating Purchaser
                    const verifiedPersonController = new VerifiedPersonController(reqBody.personId)
                    await verifiedPersonController.getVerifiedPerson(transaction)
                    const deletePersonPayload = {
                        id: _.get(this.miscSaleDetails, 'purchaser.id'),
                        deletedAt: new Date(),
                        deletedBy: userId
                    }
                    const person = {
                        agreementId: this.miscSaleDetails.id,
                        personId: reqBody.personId,
                        roleId: agreementRoles['Purchaser'],
                        isOwner: true
                    }
                    const agreementPerson = await models.Payment.findOne({
                        where: {
                            payorId: _.get(this.miscSaleDetails, 'purchaser.id'),
                            resourceId: this.miscSaleDetails.id,
                            status: 'success'
                        }
                    })
                    if (agreementPerson) {
                        const personPayload = {
                            agreementId: this.miscSaleDetails.id,
                            personId: _.get(this.miscSaleDetails, 'purchaser.personId'),
                            roleId: agreementRoles['Payor']
                        }
                        await upsert('AgreementPerson', personPayload, transaction, { userId: userId })
                    }
                    await upsert('AgreementPerson', deletePersonPayload, transaction, { userId: userId })
                    await upsert('AgreementPerson', person, transaction, { userId: userId })
                }
                const miscSalesReqBody = {
                    id: this.miscSaleId,
                    arrangerId: reqBody.arrangerId,
                    locationId: reqBody.locationId,
                    saleTypeId: reqBody.saleTypeId,
                    status: reqBody.status || this.miscSaleDetails.status
                }
                await validateLocationIds(reqBody.locationId, transaction)
                await upsert('Agreement', miscSalesReqBody, transaction, { userId: userId })
            }
            await transaction.commit()
            return this.miscSaleDetails
        } catch (error) {
            logger.error(error)
            await transaction.rollback()
            throw error
        }
    }

    static async getListingOfMiscSales (queryObj) {
        let listQuery = await this._queryObjForMiscSales(queryObj)
        const offset = (queryObj.page - 1) * queryObj.limit
        const sortOrder = queryObj.sortOrder || 'desc'
        const orderByQuery = `ORDER BY [Agreement].[updatedAt] ${sortOrder}`
        const joinQuery = `
            FROM [Agreement] AS [Agreement]
            LEFT OUTER JOIN [HmisDataSync] AS [hds] ON [hds].[agreementId] = [Agreement].[id] AND [hds].[statusId] = 3
            INNER JOIN [AgreementPerson] AS [purchaser] ON [Agreement].[id] = [purchaser].[agreementId] AND (([purchaser].[deletedBy] IS NULL AND [purchaser].[deletedAt] IS NULL) AND [purchaser].[roleId] = 1) 
            LEFT OUTER JOIN [AgreementPerson] AS [decedents] ON [Agreement].[id] = [decedents].[agreementId] AND (([decedents].[deletedBy] IS NULL AND [decedents].[deletedAt] IS NULL) AND [decedents].[roleId] = 3)
            LEFT OUTER JOIN [Person] AS [decedentPerson] ON [decedents].[personId] = [decedentPerson].[id]
            LEFT OUTER JOIN [PersonVerificationDetails] AS [decedentPersonVerificationDetails] ON [decedentPerson].[id] = [decedentPersonVerificationDetails].[personId]
            LEFT OUTER JOIN [Person] AS [purchaserPerson] ON [purchaser].[personId] = [purchaserPerson].[id]
            LEFT OUTER JOIN [PersonVerificationDetails] AS [purchaserPersonVerificationDetails] ON [purchaserPerson].[id] = [purchaserPersonVerificationDetails].[personId]
            WHERE ${listQuery}
        `
        let query = `
        SELECT  Distinct [Agreement].[id], [Agreement].[arrangerId], [Agreement].[saleTypeId], [Agreement].[contractNumber], [Agreement].[status], [Agreement].[locationId], [Agreement].[totalPrice], [Agreement].[totalTax], [Agreement].[totalPurchasePrice], [Agreement].[totalAdjustment], [Agreement].[totalCashPrice], [Agreement].[totalPaid], [Agreement].[due], [Agreement].[previousDue], [Agreement].[isValidated], [Agreement].[createdAt], [Agreement].[updatedAt], 
            COALESCE((
                SELECT [decedents].[id] AS [id], [decedents].[personId] AS [personId], [decedentPerson].[id] AS [person.id], [decedentPerson].[firstName] AS [person.firstName], [decedentPerson].[middleName] AS [person.middleName], [decedentPerson].[lastName] AS [person.lastName], [decedentPersonVerificationDetails].[id] AS [person.personVerificationDetails.id], [decedentPersonVerificationDetails].[onePortalId] AS [person.personVerificationDetails.onePortalId] 
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            ), null) As decedent,
            COALESCE((
                SELECT [purchaser].[id] AS [id], [purchaser].[personId] AS [personId], [purchaserPerson].[id] AS [person.id], [purchaserPerson].[firstName] AS [person.firstName], [purchaserPerson].[middleName] AS [person.middleName], [purchaserPerson].[lastName] AS [person.lastName], [purchaserPersonVerificationDetails].[id] AS [person.personVerificationDetails.id], [purchaserPersonVerificationDetails].[onePortalId] AS [person.personVerificationDetails.onePortalId]
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            ), null) As purchaser 
            ${joinQuery}`
        if (queryObj.page) query += ` ${orderByQuery} OFFSET ${offset} ROWS FETCH NEXT ${queryObj.limit} ROWS ONLY`
        const countQuery = `SELECT count(DISTINCT([Agreement].[id])) AS [count] ${joinQuery}`
        let miscCount = await models.sequelize.query(countQuery, { type: models.sequelize.QueryTypes.SELECT })
        let rows = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
        rows.map(e => convertToJson(e))
        return {
            rows,
            count: miscCount[0].count
        }
    }

    /**
     * This method creates the unique identifier string for the wholeSaleCremation
     * @returns {String}
     * @param {*} transaction
     */
    static async _createMiscSaleIdentifier (transaction) {
        try {
            const year = (new Date()).getFullYear()
            const counterCondtions = {
                year: year,
                arrangementType: 'MS'
            }
            let contractNumber = [`${year}MS`]
            const [agreementCounter] = await models.AgreementCounter.findOrCreate({
                where: counterCondtions,
                transaction
            })
            await agreementCounter.increment('value', { transaction })
            contractNumber.push(
                String(agreementCounter.value + 1).padStart(5, '0')
            )
            let contractNo = contractNumber.join('')
            return contractNo
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method validates the decedent when adding them to the miscSaleCremation
     * @param {number} decedent is the id of the decedents to add to the miscSaleCremation
     * @param {*} transaction
     */
    static async _validateDecedent (decedent, transaction) {
        const person = await models.Person.findOne({
            where: {
                id: decedent
            },
            transaction
        })
        if (!person.isVerified) {
            throw new Error('ADD_VERIFIED_PERSONS')
        }
        if (person.isAlive) {
            throw new Error('ALIVE_PERSONS_ARE_NOT_ALLOWED_TO_BE_ADDED_AS_DECEDENTS')
        }
    }

    /**
     * forming the query based on the requested queries
     * @param {Object} queryObj is the object of queries made for fetching the MiscSales
     */
    static async _queryObjForMiscSales (queryObj) {
        let sql = `[Agreement].[type] =  ${AgreementController.TYPES['Miscellaneous Sales']}`
        Object.keys(queryObj).map((e) => {
            switch (e) {
            case 'salesStatus':
                sql += ` AND [Agreement].[status] IN (select value from STRING_SPLIT('${queryObj.salesStatus}',','))`
                break
            case 'arrangerId':
                sql += ` AND [Agreement].[arrangerId] IN (select value from STRING_SPLIT('${queryObj.arrangerId}',','))`
                break
            case 'locationId':
                sql += ` AND [Agreement].[locationId] IN (select value from STRING_SPLIT('${queryObj.locationId}',','))`
                break
            case 'miscSalesId':
                sql += ` AND [Agreement].[contractNumber] LIKE '%${queryObj.miscSalesId}%'`
                break
            case 'name':
                let words = '\'' + queryObj.name.split(' ').join('\',\'') + '\''
                sql += ` AND ((decedentPerson.firstName LIKE '%${queryObj.name}%' OR decedentPerson.middleName LIKE '%${queryObj.name}%' OR decedentPerson.lastName LIKE '%${queryObj.name}%' OR decedentPerson.firstName IN (${words}) OR decedentPerson.middleName IN (${words}) OR decedentPerson.lastName IN (${words})) 
                        OR 
                        (purchaserPerson.firstName LIKE '%${queryObj.name}%' OR purchaserPerson.middleName LIKE '%${queryObj.name}%' OR purchaserPerson.lastName LIKE '%${queryObj.name}%' OR purchaserPerson.firstName IN (${words}) OR purchaserPerson.middleName IN (${words}) OR purchaserPerson.lastName IN (${words}))
                        OR
                        [Agreement].[contractNumber] LIKE '%${queryObj.name}%')`
                break
            default:
                break
            }
        })
        if (queryObj.createdFrom && queryObj.createdTo) {
            let startDate = moment.utc(moment(queryObj.createdFrom).tz(queryObj.timezone).startOf('day')).format('YYYY/MM/DD HH:mm')
            let endDate = moment.utc(moment(queryObj.createdTo).tz(queryObj.timezone).endOf('day')).format('YYYY/MM/DD HH:mm')
            sql += ` AND [Agreement].[createdAt] between '${startDate}' AND '${endDate}'`
        }
        if (queryObj.submittedFrom && queryObj.submittedTo) {
            let startDate = moment.utc(moment(queryObj.submittedFrom).tz(queryObj.timezone).startOf('day')).format('YYYY/MM/DD HH:mm')
            let endDate = moment.utc(moment(queryObj.submittedTo).tz(queryObj.timezone).endOf('day')).format('YYYY/MM/DD HH:mm')
            sql += ` AND [hds].[createdAt] between '${startDate}' AND '${endDate}'`
        }
        return sql
    }

    /**
     * @returns This method return the CashReceiptId of the miscSales
     */
    async getPaymentCashReceiptId (miscSalesId) {
        const payment = await models.Payment.findAll({
            where: {
                resourceId: miscSalesId,
                resourceType: 'Agreement'
            }
        })
        return payment && payment.map(item => {
            return {
                cashReceiptId: item.cashReceiptId,
                status: item.status,
                voidedCashReceiptId: item.voidedCashReceiptId
            }
        })
    }
    async getPayorsWithPreviousPayments () {
        const result = await models.Payment.findAll({
            where: {
                resourceId: this.miscSaleId,
                status: 'success'
            },
            include: [{
                model: models.AgreementPerson.unscoped(),
                include: [{
                    model: models.Person,
                    as: 'person'
                }]
            }]
        })
        return result
    }

    /**
     * @returns {Object} This method return the Object of details of the miscSales
     */
    async getMiscSaleDetails () {
        try {
            await this._getMiscSaleDetails()
            const agreementController = new AgreementController(this.miscSaleId)
            if (this.miscSaleDetails) {
                const data = {
                    ...this.miscSaleDetails.toJSON(),
                    decedent: _.get(this.miscSaleDetails, 'beneficiary[0]', null),
                    noOfPayments: await agreementController.getPaymentsForAgereement(),
                    payors: await this.getPayorsWithPreviousPayments(),
                    cashReceiptInfo: await this.getPaymentCashReceiptId(this.miscSaleDetails.id)
                }
                delete data.beneficiary
                return data
            }
            return this.wholeSaleDetails
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * @returns {Array}
     * @param {Number} itemTypeId is the number which defined item type
     */
    static getCategories (itemTypeId) {
        return models.ItemCategory.findAll({
            where: {
                itemTypeId: itemTypeId,
                name: ['Catering', 'Cremation Service', 'Mortuary Facility', 'Disinterment Service', 'Urn', 'Keepsake', 'Funeral Service Accessory', 'FLORAL', 'Other Merchandise', 'Cash Advance']
            },
            attributes: ['id', 'name', 'itemTypeId']
        })
    }

    /**
     * This methods create or edits the miscSalesItems
     * @param {Object} payload
     * @param {Number} userId
     * @param {Object} params
     */
    async createOrUpdateMiscSalesItems (payload, userId, params) {
        try {
            const agreementItemController = new AgreementItemController(Number(this.miscSaleId))
            let body = {
                userId,
                ...payload
            }
            if (params.miscSaleItemId) {
                body['locationItemId'] = payload.locationItemId
                body['agreementLocationItemId'] = params.miscSaleItemId
                if (payload.quantity === 0 && payload.action === 'remove') {
                    body.removeAll = true
                }
            }
            const agreementItem = await agreementItemController.createOrUpdate(
                payload.action,
                body
            )
            return agreementItem
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    async _getMiscSaleDetails (transaction) {
        const miscSaleDetails = await models.Agreement.scope('miscSalesIncludesWithItemUsage', 'commonIncludes').findOne({
            where: {
                id: this.miscSaleId,
                type: AgreementController.TYPES['Miscellaneous Sales']
            },
            transaction
        })
        this.miscSaleDetails = miscSaleDetails
    }

    async _updateAgreementAdjustment (userId) {
        await this._getMiscSaleDetails()
        if (this.miscSaleDetails) {
            await models.Agreement.updateTotalAdjustment(this.miscSaleId)
            await models.Agreement.updateTotalPaidAndDue(this.miscSaleId, userId)
        }
    }

    /**
     * @returns {Array} This method return the selected items of a miscSale
     */
    async getMiscSaleItems () {
        try {
            const miscSaleItemsQuery = `            
                SELECT 
                ali.*,
                i.name as name,
                i.[description] as description,
                i.code as itemCode, 
                a.status AS miscSaleStatus,
                aip.quantity, 
                aip.unitTax,
                aip.unitPrice,
                aip.totalPrice,
                aip.totalTax,
                a.contractNumber AS identifier,
                i.code as itemCode,
                case 
                WHEN ic.name in ('Catering', 'Cremation Service', 'Mortuary Facility', 'Disinterment Service') THEN 'Services'
                WHEN ic.name in ('Urn', 'Keepsake', 'Funeral Service Accessory', 'FLORAL', 'Other Merchandise')  THEN 'Merchandise'
                WHEN ic.name = 'Cash Advance' THEN 'CashAdvance'
            END AS itemCategory 
                FROM AgreementLocationItem as ali 
                INNER JOIN LocationItem as li ON ali.locationItemId = li.id 
                INNER JOIN Item as i ON li.itemId = i.id
                INNER JOIN AgreementItemPrice as aip ON ali.agreementItemPriceId = aip.id
                INNER JOIN ItemCategory ic ON ic.id = i.itemCategoryId 
                INNER JOIN ItemType it ON it.id = ic.itemTypeId 
                INNER JOIN Agreement a ON a.id = ali.agreementId 
                WHERE ali.agreementId = ${this.miscSaleId} AND ali.deletedAt IS NULL`
            const miscSaleItems = await models.sequelize.query(miscSaleItemsQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })
            const responseObject = _.groupBy(miscSaleItems, 'itemCategory')

            return responseObject
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
}

module.exports = MiscSalesController
