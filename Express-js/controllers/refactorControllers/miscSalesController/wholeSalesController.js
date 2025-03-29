const models = require('../../../models')
const PersonController = require('../personController/personController')
const logger = require('../../../lib/logger')
const VerifiedPersonController = require('../personController/verifiedPersonController')
const AgreementItemController = require('../agreementController/agreementItemController')
const PartnerController = require('../adminController/partnerController')
const esAgreement = require('../../../es_models/agreement')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const { upsert } = require('../utils')
const _ = require('lodash')
// const AgreementController = require('../agreementController/agreementController')
const { getAgreementRoles, fetchLocationsList } = require('../utils')

class WholeSaleCremationController {
    constructor (wholeSaleId) {
        this.wholeSaleId = wholeSaleId
    }

    /**
     * @typedef {Object} Decedent
     * @property {string} prefix
     * @property {string} firstName
     * @property {string} middleName
     * @property {string} lastName
     * @property {string} phoneNumber
     * @property {date} dateOfBirth
     * @property {date} dateOfDeath
     * @property {string} ssn
     * @property {AddressPlace} addressPlace
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
     * @typedef {Object} AddressPlace
     * @property {Address} address is the address details object
     */

    static get WholeSaleStatus () {
        return {
            1: 'In progress',
            2: 'Completed'
        }
    }

    async _getWholeSaleDetails (transaction) {
        const AgreementController = require('../agreementController/agreementController')
        const wholeSaleDetails = await models.Agreement.scope('wholeSaleCremationIncludesWithOutItemUsage', 'withPartner').findOne({
            where: {
                id: this.wholeSaleId,
                type: AgreementController.TYPES['Wholesale Cremation']
            },
            transaction
        })
        this.wholeSaleDetails = wholeSaleDetails
    }

    /**
     * This method used to create a wholeSaleCremation
     * @param {Object} reqBody
     * @param {number} reqBody.partnerId is the id of the partner selected for the wholeSaleCremation
     * @param {Array<{number}>} reqBody.decedents is the array of the numbers which are id's of the decedents to add to the wholeSaleCremation
     * @param {number} reqBody.userId is the id of the currently loggedIn user
     * @returns {Object} this method returns object which is the created wholeSaleCremation
     */
    static async createWholeSaleCremation (reqBody) {
        let transaction
        try {
            const AgreementController = require('../agreementController/agreementController')

            transaction = await models.sequelize.transaction()
            const partnerController = new PartnerController(reqBody.partnerId)
            const partnerDetails = await partnerController.getPartnerDetails(transaction)
            if (!partnerDetails) {
                throw new Error('PARTNER_NOT_FOUND')
            }
            const locationsObj = await fetchLocationsList(transaction)
            const wholeSaleIdentifier = await this._createWholeSaleIdentifier(transaction)
            const wholeSaleReqBody = {
                type: AgreementController.TYPES['Wholesale Cremation'],
                contractNumber: wholeSaleIdentifier,
                status: 'In progress',
                locationId: locationsObj['CFS']
            }
            const wholeSaleCremation = await upsert('Agreement', wholeSaleReqBody, transaction, { userId: reqBody.userId })
            await this._validateDecedents(reqBody.decedents, transaction)
            const agreementRoles = await getAgreementRoles('map', transaction)
            await this._addDecedentsToWholeSaleCremation(reqBody.decedents, wholeSaleCremation.id, agreementRoles['Beneficiary'], transaction)
            await upsert('AgreementPartner', {
                agreementId: wholeSaleCremation.id,
                partnerId: reqBody.partnerId
            }, transaction, { userId: reqBody.userId })

            let adjustment = {}
            if (partnerDetails.discountType === 1) {
                adjustment['percentage'] = partnerDetails.discountValue
            } else {
                adjustment['amount'] = partnerDetails.discountValue
            }
            await esAgreement.save(wholeSaleCremation, { transaction })
            await upsert('AgreementAdjustment', {
                ...adjustment,
                agreementId: wholeSaleCremation.id
            }, transaction, { userId: reqBody.userId })
            await transaction.commit()
            return wholeSaleCremation
        } catch (error) {
            logger.error(error)
            await transaction.rollback()
            throw error
        }
    }

    /**
     * This method adds the decedents ids to the wholeSaleCremation
     * @param {Array<{number}} decedents is the array of the numbers which are id's of the decedents to add to the wholeSaleCremation
     * @param {Number} wholeSaleId is the id of the wholeSaleCremation for which we need to add the decedents
     * @param {Number} roleId is the id of the role 'benficiary'
     * @param {*} transaction
     */
    static _addDecedentsToWholeSaleCremation (decedents, wholeSaleId, roleId, transaction) {
        return Promise.all(decedents.map(decedent => {
            return models.AgreementPerson.create({
                personId: decedent,
                agreementId: wholeSaleId,
                roleId: roleId
            }, {
                transaction
            })
        }))
    }

    /**
     * This method is used to create the decedents
     * @param {Object} reqBody
     * @param {Decedent} reqBody.person is the basic details of the decedent
     * @param {String} reqBody.referenceNumber is the partner reference number for the decedent
     */
    static async createDecedents (reqBody) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            const personReqBody = {
                ...reqBody.person,
                isAlive: false,
                userId: reqBody.userId
            }
            const decedent = await PersonController.createOrUpdate(personReqBody, reqBody.person.addressPlace, {}, transaction)
            const verifiedPersonController = new VerifiedPersonController(decedent.id)
            reqBody.person.partnerRefNumber = reqBody.referenceNumber
            await verifiedPersonController.verifyPerson(reqBody.person, 'decedent', transaction)
            const decedentDetails = await models.Person.scope('withDeathDetails', 'withVerificationDetails').findOne({
                where: {
                    id: decedent.id
                },
                transaction,
                attributes: [
                    'id',
                    'prefix',
                    'firstName',
                    'middleName',
                    'lastName',
                    'dateOfBirth'
                ]
            })
            await transaction.commit()

            return decedentDetails
        } catch (error) {
            logger.error(error)
            await transaction.rollback()
            throw error
        }
    }

    /**
     * This method creates the unique identifier string for the wholeSaleCremation
     * @returns {String}
     * @param {*} transaction
     */
    static async _createWholeSaleIdentifier (transaction) {
        try {
            const year = (new Date()).getFullYear()
            const counterCondtions = {
                year: year,
                arrangementType: 'WSC'
            }
            let contractNumber = [`WSC-${year}`]
            const [agreementCounter] = await models.AgreementCounter.findOrCreate({
                where: counterCondtions,
                transaction
            })
            await agreementCounter.increment('value', { transaction })
            contractNumber.push(
                String(agreementCounter.value + 1)
            )
            let contractNo = contractNumber.join('')
            return contractNo
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method validates the decedents when adding them to the wholeSaleCremation
     * @param {Array<{number}} decedents is the array of the numbers which are id's of the decedents to add to the wholeSaleCremation
     * @param {*} transaction
     */
    static async _validateDecedents (decedents, transaction) {
        let hasDuplicates = false

        for (let index = 0; index < decedents.length; index++) {
            const lastIndex = _.findLastIndex(decedents, x => {
                return x === decedents[index]
            })
            if (index !== lastIndex) {
                hasDuplicates = true
                break
            }
        }
        if (hasDuplicates) {
            // checking if the same person is added as decedent multiple times
            throw new Error('MULTIPLE_SAME_DECEDENTS')
        }
        const persons = await models.Person.findAll({
            where: {
                id: decedents
            },
            transaction
        })

        const isNotVerified = _.filter(persons, person => !person.isVerified)
        const alivePersons = _.filter(persons, person => person.isAlive)
        const uniquePersons = _.uniq(decedents)
        if (persons.length === uniquePersons.length) {
            if (isNotVerified.length > 0) {
                throw new Error('ADD_VERIFIED_PERSONS')
            }
        } else {
            throw new Error('ADD_VERIFIED_AND_EXISTING_PERSONS')
        }
        if (alivePersons.length) {
            throw new Error('ALIVE_PERSONS_ARE_NOT_ALLOWED_TO_BE_ADDED_AS_DECEDENTS')
        }
    }

    static async getListOfWholeSaleCremation (queryObj) {
        const AgreementController = require('../agreementController/agreementController')

        let whereClause = {
            type: AgreementController.TYPES['Wholesale Cremation']
        }
        let scopes = ['wholeSaleCremationIncludesWithItemUsage']

        if (queryObj.identifier) {
            whereClause.contractNumber = {
                [Op.like]: '%' + queryObj.identifier + '%'
            }
        }

        if (queryObj.status) {
            whereClause['status'] = this.WholeSaleStatus[Number(queryObj.status)]
        }

        if (queryObj.partners) {
            scopes.push({ method: ['withParticularPartner', queryObj.partners.map(partner => Number(partner))] })
        } else {
            scopes.push('withPartner')
        }

        let list = await models.Agreement.scope(scopes).findAll({
            where: whereClause,
            limit: queryObj.limit ? Number(queryObj.limit) : 10,
            offset: queryObj.page ? (Number(queryObj.page - 1) * queryObj.limit) : 0,
            order: [['updatedAt', 'DESC']]
        })

        let count = await models.Agreement.scope(scopes).count({
            where: whereClause,
            limit: queryObj.limit ? Number(queryObj.limit) : 10,
            offset: queryObj.page ? (Number(queryObj.page - 1) * queryObj.limit) : 0,
            order: [['updatedAt', 'DESC']],
            distinct: true,
            col: '[Agreement].id'
        })
        if (list.length) {
            const result = await Promise.all(
                list.map(async wholesale => {
                    const formattedRes = {
                        ...wholesale.toJSON(),
                        wholeSaleDecedents: await Promise.all(
                            wholesale.beneficiary.map(async beneficiary => {
                                const beneficiaryObj = {
                                    ...beneficiary.toJSON(),
                                    itemUsage: await this._findItemUsageOfPerson(beneficiary.person.id)
                                }
                                return beneficiaryObj
                            })
                        ),
                        basicServicesCount: await this._basicServicesCount(wholesale.id)

                    }
                    delete formattedRes.beneficiary
                    return formattedRes
                })
            )
            list = result
        }

        return {
            count,
            rows: list
        }
    }

    /**
     * This methods edits the wholeSalecremation
     * @param {Object} reqBody
     * @param {Array<{number}} reqBody.decedents
     */
    async editWholeSaleCremation (reqBody) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            await this._getWholeSaleDetails(transaction)
            if (!this.wholeSaleDetails) {
                throw new Error('WHOLE_SALE_CREMATION_NOT_FOUND')
            }
            // only wholesalecremation in in-progress can be edited
            if (this.wholeSaleDetails.status === 'In progress') {
                const existingDecedents = this.wholeSaleDetails.beneficiary.map(decedent => decedent.personId)
                const decedents = _.xor(reqBody.decedents, existingDecedents)
                const agreementRoles = await getAgreementRoles('map', transaction)
                await this.constructor._addDecedentsToWholeSaleCremation(decedents, this.wholeSaleId, agreementRoles['Beneficiary'], transaction)
            }
            await transaction.commit()
            return this.wholeSaleDetails
        } catch (error) {
            logger.error(error)
            await transaction.rollback()
            throw error
        }
    }

    /**
     * This methods create or edits the wholeSalecremationItems
     * @param {Object} payload
     * @param {Number} userId
     * @param {Object} params
     */

    async createOrUpdateWholeSaleCremationItems (payload, userId, params) {
        try {
            const agreementItemController = new AgreementItemController(
                Number(this.wholeSaleId)
            )
            let body = {
                userId,
                ...payload
            }
            if (params.wholeSaleItemId) {
                body['locationItemId'] = payload.locationItemId
                body['agreementLocationItemId'] = params.wholeSaleItemId
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

    async _updateAgreementAdjustment (userId) {
        await this._getWholeSaleDetails()
        if (this.wholeSaleDetails) {
            let discountType = _.get(this.wholeSaleDetails, 'agreementPartner.partner.discountType')
            const partnerDiscountTypes = PartnerController.discountTypes
            if (partnerDiscountTypes[discountType] === 'Dollar amount $') {
                const partnerDiscount = _.get(this.wholeSaleDetails, 'agreementPartner.partner.discountValue')
                const wholeSaleItems = await this.getWholeSaleCremationItems()
                if (wholeSaleItems.services && wholeSaleItems.services.length) {
                    const adjustmentDetails = await models.AgreementAdjustment.findOne({
                        where: {
                            agreementId: this.wholeSaleId
                        }
                    })
                    if (adjustmentDetails) {
                        const totalQuantity = wholeSaleItems.services.reduce((quantity, service) => {
                            return quantity + service.quantity
                        }, 0)
                        const totalAmount = partnerDiscount * totalQuantity
                        adjustmentDetails.set({
                            amount: totalAmount
                        })
                        // this.wholeSaleDetails.set({
                        //     totalAdjustment: totalAmount
                        // })
                        await adjustmentDetails.save()
                        // await this.wholeSaleDetails.save()
                        await models.Agreement.updateTotalAdjustment(this.wholeSaleId)
                        await models.Agreement.updateTotalPaidAndDue(this.wholeSaleId, userId)
                    }
                }
            }
        }
    }

    /**
     * @returns {Object} This method return the Object of details of the wholeSaleCremation
     */
    async getWholeSaleCremationDetails () {
        try {
            await this._getWholeSaleDetails()
            const AgreementController = require('../agreementController/agreementController')
            const agreemnetController = new AgreementController(this.wholeSaleId)
            if (this.wholeSaleDetails) {
                const data = {
                    ...this.wholeSaleDetails.toJSON(),
                    wholeSaleDecedents: this.wholeSaleDetails.beneficiary,
                    noOfPayments: await agreemnetController.getPaymentsForAgereement()
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
     * @returns {Array} This method return the selected items of a wholeSaleCremation
     */
    async getWholeSaleCremationItems () {
        try {
            const wholeSaleItemsQuery = `            
                SELECT 
                ali.*,
                i.name as name,
                i.[description] as description,
                i.code as itemCode, 
                a.status AS wholeSaleCremationStatus,
                aip.quantity, 
                aip.unitTax,
                aip.unitPrice,
                aip.totalPrice,
                aip.totalTax,
                a.contractNumber AS identifier,
                i.code as itemCode,
                case 
                WHEN ic.name = 'Wholesale Cremation Fee' THEN 'fee'
                WHEN ic.name = 'Wholesale Cremation Add on' THEN 'addOn'
                WHEN ic.name = 'Wholesale Cremation' THEN 'services'
            END AS itemCategory 
                FROM AgreementLocationItem as ali 
                INNER JOIN LocationItem as li ON ali.locationItemId = li.id 
                INNER JOIN Item as i ON li.itemId = i.id
                INNER JOIN AgreementItemPrice as aip ON ali.agreementItemPriceId = aip.id
                INNER JOIN ItemCategory ic ON ic.id = i.itemCategoryId 
                INNER JOIN ItemType it ON it.id = ic.itemTypeId 
                INNER JOIN Agreement a ON a.id = ali.agreementId 
                WHERE ali.agreementId = ${this.wholeSaleId} AND ali.deletedAt IS NULL`
            const wholeSaleItems = await models.sequelize.query(wholeSaleItemsQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })
            const responseObject = _.groupBy(wholeSaleItems, 'itemCategory')

            return responseObject
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    static async _basicServicesCount (wholesaleId) {
        const query = `select count(ali.agreementId) as count FROM AgreementLocationItem as ali
            INNER JOIN LocationItem as li ON ali.locationItemId = li.id 
            INNER JOIN Item as i ON li.itemId = i.id
            INNER JOIN ItemCategory ic ON ic.id = i.itemCategoryId 
            INNER JOIN ItemType it ON it.id = ic.itemTypeId 
            WHERE ali.agreementId = ${wholesaleId} AND ali.deletedAt IS NULL AND ic.name = 'Wholesale Cremation' 
        `
        const count = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT
        })
        return count[0].count
    }

    /**
     * @returns {Array}
     * @param {Number} itemTypeId is the number which defined item type
     */
    static getCategories (itemTypeId) {
        return models.ItemCategory.findAll({
            where: {
                itemTypeId: itemTypeId,
                name: ['Wholesale Cremation', 'Wholesale Cremation Add on', 'Wholesale Cremation Fee']
            }
        })
    }

    static async getPayors (wholeSaleId) {
        let agreementPartners = await models.AgreementPartner.scope('withPartnerDetails').findAll({
            where: {
                agreementId: wholeSaleId
            }
        })
        agreementPartners = agreementPartners.map(agreementPartner => {
            const data = {
                ...agreementPartner.toJSON(),
                isPayorPartner: true,
                person: agreementPartner.partner,
                totalPaid: agreementPartner.partner.payment.reduce(
                    (amount, payment) => {
                        return amount + payment.amount
                    },
                    0
                ),
                hasPreviousPayments: !!agreementPartner.partner.payment.length
            }
            delete data.partner
            delete data.person.payment
            return data
        })
        return agreementPartners
    }

    /**
     * @description This methods updates the status of the wholesale cremation as completed if all the workorders of the decedents in it are closed
     * @param {String} contractNumber is the unique contractNumber of the currently being updated workOrder
     * @param {Number} updatingWorkOrder is the id of the currently being updated workOrder
     * @param {*} transaction
     */
    static async updateTheStatusOfWholesale (contractNumber, updatingWorkOrder, transaction) {
        try {
            const wholeSaleCremation = await models.Agreement.findOne({
                where: {
                    contractNumber: contractNumber
                },
                include: [
                    {
                        model: models.AgreementPerson,
                        as: 'beneficiary'
                    }
                ],
                transaction
            })
            const decedentsInWholesale = wholeSaleCremation.beneficiary.map(beneficiary => beneficiary.personId)
            const itemUsageOfPersons = _.flattenDeep(await Promise.all(decedentsInWholesale.map(decedentId => {
                return this._findItemUsageOfPerson(decedentId, transaction)
            })))
            if (itemUsageOfPersons.length) {
                const workOrders = []
                itemUsageOfPersons.forEach(record => {
                    if (_.get(record, 'scheduledServices.workOrder.id')) {
                        workOrders.push(record.scheduledServices.workOrder)
                    }
                })
                const workOrdersToValidate = workOrders.filter(record => record.id !== Number(updatingWorkOrder))
                const completedWorkOrders = workOrdersToValidate.filter(record => record.status === 'closed')
                // if ((workOrdersToValidate.length === completedWorkOrders.length && (workOrders.length > 0 && workOrders.length === decedentsInWholesale.length)) || workOrdersToValidate.length === 0) {
                //     wholeSaleCremation.status = 'Completed'
                //     await wholeSaleCremation.save({ transaction })
                // }
                if (workOrders.length === decedentsInWholesale.length && workOrdersToValidate.length === completedWorkOrders.length) {
                    wholeSaleCremation.status = 'Completed'
                    await wholeSaleCremation.save({ transaction })
                }
            }
            return wholeSaleCremation
        } catch (error) {
            throw error
        }
    }

    static async _findItemUsageOfPerson (personId, transaction) {
        const AgreementController = require('../agreementController/agreementController')
        const wholesaleType = AgreementController.TYPES['Wholesale Cremation']
        const scopes = ['itemUsageStatusScope', 'wholesaleCremation']
        const query = `select ali.id FROM AgreementLocationItem as ali
        INNER JOIN Agreement as agmnt ON agmnt.id = ali.agreementId
        INNER JOIN AgreementPerson as decedents ON decedents.agreementId=agmnt.id
        INNER JOIN LocationItem as li ON ali.locationItemId = li.id 
        INNER JOIN Item as i ON li.itemId = i.id
        INNER JOIN ItemCategory ic ON ic.id = i.itemCategoryId 
        INNER JOIN ItemType it ON it.id = ic.itemTypeId 
        WHERE ali.deletedAt IS NULL AND ic.name = 'Wholesale Cremation' AND agmnt.type=${wholesaleType} AND decedents.personId = ${personId}
    `
        const basicServices = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT,
            transaction
        })
        const ids = basicServices.map(service => service.id)
        const itemUsages = await models.ItemUsage.scope(scopes).findAll({
            where: {
                personId: personId,
                deletedAt: null,
                deletedBy: null,
                resourceType: 'AgreementLocationItem',
                resourceId: ids
            },
            attributes: ['id', 'personId', 'usageStatus', 'resourceType'],
            transaction
        })
        return itemUsages.map(itemUsage => {
            return {
                id: itemUsage.id,
                usageStatus: _.get(itemUsage, 'status.status'),
                scheduledServices: {
                    id: _.get(itemUsage, 'scheduledCemeteryService.id'),
                    workOrder: {
                        id: _.get(itemUsage, 'scheduledCemeteryService.workOrder.id'),
                        status: _.get(itemUsage, 'scheduledCemeteryService.workOrder.status.name'),
                        completedOn: _.get(itemUsage, 'scheduledCemeteryService.workOrder.completedOn')
                    }
                }
            }
        })
    }
}
module.exports = WholeSaleCremationController
