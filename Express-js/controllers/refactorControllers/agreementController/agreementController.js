const {
    upsert,
    getAgreementRoles,
    validateLocationIds,
    getFullNameOfPerson,
    convertToJson
} = require('../utils')
const PersonController = require('../personController/personController')
const PayerController = require('../paymentController/payerController')
const models = require('../../../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const _ = require('lodash')
const moment = require('moment')
const momentTimeZone = require('moment-timezone')
const { updateAgreementDetails, returnFinancedValue, propertyOwnerList } = require('./agreementUtils')
const logger = require('../../../lib/logger')
const { bullJobRetry } = require('../../../lib/util')
const WholeSaleCremationController = require('../miscSalesController/wholeSalesController')
const seedValues = require('../../../config/seed')
const PropertyController = require('./agreementPropertiesController')
const AgreementPropertyAdditionalRight = require('./agreementPropertyAdditionalRights')
const QuotationController = require('../../../controllers/refactorControllers/quotationController/quotationController')
class AgreementController {
    constructor (agreementId) {
        this.agreementId = agreementId
    }
    /**
   * statements and contracts are called agreements
   * statements are for funeral
   * contracts are for cemetery
   */

    /**
   * create statement/contract for a person
   */

    static get NEED_TYPES () {
        return {
            AN: 1,
            PN: 2
        }
    }

    static get TYPES () {
        let contractTypes = seedValues.seed.ContractType
        contractTypes = _.transform(contractTypes, (res, val, key) => {
            res[_.startCase(_.lowerCase(val))] = parseInt(key)
        }, {})
        return contractTypes
    }

    static _fetchThePersonsDetails (whereCondition, transaction) {
        return models.Person.findAll({
            where: whereCondition,
            transaction
        })
    }

    /**
   *
   * @param {Array<{personId: Number, agreementRoleId: Number}>} agreementPersons
   * @param {object} agreementRoles
   * @param {*} transaction
   */
    static async _validateAgreementPersons (
        reqBody,
        agreementRoles,
        transaction
    ) {
        const agreementPersons = _.filter(reqBody.persons, person => !person.isDeleted)
        let coPurchasers = _.filter(agreementPersons, e => {
            return e.agreementRoleId === agreementRoles['Co-purchaser']
        })
        let purchasers = _.filter(agreementPersons, e => {
            return e.agreementRoleId === agreementRoles['Purchaser']
        })
        const purchasersIds = purchasers.map(person => person.personId)
        const coPurchasersIds = coPurchasers.map(person => person.personId)
        let hasDuplicates = false
        for (let index = 0; index < coPurchasersIds.length; index++) {
            const lastIndex = _.findLastIndex(coPurchasersIds, x => {
                return x === coPurchasersIds[index]
            })
            if (index !== lastIndex) {
                hasDuplicates = true
                break
            }
        }
        if (hasDuplicates) {
            // checking if the same person is added as Co-purchaser multiple times
            throw new Error('MULTIPLE_SAME_CO_PURCHASERS')
        }
        if (purchasersIds.length) {
            // checking if the purchasers are the persons who are alive
            const alivePurchasers = await this._fetchThePersonsDetails({
                id: purchasersIds,
                isAlive: true
            }, transaction)
            if (purchasersIds.length !== alivePurchasers.length) {
                throw new Error('ONLY_ALIVE_PERSONS_ARE_ALLOWED_TO_BE_PURCHASERS')
            }

            if (purchasers.length > 1) {
                throw new Error('ONLY_ONE_PURCHASER_IS_ALLOWED')
            }
        }
        if (coPurchasersIds.length) {
            // checking if the co-purchasers are the persons who are alive
            const aliveCopurchasers = await this._fetchThePersonsDetails({
                id: coPurchasersIds,
                isAlive: true
            }, transaction)
            if (coPurchasersIds.length !== aliveCopurchasers.length) {
                throw new Error('ONLY_ALIVE_PERSONS_ARE_ALLOWED_TO_BE_CO_PURCHASERS')
            }
        }

        if (purchasers.length && coPurchasers.length && _.intersection(purchasersIds, coPurchasersIds).length) {
            // checking if the purchaser is being added as Co-purchaser
            throw new Error('PURCHASER_CAN_NOT_BE_CO_PURCHASER')
        }

        await this._checkForVerifiedPersons(agreementPersons, transaction)
    }
    static async _checkForVerifiedPersons (agreementPersons, transaction) {
        const personIds = agreementPersons.map(person => person.personId)
        const uniquePersons = _.uniq(personIds)
        const persons = await this._fetchThePersonsDetails({
            id: uniquePersons
        }, transaction)
        const isNotVerified = _.filter(persons, e => {
            return !e.isVerified
        })
        if (persons.length === uniquePersons.length) {
            if (isNotVerified.length > 0) {
                throw new Error('ADD_VERIFIED_PERSONS')
            }
        } else {
            throw new Error('ADD_VERIFIED_AND_EXISTING_PERSONS')
        }
    }

    /**
   *
   * @param {Number} personId id of the person against whom we are adding/updating the agreement
   * @param {Object<{locationId: Number, type: Number, needType: Number, saleTypeId: Number, persons: Array}} reqBody
   * @param {*} transaction
   */
    static async validateAgreementReqBody (personId, reqBody, agreementRoles, transaction) {
        const VerifiedPersonController = require('../personController/verifiedPersonController')
        let verifiedPersonController
        if (reqBody.apiType && reqBody.apiType === 'quotation') {
            verifiedPersonController = new VerifiedPersonController()
        } else {
            verifiedPersonController = new VerifiedPersonController(personId)
        }

        // Removed Arrangement Validation before creating Agreement for user story CCS-6323
        /* const arrangement = await verifiedPersonController.getArrangement(
            transaction
        )
        if (!arrangement) {
            throw new Error('ARRANGEMENT_NOT_FOUND')
        } */

        let person
        // validate type and needType
        if (reqBody.apiType === 'quotation') {
            // NEED_TYPES
            // const needTypeArray = [this.NEED_TYPES['PN'], this.NEED_TYPES['AN']];
            if (Object.values(this.NEED_TYPES).indexOf(reqBody.needType) === -1) {
                throw new Error('INVALID_NEED_TYPE')
            } else if (reqBody.needType !== this.NEED_TYPES['PN']) {
                throw new Error('INVALID_NEED_TYPE')
            }
        } else {
            const personController = new PersonController(personId)
            person = await personController.getDetails(transaction)
            reqBody.personDetails = person
            switch (person.isAlive) {
                case true:
                    if (reqBody.needType !== this.NEED_TYPES['PN']) {
                        throw new Error('INVALID_NEED_TYPE')
                    }
                break
                case false:
                    if (reqBody.needType !== this.NEED_TYPES['AN']) {
                        throw new Error('INVALID_NEED_TYPE')
                    }
                    break
                default:
                    break
            }
        }

        // validate locationIds
        await validateLocationIds(reqBody.locationId, transaction)

        if (
            reqBody.type !== this.TYPES['Funeral'] &&
            reqBody.type !== this.TYPES['Cemetry']
        ) {
            throw new Error('INVALID_TYPE')
        }
        // validate saleType based on type and persons involved
        let needType
        if (!reqBody.apiType && reqBody.type === this.TYPES['Funeral']) {
            needType = !person.isAlive ? this.NEED_TYPES['AN'] : this.NEED_TYPES['PN']
        } else if (!reqBody.apiType && reqBody.type === this.TYPES['Cemetry']) {
            if (person.isAlive) {
                const beneficiaries = _.filter(reqBody.persons, person => person.agreementRoleId === agreementRoles['Beneficiary']).map(person => person.personId)
                const beneficiariesData = await this._fetchThePersonsDetails({ id: beneficiaries }, transaction)
                const deadPersons = beneficiariesData.filter(beneficiary => !beneficiary.isAlive)
                if (deadPersons.length) {
                    needType = this.NEED_TYPES['AN']
                } else {
                    needType = this.NEED_TYPES['PN']
                }
            } else {
                needType = this.NEED_TYPES['AN']
            }
        } else if (reqBody.apiType && reqBody.apiType === 'quotation') {
            needType = this.NEED_TYPES['PN']
        }
        if (reqBody.saleTypeId) {
            const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(
                reqBody.type,
                needType,
                transaction
            )
            const saleTypeIds = saleTypes.map(saleType => saleType.id)
            if (!saleTypeIds.includes(reqBody.saleTypeId)) {
                throw new Error('INVALID_SALE_TYPE_ID')
            }
        }
    }

    /**
   *
   * @param {Number} personId id of the person against whom we are adding/updating the agreement
   * @param {Object<{locationId: Number, type: Number, needType: Number, saleTypeId: Number, persons: Array}} reqBody
   * @param {Number} userId currently loggedIn user id
   * @param {Number} quotationId id of the quotation validating agreement in the table before creating
   */
    static async createOrEditAgreement (personId, reqBody, userId, quotationId) {
        let transaction
        let agreementRoles

        try {
            let agreement
            let agreementPersons
            let quotation
            transaction = await models.sequelize.transaction()
            agreementRoles = await getAgreementRoles('map', transaction)
            if (!reqBody.apiType) {
                agreementPersons = _.filter(reqBody.persons, person => !person.isDeleted)
                reqBody.persons = agreementPersons
            }
            // Note: added check condtions and defalut values for sales app
            if (!reqBody.locationId && reqBody.apiType && reqBody.apiType === 'quotation') {
                reqBody.locationId = 2
            }
            // validating quotation agreement details already exist or not before create agreement
            if (reqBody.apiType === 'quotation') {
                quotation = await models.Quotation.findOne({
                    where: {
                        id: quotationId
                    }
                })
                if (!quotation) {
                    throw new Error('QUOTATION_NOT_FOUND')
                }
                if (quotation.funeralAgreementId && reqBody.type === this.TYPES['Funeral']) {
                    throw new Error('DUPLICATE_FUNERAL_AGREEMENT_FOR_QUOTATION')
                }
                if (quotation.cemeteryAgreementId && reqBody.type === this.TYPES['Cemetry']) {
                    throw new Error('DUPLICATE_CEMETERY_AGREEMENT_FOR_QUOTATION')
                }
            }
            await this.validateAgreementReqBody(personId, reqBody, agreementRoles, transaction)

            if (!reqBody.apiType) {
                await this._validateAgreementPersons(reqBody, agreementRoles, transaction)
            }

            if (!reqBody.apiType && reqBody.type === this.TYPES['Funeral']) {
                const existingStatements = await this.getListOfAgreements(personId, this.TYPES['Funeral'], transaction)
                if (existingStatements.length) {
                    const anStatements = existingStatements.filter(statement => statement.needType === this.NEED_TYPES['AN'] && statement.status !== 'Voided')
                    const pnStatements = existingStatements.filter(statement => statement.needType === this.NEED_TYPES['PN'] && statement.status !== 'Voided')
                    if (reqBody.needType === this.NEED_TYPES['AN'] && anStatements.length) {
                        throw new Error('ONLY_ONE_STATEMENT_IS_ALLOWED')
                    }
                    if (reqBody.needType === this.NEED_TYPES['PN'] && pnStatements.length) {
                        throw new Error('ONLY_ONE_STATEMENT_IS_ALLOWED')
                    }
                }
            }
            agreement = await upsert('Agreement', reqBody, transaction, {
                userId
            })
            // Note : updating user if its created from one portal and we using in sales app
            if (reqBody.apiType === 'App' && personId && reqBody.personDetails && !reqBody.personDetails.createdAtApp) {
                reqBody.personDetails.createdAtapp = true
                await PersonController.createOrUpdate(reqBody.personDetails, {}, {}, transaction)
            }
            if (!reqBody.apiType) {
                // checking if atleast one beneficiary is there
                const beneficiaries = reqBody.persons.filter(person => !person.isDeleted && person.agreementRoleId === agreementRoles['Beneficiary'])
                if (beneficiaries.length === 0) {
                    throw new Error('AT_LEAST_ONE_BENEFICIARY_NEED_TO_BE_THERE')
                }
                agreementPersons.forEach(person => {
                    if (person.personId === personId && person.agreementRoleId === agreementRoles['Beneficiary']) {
                        person.isOwner = true
                    }
                    person.roleId = person.agreementRoleId
                    person.agreementId = agreement.id
                })
                await models.AgreementPerson.bulkCreate(
                    agreementPersons,
                    {
                        transaction
                    }
                )
            }
            await transaction.commit()
            // updating quotation details based on type
            if (reqBody.apiType && reqBody.apiType === 'quotation' && quotationId) {
                let reqBodyQuotation = {
                    id: quotationId
                }
                if (reqBody.type === this.TYPES['Funeral']) {
                    reqBodyQuotation.funeralAgreementId = agreement.id
                } else if (reqBody.type === this.TYPES['Cemetry']) {
                    reqBodyQuotation.cemeteryAgreementId = agreement.id
                }
                // if quotation has person added then adding Agreement Person details
                if (quotation.personId) {
                    const buildPerson = (roleId, personId, agreementId, isOwner = false) => { return { roleId, personId, agreementId, isOwner } }
                    let persons = []
                    persons.push(buildPerson(agreementRoles['Beneficiary'], quotation.personId, agreement.id, true))
                    persons.push(buildPerson(agreementRoles['Purchaser'], quotation.personId, agreement.id))
                    await models.AgreementPerson.bulkCreate(persons)
                }
                await QuotationController.upsertQuotation(reqBodyQuotation)
            }
            if (!reqBody.apiType && (reqBody.type === this.TYPES['Funeral'] || reqBody.type === this.TYPES['Cemetry'])) {
                // sending data to webcem
                const person = await models.Person.findOne({
                    where: { id: personId },
                    attributes: ['isAlive']
                })
                if (!person.isAlive) {
                    const { queueNames, queues } = require('../../../appQueues')
                    const webCemQueue = queues[queueNames.webCemQueue]
                    const webCemData = {
                        event: 'decedent.save',
                        payload: {
                            triggerPoint: 'Agreement',
                            agreementId: agreement.id,
                            userId: userId
                        }
                    }
                    webCemQueue.add('webCemQueue', webCemData)
                }
            }

            return agreement
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }

    async editAgreement (personId, reqBody, userId) {
        let transaction, agreementRoles
        try {
            transaction = await models.sequelize.transaction()
            agreementRoles = await getAgreementRoles('map', transaction)
            const agreementDetails = await this.getAgreementDetails(transaction)
            if (reqBody.locationId && agreementDetails.locationId !== reqBody.locationId && !agreementDetails.contractNumber) {
                reqBody.totalPrice = 0
                reqBody.totalTax = 0
                reqBody.totalPurchasePrice = 0
                reqBody.totalAdjustment = 0
                reqBody.totalCashPrice = 0
                reqBody.totalPaid = 0
                reqBody.due = 0
                await this.constructor.removeItemsOfAgreement(reqBody.id, userId, transaction)
            }

            if (reqBody.persons && reqBody.persons.length) {
                // checking if atleast one beneficiary is there
                const beneficiaries = reqBody.persons.filter(person => !person.isDeleted && person.agreementRoleId === agreementRoles['Beneficiary'])
                if (beneficiaries.length === 0) {
                    throw new Error('AT_LEAST_ONE_BENEFICIARY_NEED_TO_BE_THERE')
                }
                // deleting the agreementPersons
                const personsToDelete = _.remove(reqBody.persons, person => {
                    if (person.isDeleted && person.personId === personId && reqBody.type === this.constructor.TYPES['Funeral'] && person.agreementRoleId === agreementRoles['Beneficiary']) {
                        throw new Error('BENEFICIARY_CANNOT_BE_DELETED')
                    }
                    return person.isDeleted
                })
                if (personsToDelete.length) {
                    await this._deleteAgreementPersons(personsToDelete, userId, transaction)
                }
            }
            await this.constructor.validateAgreementReqBody(personId, reqBody, agreementRoles, transaction)
            if (reqBody.persons && reqBody.persons.length) {
                await this.constructor._validateAgreementPersons(reqBody, agreementRoles, transaction)
                const toUpdatePersons = _.remove(reqBody.persons, person => {
                    return !person.isDeleted && person.id
                })
                if (toUpdatePersons.length) {
                    // updating the agreementPersons
                    await this._updatingAgreementPersons(toUpdatePersons, transaction)
                }
                if (reqBody.persons && reqBody.persons.length > 0) {
                    await this._insertingNewAgreementPersons(
                        reqBody,
                        agreementRoles,
                        transaction
                    )
                }
            }

            const cancelAgreement = agreementDetails.type === 2 ? true : agreementDetails.needType === 2
            if (reqBody.isCancelled === true && cancelAgreement) {
                const AgreementItemController = require('./agreementItemController')
                const agreementItemController = new AgreementItemController(this.agreementId)
                const usedItems = await agreementItemController.fetchItemUsageItems(transaction)
                if (usedItems.length === 0) {
                    reqBody.status = 'Cancelled'
                } else {
                    throw new Error('CANNOT CANCEL AGREEMENT')
                }
            }
            const agreement = await upsert('Agreement', reqBody, transaction, {
                userId
            })
            await transaction.commit()
            if (!reqBody.apiType && (reqBody.type === this.constructor.TYPES['Funeral'] || reqBody.type === this.constructor.TYPES['Cemetry'])) {
                const person = await models.Person.findOne({
                    where: { id: personId },
                    attributes: ['isAlive']
                })
                // sending data to webcem
                if (!person.isAlive) {
                    const { queueNames, queues } = require('../../../appQueues')
                    const webCemQueue = queues[queueNames.webCemQueue]
                    const webCemData = {
                        event: 'decedent.save',
                        payload: {
                            triggerPoint: 'Agreement',
                            agreementId: agreement.id,
                            userId: userId
                        }
                    }
                    webCemQueue.add('webCemQueue', webCemData)
                }
            }
            return agreement
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }

    async _deleteAgreementPersons (personsToDelete, userId, transaction) {
        const deletePromise = personsToDelete.map(async person => {
            // Fetching Agreement Location Items
            const ali = await models.AgreementLocationItem.findAll({
                where: {
                    agreementId: this.agreementId,
                    deletedAt: null,
                    deletedBy: null
                },
                transaction
            })
            // Fetching Agreement Memorial Items
            const ami = await models.AgreementMemorialItem.scope(
                'notDeleted'
            ).findAll({
                include: [
                    {
                        model: models.AgreementMemorial,
                        as: 'agreementMemorial',
                        where: { agreementId: this.agreementId }
                    }
                ],
                transaction
            })
            // Checking if there are any Services/Merchandises/Memorials that are Selected/Used by this person
            const itemUsage = await models.ItemUsage.findAll({
                where: {
                    [Op.and]: [{
                        personId: person.personId,
                        deletedAt: null,
                        deletedBy: null,
                        [Op.or]: [
                            {
                                resourceType: 'AgreementMemorialItem',
                                resourceId: { [Op.in]: ami.map(e => e.id) }
                            },
                            {
                                resourceType: 'AgreementLocationItem',
                                resourceId: { [Op.in]: ali.map(e => e.id) }
                            }
                        ]
                    }]
                },
                transaction
            })
            if (itemUsage.length) {
                throw new Error('BENEFICIARY_CANNOT_BE_REPLACED')
            } else {
                return models.AgreementPerson.update(
                    {
                        deletedBy: userId,
                        deletedAt: moment().format('MM/DD/YYYY'),
                        deletedInAddendumId: _.get(person, 'deletedInAddendumId', null)
                    },
                    {
                        where: {
                            agreementId: this.agreementId,
                            personId: person.personId,
                            roleId: person.agreementRoleId
                        },
                        transaction
                    }
                )
            }
        })
        await Promise.all(deletePromise)
    }

    /**
   * @param {Number} personId id of the person against whom we are adding/updating the agreement
   * @param {Object<{locationId: Number, type: Number, needType: Number, saleTypeId: Number, persons: Array}} reqBody
   * @param {Object<{key: String, value: Number}>} agreementRoles
   * @param { Number} agreementId id of the agreement created/updated for the person(personId)
   * @param {*} transaction
   */
    async _insertingNewAgreementPersons (
        reqBody,
        agreementRoles,
        transaction
    ) {
        let agreementPersonReqBody = []
        if (reqBody.type === this.constructor.TYPES['Funeral']) {
            const filteredPersons = reqBody.persons.filter(person => person.agreementRoleId !== agreementRoles['Beneficiary'])
            if (filteredPersons.length) {
                agreementPersonReqBody = filteredPersons.map(person => {
                    return {
                        ...person,
                        roleId: person.agreementRoleId,
                        agreementId: this.agreementId
                    }
                })
            }
        }
        if (reqBody.type === this.constructor.TYPES['Cemetry']) {
            // const agreementPropertyDetails = await AgreementPropertyController.getIntermentAndAdditionalRights(this.agreementId, transaction)
            // if (Object.keys(agreementPropertyDetails).length) {
            //     const beneficiaries = reqBody.persons.filter(person => person.agreementRoleId === agreementRoles['Beneficiary'])
            //     if (beneficiaries.length !== _.get(agreementPropertyDetails, 'defaultRights')) {
            //         throw new Error('BENEFICIARIES_MORE_THAN_INTERMENT_RIGHTS_CAN_NOT_BE_ADDED')
            //     }
            // } else {
            //     throw new Error('PLEASE_SELECT_A_PROPERTY')
            // }

            // commenting the above code for CCS-8028

            agreementPersonReqBody = reqBody.persons.map(person => {
                return {
                    ...person,
                    roleId: person.agreementRoleId,
                    agreementId: this.agreementId
                }
            })
        }
        if (agreementPersonReqBody.length) {
            await models.AgreementPerson.bulkCreate(agreementPersonReqBody, {
                transaction
            })
        }
    }

    async _updatingAgreementPersons (toUpdatePersons, transaction) {
        toUpdatePersons.forEach(person => {
            person.roleId = person.agreementRoleId
        })
        const updatePromise = toUpdatePersons.map(person => {
            return models.AgreementPerson.update(
                {
                    relationId: person.relationId
                },
                {
                    where: {
                        id: person.id,
                        agreementId: this.agreementId,
                        personId: person.personId
                    },
                    transaction
                }
            )
        })
        await Promise.all(updatePromise)
    }

    /**
   *
   * @param {Number} agreementId id of the agreement for which the items should be removed
   * @param {Number} userId id of the currently loggedIn user
   * @param {*} transaction
   */
    static async removeItemsOfAgreement (agreementId, userId, transaction) {
        await models.AgreementLocationItem.update(
            {
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                deletedBy: userId
            },
            {
                where: {
                    agreementId
                },
                transaction
            }
        )
        await models.AgreementPackage.update(
            {
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                deletedBy: userId
            },
            {
                where: {
                    agreementId
                },
                transaction
            }
        )
        await models.AgreementProperty.update(
            {
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                deletedBy: userId
            },
            {
                where: {
                    agreementId
                },
                transaction
            }
        )
        await models.AgreementCashAdvancedItem.update(
            {
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                deletedBy: userId
            },
            {
                where: {
                    agreementId
                },
                transaction
            }
        )
        await models.ItemRequest.update(
            {
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                deletedBy: userId
            },
            {
                where: {
                    agreementId
                },
                transaction
            }
        )
    }
    static async getAddendumsForAgreement (agreementId) {
        const addendums = await models.Addendum.findAll({
            attributes: ['id', 'addendumNumber', 'updatedAt'],
            where: {
                agreementId: agreementId
            },
            order: [['updatedAt', 'DESC']]
        })
        return addendums
    }
    // fetching the agreement details with an id
    async getAgreementDetails (transaction, isWebCemPayload, lotSellUnitId) {
        const agreement = await models.Agreement.scope(
            'withAgreementPersons',
            'commonIncludes',
            'withAgreementFinance'
        ).findOne({
            where: {
                id: this.agreementId
            },
            transaction
        })
        if (!agreement) {
            throw new Error('AGREEMENT_NOT_FOUND')
        }
        const rightsData = await PropertyController.getIntermentAndAdditionalRights(this.agreementId, transaction)
        if (isWebCemPayload) {
            let availableRights
            let agreementPropertyController = new PropertyController(this.agreementId)
            const query = {}
            let properties = await agreementPropertyController.reviewProperties(query)
            await Promise.all(properties.map(async property => {
                if (property.lotSellUnitId === lotSellUnitId) {
                    const additionalRights = new AgreementPropertyAdditionalRight(this.agreementId, property.agreementPropertyId)
                    const existingAdditionalRights = await additionalRights.listAdditionalRights(transaction)
                    availableRights = property.maxRights - (existingAdditionalRights.length + property.rights)
                    agreement.dataValues.availableRights = availableRights
                    agreement.dataValues.defaultRights = property.rights
                    agreement.dataValues.maxRights = property.maxRights
                    agreement.dataValues.graves = property.graves
                    agreement.dataValues.totalRights = existingAdditionalRights.length + property.rights
                }
            }))
            agreement.dataValues.reservationType = rightsData.reservationType
        } else {
            agreement.dataValues.totalRights = rightsData.additionalRightsCount + rightsData.defaultRights
        }
        return agreement
    }

    /**
     * Fetching the csv for the agreements that got synced within the received date range.
     * @param {Date} req.query.startDate
     * @param {Date} req.query.endDate
     */
    static async getsyncedAgreementsReport (req, res) {
        let formattedStartDate = momentTimeZone(req.query.startDate).tz(req.query.timezone).format('YYYY-MM-DD')
        let formattedEndDate = momentTimeZone(req.query.endDate).tz(req.query.timezone).format('YYYY-MM-DD')
        try {
            const { queueNames, queues } = require('../../../appQueues')
            const syncedFuneralAgreementReportWorker = queues[queueNames.email_queue]
            const timezone = req.query.timezone
            const sendTo = req.currentUser.email || 'w@gmail.com'
            if (moment(formattedStartDate).isAfter(formattedEndDate)) {
                throw new Error('START_DATE_GREATER_THAN_END_DATE')
            }

            let dateFilterQuery = `BETWEEN :formattedStartDate AND :formattedEndDate`

            if (moment(formattedStartDate).isSame(formattedEndDate)) {
                dateFilterQuery = `= :formattedStartDate`
            }

            let newConfig = { ...bullJobRetry }
            newConfig.timeout = 600000

            syncedFuneralAgreementReportWorker.add('SyncedFuneralAgreementReport', { sendTo, formattedStartDate, formattedEndDate, dateFilterQuery, timezone }, newConfig)
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
   *
   * @param {*} transaction
   */
    async updateAgreementTotals (userId, transaction) {
        const agreementSummary = await models.Agreement.updateAndGetTotal(
            this.agreementId,
            userId,
            transaction
        )
        return agreementSummary
    }

    /**
   *
   * @param {Number} personId id of the person for whom the agreements are created
   * @param {Number} type agreement type(Funeral/Cemetry)
   */
    static async getListOfAgreements (personId, type, transaction) {
        const scope = ['withAgreementPersons',
            'commonIncludes', 'withAgreementFinance', 'agreementPropertyOwners']
        const whereConditions = {
            '$beneficiary.personId$': personId
        }
        if (Number(type)) {
            whereConditions['type'] = type
        }
        if (Number(type) === this.TYPES['Wholesale Cremation']) {
            scope.push('withOnlyPartnerDetails')
        } else if (Number(type) === this.TYPES['Miscellaneous Sales']) {
            delete whereConditions['$beneficiary.personId$']
            whereConditions[Op.or] = [
                {
                    '$beneficiary.personId$': personId
                },
                {
                    '$purchaser.personId$': personId
                }
            ]
        }

        const agreements = await models.Agreement.scope(scope).findAll({
            where: whereConditions,
            transaction
        })
        // used promise.all for all the promises in the array of agreements
        const formatedRes = await Promise.all(
            agreements.map(async agreement => {
                const agreementPropertyOwnersList = propertyOwnerList(agreement.agreementProperties)
                return {
                    id: agreement.id,
                    contractNumber: agreement.contractNumber,
                    type: agreement.type,
                    needType: agreement.needType,
                    status: agreement.status,
                    addendums: await this.getAddendumsForAgreement(agreement.id),
                    arrangedFor: agreement.beneficiary.map(element => {
                        return {
                            name: getFullNameOfPerson(_.get(element, 'person')),
                            isOwner: element.isOwner
                        }
                    }),
                    arranger: _.get(agreement, 'arranger.name'),
                    arrangerDetails: _.get(agreement, 'arranger'),
                    purchaser: getFullNameOfPerson(_.get(agreement, 'purchaser.person')),
                    purchaserDetails: _.get(agreement, 'purchaser'),
                    coPurchasers: agreement.coPurchasers.map(coPurchaser => {
                        return getFullNameOfPerson(_.get(coPurchaser, 'person'))
                    }),
                    coPurchasersDeatils: agreement.coPurchasers,
                    total: agreement.totalCashPrice,
                    payorDetails: agreement.payor,
                    propertyOwnerDetails: agreementPropertyOwnersList.propertyOwners,
                    oldPropertyOwnerDetails: agreementPropertyOwnersList.oldPropertyOwners,
                    due: agreement.due,
                    linkAgreement: agreement.linkAgreement,
                    partnerName: _.get(agreement, 'agreementPartner.partner.partnerName'),
                    financed: await returnFinancedValue(agreement)
                }
            })
        )

        return formatedRes
    }

    /**
   *
   * @param {Number} agreementId id of the agreement created against a person(personId)
   * @param {Number} personId id of the person against whom the agreement is created
   * @param {function} transaction
   */
    async checkoutAgreement (agreementId, personId, transaction) {
        const result = await updateAgreementDetails(
            agreementId,
            personId,
            transaction
        )
        return result
    }

    /** added the payment function
   *
   * @param {Object<{amount: Number, receiptNumber: String, payorId: Number, paymentType: Number, status: String }>} reqBody
   * @param {*} t
   */
    static async addPayment (reqBody, t) {
        try {
            const paymentRes = await models.Payment.create(reqBody, {
                transaction: t
            })
            if (reqBody.file) {
                await upsert('File', {
                    resourceId: paymentRes.id,
                    resourceName: 'Payment',
                    folderName: reqBody.file.folderName,
                    originalFileName: reqBody.file.originalFileName }, t)
            }
            return paymentRes
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
   * get balance amount from payments
   * @param {*} t
   */
    async getPaymentCalculations (t) {
        try {
            const agreementDeatils = await models.Agreement.findOne({
                where: {
                    id: this.agreementId
                },
                transaction: t
            })
            let paymentObj = {}
            if (agreementDeatils) {
                paymentObj.totalPaid = agreementDeatils.totalPaid
                paymentObj.balance = agreementDeatils.due
                paymentObj.totalAmount = agreementDeatils.totalPurchasePrice
            } else {
                paymentObj.totalPaid = 0
                paymentObj.balance = 0
                paymentObj.totalAmount = 0
            }
            return paymentObj
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
    /**
   * get agreement and arrangment types
   * @param {Number} resourceId is the agreementid
   * @param {*} t
   */
    static async getArrangementType (resourceId, t) {
        try {
            const agreement = await models.Agreement.findOne({
                where: {
                    id: resourceId
                },
                attributes: ['locationId', 'needType', 'saleTypeId', 'type'],
                include: [
                    {
                        model: models.Location,
                        as: 'location'
                    }
                ],
                transaction: t
            })
            let agreementInfo = {
                agreementType: Object.keys(this.TYPES)[agreement.type - 1],
                locationCode: agreement.location.code,
                locationId: agreement.location.id,
                arrangementType: Object.keys(this.NEED_TYPES)[agreement.needType - 1]
            }
            return agreementInfo
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * add payers for the stement.
   * use adding person function for this

     * @param {Object<{person: Object}>} reqBody has the basic details of the person being added as payor
     */

    async addPayor (reqBody) {
        const transaction = await models.sequelize.transaction()
        try {
            let personId = ''
            if (reqBody.person.personId) {
                const personController = new PersonController(reqBody.person.personId)
                await personController.getDetails(transaction)
                personId = reqBody.person.personId
            } else {
                reqBody.person.userId = reqBody.userId
                const person = await PersonController.createOrUpdate(
                    reqBody.person,
                    reqBody.addressPlace,
                    reqBody.birthPlace,
                    transaction
                )
                personId = person.id
            }
            const payerController = new PayerController()
            payerController.setResource(this.agreementId)
            await payerController.loadResource(transaction)
            const agreementRoles = await getAgreementRoles('map', transaction)
            const createdAgreement = await models.AgreementPerson.create(
                {
                    personId: personId,
                    agreementId: this.agreementId,
                    roleId: agreementRoles['Payor'],
                    createdBy: reqBody.userId,
                    updatedBy: reqBody.userId
                },
                {
                    transaction
                }
            )
            await transaction.commit()
            return createdAgreement
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * add payers for the stement.
   * use adding person function for this

     * @param {Object<{person: Object}>} reqBody has the basic details of the person being added as payor
     */

    async updatePayor (reqBody, userId) {
        const transaction = await models.sequelize.transaction()
        try {
            const payerController = new PayerController(reqBody.payorId)
            payerController.setResource(this.agreementId)
            await payerController.findPayor(transaction)
            const createdAgreement = await models.AgreementPerson.update(
                {
                    isActive: reqBody.active,
                    updatedBy: userId
                }, {
                    where: {
                        id: reqBody.payorId
                    },
                    transaction
                }
            )
            await transaction.commit()
            return createdAgreement
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    // fetching the the list of payors of a agreement
    async getPayors () {
        try {
            const agreementDetails = await this.getAgreementDetails()
            if (agreementDetails.type === this.constructor.TYPES['Wholesale Cremation']) {
                return await WholeSaleCremationController.getPayors(this.agreementId)
            }
            const payerController = new PayerController()
            payerController.setResource(this.agreementId)
            await payerController.loadResource()
            const payorRole = await models.AgreementRole.findOne({
                where: {
                    name: 'Payor'
                }
            })
            let agreementPersons = await models.AgreementPerson.findAll({
                include: [
                    {
                        model: models.Person.scope('withPlace', 'withVerificationDetails'),
                        as: 'person'
                    },
                    {
                        model: models.Payment,
                        as: 'payment',
                        required: false
                    }
                ],
                where: {
                    agreementId: this.agreementId,
                    roleId: payorRole.id
                }
            })
            agreementPersons.map(payors => {
                if (payors.payment && payors.payment.length) {
                    payors.dataValues['hasPreviousPayments'] = false

                    payors.dataValues['totalPaid'] = payors.payment.reduce(
                        (amount, payment) => {
                            if (payment.status === 'success') {
                                payors.dataValues['hasPreviousPayments'] = true
                                amount = amount + payment.amount
                            }
                            return amount
                        },
                        0
                    )
                } else {
                    payors.dataValues['totalPaid'] = 0
                    payors.dataValues['hasPreviousPayments'] = false
                }
                // delete payors.dataValues['payment']
            })
            return agreementPersons
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
   *
   * @param {Number} payorId id of the payor to be deleted
   */
    async deletePayor (payorId) {
        try {
            const payerController = new PayerController()
            payerController.setResource(this.agreementId)
            await payerController.loadResource()
            const agreementPersons = await models.AgreementPerson.destroy({
                where: { id: payorId }
            })
            return agreementPersons
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
    /**
   * convert the agreement status to complete
   * (this method is only for dev integration)
   */
    async markAgreementComplete (transaction) {
        const result = await models.Agreement.update(
            {
                status: 'Submitted'
            },
            { where: { id: this.agreementId }, transaction }
        )
        return result
    }

    /**
     * This method return a boolean depending on the percentage of the downpayment paid. It returns true if greater than the received percentage else false
     * @param {number} receivedPercentage
     * @param {*} transaction
     */
    async downPaymentPercentageCheck (receivedPercentage, transaction) {
        try {
            let percentage = null
            let downPaymentDetails = null
            let agreementStatusCheckQuery = `
                    SELECT status, totalCashPrice, totalPaid
                    FROM Agreement
                    WHERE Agreement.id =:agreementId
                `
            let agreementStatusCheck = await models.sequelize.query(agreementStatusCheckQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                },
                transaction
            })
            let agreementStatus = _.get(agreementStatusCheck, '[0].status')
            let agreementTotalCashPrice = _.get(agreementStatusCheck, '[0].totalCashPrice', 0)
            let agreementTotalPaidPrice = _.get(agreementStatusCheck, '[0].totalPaid', 0)
            let previousFinanceDownPaymentAmount = 0
            if (agreementStatus !== 'Cancelled' && agreementTotalCashPrice > 0) {
                if (receivedPercentage === 'agreementFinanceDownPaymentPercentageCheck') {
                    // Note: Current finance record will have it's active flag, as well as it's recent flag as 1
                    let agreementFinanceDownPaymentPercentageQuery = `
                        SELECT (AgreementFinance.downPaymentAmount - AgreementFinance.ppifAmount) AS downPaymentAmount
                        FROM AgreementFinance
                        WHERE AgreementFinance.agreementId =:agreementId
                        AND AgreementFinance.isActive = 1
                        AND AgreementFinance.isRecent = 1
                        AND AgreementFinance.financeType IN ('Finance')
                    `
                    let agreementFinanceDownPaymentPercentage = await models.sequelize.query(agreementFinanceDownPaymentPercentageQuery, {
                        type: models.sequelize.QueryTypes.SELECT,
                        replacements: {
                            agreementId: this.agreementId
                        },
                        transaction
                    })
                    // Note: Previous agreement finance records of the agreement will have it's isActive flag as 1 and isRecent flag as 0.
                    let previousFinanceDownPaymentDetailsQuery = `
                        SELECT (SUM(AgreementFinance.downPaymentAmount) - SUM(AgreementFinance.ppifAmount)) AS previousFinanceDownPayment
                        FROM AgreementFinance
                        WHERE AgreementFinance.agreementId =:agreementId
                        AND AgreementFinance.isActive = 1
                        AND AgreementFinance.isRecent = 0`
                    let previousFinanceDownPaymentDetails = await models.sequelize.query(previousFinanceDownPaymentDetailsQuery, {
                        type: models.sequelize.QueryTypes.SELECT,
                        replacements: {
                            agreementId: this.agreementId
                        },
                        transaction
                    })
                    previousFinanceDownPaymentAmount = _.get(previousFinanceDownPaymentDetails, '[0].previousFinanceDownPayment', 0)
                    percentage = agreementFinanceDownPaymentPercentage[0].downPaymentAmount
                } else {
                    percentage = receivedPercentage
                }

                downPaymentDetails = ((agreementTotalPaidPrice / agreementTotalCashPrice) * 100)

                if (receivedPercentage === 'agreementFinanceDownPaymentPercentageCheck') {
                    downPaymentDetails = agreementTotalPaidPrice - previousFinanceDownPaymentAmount
                }
            }
            return typeof (downPaymentDetails) === 'number' ? downPaymentDetails.toFixed(2) >= percentage : true
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on the count of finance entry for an agreement
     * @param {*} transaction
     */
    async agreementFinanceCheck (transaction) {
        try {
            let agreementFinanceCheckQuery = `
                SELECT COUNT(AgreementFinance.id) AS agreementFinanceCount
                FROM Agreement
                INNER JOIN AgreementFinance ON  AgreementFinance.agreementId = Agreement.id
                WHERE Agreement.id =:agreementId AND AgreementFinance.isActive = 1 AND AgreementFinance.isRecent = 1
            `
            let agreementFinanceDetails = await models.sequelize.query(agreementFinanceCheckQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                },
                transaction
            })

            return agreementFinanceDetails.length ? agreementFinanceDetails[0].agreementFinanceCount > 0 : null
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
    /**
     * This method return a boolean depending on the count of all finance type entry for an agreement
     * @param {*} transaction
     */
    async agreementAllFinanceCheck (transaction) {
        try {
            let agreementFinanceCheckQuery = `
                SELECT COUNT(AgreementFinance.id) AS agreementFinanceCount
                FROM Agreement
                INNER JOIN AgreementFinance ON  AgreementFinance.agreementId = Agreement.id
                WHERE Agreement.id =:agreementId AND AgreementFinance.isActive = 1 AND AgreementFinance.isRecent=1 AND AgreementFinance.financeType IN ('Finance','Special-equal','Special-unequal','Refinance')
            `
            let agreementFinanceDetails = await models.sequelize.query(agreementFinanceCheckQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                },
                transaction
            })

            return agreementFinanceDetails.length ? agreementFinanceDetails[0].agreementFinanceCount > 0 : null
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on the count of all finance type entry for an agreement
     * @param {*} transaction
     */

    getPaymentsForAgereement () {
        return models.Payment.count({
            where: {
                resourceId: this.agreementId,
                status: 'success'
            }
        })
    }
    async voidAgreement (user) {
        try {
            const result = await models.sequelize.transaction(async (transaction) => {
                // find if the agreement status, needType and type
                const agreementData = await models.Agreement.findOne({
                    where: {
                        id: this.agreementId
                    },
                    include: [
                        {
                            model: models.SaleType,
                            as: 'saleType',
                            required: false
                        },
                        {
                            model: models.AgreementPerson,
                            attributes: ['id', 'roleId', 'personId'],
                            as: 'beneficiary'
                        }
                    ],
                    transaction
                })
                if (!agreementData) {
                    throw new Error('AGREEMENT_NOT_FOUND')
                }
                // if status is not in-progress then throw an error that the agreement can not be voided
                if (_.get(agreementData, 'status') !== 'In progress') {
                    throw new Error('AGREEMENT_CAN_NOT_BE_VOIDED')
                }
                // fetching active payments of agreement
                const activePayments = await models.Payment.findAll({
                    where: {
                        resourceId: this.agreementId,
                        status: 'success'
                    },
                    transaction
                })
                // if there are any active payments are there for the agreement then should not allow voiding the agreement
                if (activePayments.length) {
                    throw new Error('AGREEMENT_CAN_NOT_BE_VOIDED_DUE_TO_ACTIVE_PAYMENTS')
                }

                // if there are work orders created then should not void the agreement
                const agreementPersons = agreementData.beneficiary.map(person => person.personId)
                const workOrders = await this._getWorkOrdersForTheAgreement(agreementData.type, agreementData.id, agreementPersons, transaction)
                if (workOrders.length) {
                    throw new Error('AGREEMENT_CAN_NOT_BE_VOIDED_DUE_TO_SERVICE_SCHEDULED')
                }
                // if the agreement type is cemetery then release the properties added for the contract if selected
                if (AgreementController.TYPES['Cemetry'] === agreementData.type) {
                    const agreementProperties = await models.AgreementProperty.findAll({
                        where: {
                            deletedAt: null,
                            deletedBy: null,
                            agreementId: this.agreementId,
                            reservationStatus: [
                                'reserved',
                                'confirmed'
                            ]
                        },
                        transaction
                    })
                    if (agreementProperties.length) {
                        await Promise.all(
                            agreementProperties.map(agmtProperty => {
                                const propertyController = new PropertyController(this.agreementId)
                                return propertyController._releasePropertyMainFunctionality(agmtProperty, agreementData, agmtProperty.propertyId, user, transaction)
                            })
                        )
                    }
                }

                // if there are no payments made and the status is in-progress then void the agreement
                await upsert('Agreement', { id: this.agreementId, status: 'Voided' }, transaction)
                return agreementData
            })
            return result
        } catch (error) {
            throw error
        }
    }
    async _getWorkOrdersForTheAgreement (agreementType, agreementId, personIds, transaction) {
        const agreementTypeValues = AgreementController.TYPES
        const agmtType = Object.keys(agreementTypeValues).find(key => agreementTypeValues[key] === agreementType)
        let workOrderList = []
        if (agmtType === 'Funeral') {
            const query = `SELECT wo.id
            FROM WorkOrder AS wo
            INNER JOIN ScheduledFuneralService as sfs ON (sfs.id = wo.resourceId AND wo.resourceType = 'ScheduledFuneralService')
            LEFT JOIN AgreementCashAdvancedItem as acai ON acai.id = sfs.agreementCashAdvancedItemId
            LEFT JOIN AgreementLocationItem as ali ON ali.id = sfs.agreementLocationItemId
            INNER JOIN Agreement as agreement ON agreement.id = COALESCE(ali.agreementId, acai.agreementId) WHERE agreement.id = ${agreementId}
            AND sfs.personId IN (select value from STRING_SPLIT('${personIds}', ',')) AND sfs.deletedAt IS NULL AND wo.deletedAt IS NULL`
            workOrderList = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
        } else if (agmtType === 'Cemetry') {
            const query = `SELECT wo.id FROM WorkOrder wo
            INNER JOIN ScheduledCemeteryService as scs ON (scs.id = wo.resourceId AND wo.resourceType = 'ScheduledCemeteryService')
            INNER JOIN ItemUsage as iu ON iu.id IN (scs.itemUsageId)
            INNER JOIN AgreementLocationItem as ali ON ali.id = iu.resourceId
            INNER JOIN Agreement as agreement ON agreement.id = ali.agreementId WHERE agreement.id = ${agreementId}
            AND scs.personId IN (select value from STRING_SPLIT('${personIds}', ',')) AND scs.deletedAt IS NULL AND wo.deletedAt IS NULL AND iu.deletedAt IS NULL`
            workOrderList = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
        }
        return workOrderList
    }
    /**
     * get an Open Cases list of the Agreements
     *  * @param {*} queryObj is the object of all the queries done for fetching the Decedent List
     *  @param {Number} status to filter Agreements based on status of the agreement. ex: In Progress, submitted
     * @param {Number} limit number of records to fetch
     * @param {Number} page the page number to fetch data
     * @param {Number} statementNumber to filter Agreements based on statement Numbers
     * @param {Date} callDateFrom to filter Agreements based on call creation date from
     * @param {Date} callDateTo to filter Agreements based on call creation date to
     * @param {Date} caseDateFrom to filter Agreements based on case creation date from
     * @param {Date} caseDateTo to filter Agreements based on case creation date to
     * @param {Number} locationId to filter Agreements based on locations
     * @param {string} type get the Agreements list based on the type
     * @param {string} name get the Agreements list based on the decdent / beneficiary name
     * @param {string} arranger get the Agreements list based on the arranger Id
     * @param {string} itemAdded get the Agreements list based on the Items Added (Y/N)
     * @param {string} schedulingStarted get the Agreements list based on the Schadule Started (Y/N)
     * @param {string} openWorkOrders get the Agreements list based on the Open Wordk Orders (Y/N)
     * @param {string} sortOrder get the calls list based on the first modified or last modified
     * @param {*} timezone is the timezone of the end user accessing this API
     * @param {Boolean} exp boolean to define if the result is exporting or not
     * @returns array - list of the Agreemetns
     */

    async getListOfOpenCases (queryObj, exp = false) {
        try {
            let listQuery = await this.queryObjForOpenCases(queryObj)
            if (exp) queryObj.page = 1
            const offset = (queryObj.page - 1) * queryObj.limit
            const sortOrder = queryObj.sortOrder || 'desc'
            const orderByQuery = `ORDER BY [a].[updatedAt] ${sortOrder}`

            const tempTable = `DECLARE @OpenCasesTemp TABLE(
                id int,
                agreementId int,
                statusId int,
                ssBeginningTime date,
                iisBeginningTime date,
                disBeginningTime date
            );
            Insert @OpenCasesTemp
            SELECT wo.id AS id, agreement.id AS agreementId,  wo.statusId, ss.beginningTime , iis.beginningTime, dis.beginningTime
            FROM WorkOrder AS wo
                LEFT JOIN ScheduledFuneralService as sfs ON (sfs.id = wo.resourceId AND wo.resourceType = 'ScheduledFuneralService')
                LEFT JOIN ScheduledCemeteryService as scs ON (scs.id = wo.resourceId AND wo.resourceType = 'ScheduledCemeteryService')
                LEFT JOIN SchedulingSection as ss ON ss.id = sfs.schedulingSectionId
                LEFT JOIN IntermentInformationSection iis on scs.intermentInformationSectionId=iis.id
                LEFT JOIN DisintermentInfoSection dis on scs.disintermentInfoSectionId= dis.id
                LEFT JOIN ItemUsage as iu ON iu.id IN (scs.itemUsageId)
                LEFT JOIN AgreementLocationItem as ali ON ali.id IN (sfs.agreementLocationItemId, iu.resourceId)
                LEFT JOIN AgreementPackageItem as api ON api.id = sfs.agreementPackageItemId
                LEFT JOIN AgreementCashAdvancedItem as acai ON acai.id = sfs.agreementCashAdvancedItemId
                LEFT JOIN AgreementPackage ap ON ap.id = api.agreementPackageId
                INNER JOIN Agreement as agreement ON agreement.id IN (ali.agreementId, ap.agreementId, acai.agreementId)
           WHERE wo.deletedAt IS NULL`
            let joinQuery = `
            INNER JOIN AgreementType as agt ON a.type = agt.id
            LEFT JOIN [Employee] AS [arranger] ON [arranger].[id] = [a].[arrangerId]
            LEFT JOIN [Location] AS [loc] ON [loc].[id] = [a].[locationId]
            OUTER APPLY (
                SELECT TOP 1 [decedent].[id] AS [id], [decedent].[firstName] AS [firstName], [decedent].[middleName] AS [middleName], [decedent].[lastName] AS [lastName], [decedent].[isAlive] AS [isAlive], [decedent].[id] AS [pvdId], [personVerificationDetails].[onePortalId] AS [onePortalId], [personVerificationDetails].[ssn] AS [ssn] FROM AgreementPerson agp
                LEFT JOIN [Person] AS [decedent] ON [agp].[personId] = [decedent].[id]
                LEFT JOIN [PersonVerificationDetails] AS [personVerificationDetails] ON [decedent].[id] = [personVerificationDetails].[personId]
                WHERE a.id = agp.agreementId AND agp.roleid = 3 and agp.deletedAt is null
             ) decedent
            OUTER APPLY (SELECT TOP 1 createdAt
                FROM SomeOnePassed sop WHERE sop.decedentId = decedent.id order by sop.createdAt DESC ) SomeOne
            OUTER APPLY (SELECT TOP 1 createdAt
                FROM PreArrangement pa WHERE pa.beneficiaryId = decedent.id order by pa.createdAt DESC ) PreArr
            OUTER APPLY (SELECT count(1) addedItemsCount
                FROM AgreementLocationItem alit WHERE alit.agreementId = a.id AND alit.deletedAt IS NULL ) ali
            OUTER APPLY (SELECT count(1) addedPropertyCount
                FROM AgreementProperty agp WHERE agp.agreementId = a.id AND agp.deletedAt IS NULL ) ap
            OUTER APPLY (SELECT count(1) addedPackageCount
                FROM AgreementPackage apa WHERE apa.agreementId = a.id AND apa.deletedAt IS NULL ) apa
            OUTER APPLY (SELECT count(1) addedCashAdvanceCount
                FROM AgreementCashAdvancedItem acai WHERE acai.agreementId = a.id AND acai.deletedAt IS NULL ) acai
             LEFT OUTER JOIN WorkOrder AS woComplete ON woComplete.id = (
                 SELECT TOP 1  wo.id as id
                    FROM @OpenCasesTemp AS wo
                WHERE wo.statusId != 3 and wo.agreementId = a.id
               ORDER BY  COALESCE(ssBeginningTime , iisBeginningTime, disBeginningTime) desc
            )
            OUTER APPLY (
                SELECT ss.beginningTime as beginningTime, ScheduledFuneralService.createdAt as createdAt FROM ScheduledFuneralService
                LEFT JOIN SchedulingSection as ss ON (ss.id = ScheduledFuneralService.schedulingSectionId  AND woComplete.resourceType = 'ScheduledFuneralService')
                WHERE ScheduledFuneralService.id = woComplete.resourceId
            ) sfs
            OUTER APPLY (
                SELECT iis.beginningTime as iisbeginingTime, dis.beginningTime as disbeginingTime, ScheduledCemeteryService.createdAt as createdAt  FROM ScheduledCemeteryService
                LEFT JOIN IntermentInformationSection iis on (ScheduledCemeteryService.intermentInformationSectionId=iis.id AND woComplete.resourceType = 'ScheduledCemeteryService' )
                LEFT JOIN DisintermentInfoSection dis on (ScheduledCemeteryService.disintermentInfoSectionId= dis.id AND woComplete.resourceType = 'ScheduledCemeteryService' )
                WHERE ScheduledCemeteryService.id = woComplete.resourceId
            ) scs
            LEFT JOIN
            ( SELECT wo.agreementId, count(*) workOrders
                FROM @OpenCasesTemp AS wo
                  GROUP BY wo.agreementId) as allWo ON allWo.agreementId = a.id
            LEFT JOIN
            ( SELECT  wo.agreementId, count(*) openWorkOrders
                FROM @OpenCasesTemp AS wo
                WHERE wo.statusId != 3
                  GROUP BY wo.agreementId) as pendingWo ON pendingWo.agreementId = a.id
            WHERE a.type in (1,2) AND [a].[status] IN ('Submitted', 'In progress') AND (allWo.workOrders IS NULL OR pendingWo.openWorkOrders IS NOT NULL)
            ${listQuery}
            `
            let query = `${tempTable} SELECT
            (
                SELECT [a].[id] AS [id], [a].[contractNumber] AS [statementNumber], [a].[createdAt] AS [caseDate],
                CASE WHEN [agt].[agreementType] = 'Cemetry' THEN 'Cemetery'
                     ELSE [agt].[agreementType] END AS [type],
                [a].[status] AS [status],
                CASE WHEN [a].[needType] = 1 THEN 'AN'
                     WHEN [a].[needType] = 2 THEN 'PN'
                     END AS needType
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            ) AS 'statement',
            (
                SELECT [loc].[id] AS [id], [loc].[name] AS [name]
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            ) AS 'location',
            (
                SELECT [decedent].[id] AS [id], [decedent].[firstName] AS [firstName], [decedent].[middleName] AS [middleName], [decedent].[lastName] AS [lastName], [decedent].[isAlive] AS [isAlive],
                [decedent].[pvdId] AS [personVerificationDetails.id], [decedent].[onePortalId] AS [personVerificationDetails.onePortalId], [decedent].[ssn] AS [personVerificationDetails.ssn]
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            ) AS decedent,
            (
                SELECT [arranger].[id] AS [id], [arranger].[name] AS [name], [arranger].[email] AS [email]
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            ) AS arranger,
            (
                select CASE WHEN COALESCE(addedItemsCount ,addedPropertyCount, addedPackageCount) > 0 THEN 'Y'
                    ELSE 'N' END AS itemAdded,
                CASE WHEN COALESCE(sfs.beginningTime, scs.iisbeginingTime, scs.disbeginingTime, sfs.createdAt, scs.createdAt) IS NOT NULL THEN 'Y'
                     ELSE 'N' END AS schedulingStarted,
                CASE WHEN sfs.beginningTime IS NOT NULL THEN DATEDIFF(DAY, GETDATE() , sfs.beginningTime)
                     WHEN scs.iisbeginingTime IS NOT NULL THEN DATEDIFF(DAY, GETDATE() , scs.iisbeginingTime)
                     WHEN scs.disbeginingTime IS NOT NULL THEN DATEDIFF(DAY, GETDATE() , scs.disbeginingTime)
                     ELSE 0 END AS daysUntilService
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            ) AS schedulingDetails,
            IIF(pendingWo.openWorkOrders > 0, 'Y', 'N') as openWorkOrders,
            COALESCE(SomeOne.createdAt, PreArr.createdAt) as callDate
            FROM Agreement as a  ${joinQuery}`
            let listCount
            if (!exp) {
                let countQuery = `${tempTable} SELECT COUNT(DISTINCT([a].[id])) as [count] from [Agreement] as a
             ${joinQuery}`
                listCount = await models.sequelize.query(countQuery, { type: models.sequelize.QueryTypes.SELECT })
            } else {
                listCount = [{ count: 0 }]
            }
            // if (exp) query += ` ${orderByQuery} DELETE FROM @OpenCasesTemp`
            if (queryObj.page) query += ` ${orderByQuery} OFFSET ${offset} ROWS FETCH NEXT ${queryObj.limit} ROWS ONLY DELETE FROM @OpenCasesTemp`
            let list = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
            list.map(e => convertToJson(e))
            list.map(item => {
                let daysUntilService = item.schedulingDetails.daysUntilService
                if (daysUntilService === 0) {
                    item.schedulingDetails.daysUntilService = `--`
                } else if (daysUntilService < 0) {
                    item.schedulingDetails.daysUntilService = `${Math.abs(daysUntilService)} day(s) past`
                }
            })
            return {
                list,
                count: listCount[0].count
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
    async queryObjForOpenCases (queryObj) {
        let sql = ''
        Object.keys(queryObj).map((e) => {
            switch (e) {
            case 'agreementIds':
                sql += ` AND [a].[id] IN (select value from STRING_SPLIT('${queryObj.agreementIds}', ','))`
                break
            case 'statementNumber':
                sql += ` AND [a].[contractNumber] LIKE '%${queryObj.statementNumber}%'`
                break
            case 'locationId':
                sql += ` AND [loc].[id] = ${queryObj.locationId}`
                break
            case 'name':
                let words = '\'' + queryObj.name.split(' ').join('\',\'') + '\''
                sql += ` AND (decedent.firstName LIKE '%${queryObj.name}%' OR decedent.middleName LIKE '%${queryObj.name}%' OR decedent.lastName LIKE '%${queryObj.name}%' OR decedent.firstName IN (${words}) OR decedent.middleName IN (${words}) OR decedent.lastName IN (${words})) `
                break
            case 'arranger':
                sql += ` AND [arranger].[id] = ${queryObj.arranger}`
                break
            case 'status':
                sql += ` AND [a].[status] = '${queryObj.status}'`
                break
            case 'type':
                if (queryObj.type === 'Cemetery') sql += `AND [a].type = 2`
                else sql += `AND [a].type = 1`
                break
            case 'itemAdded':
                if (queryObj.itemAdded === 'Y') sql += ` AND COALESCE(addedItemsCount ,addedPropertyCount, addedPackageCount ,addedCashAdvanceCount) > 0`
                else if (queryObj.itemAdded === 'N') sql += ` AND COALESCE(addedItemsCount ,addedPropertyCount, addedPackageCount ,addedCashAdvanceCount) IS NULL`
                break
            case 'schedulingStarted':
                if (queryObj.schedulingStarted === 'Y') sql += ` AND COALESCE(sfs.beginningTime, scs.iisbeginingTime, scs.disbeginingTime, sfs.createdAt, scs.createdAt) IS NOT NULL`
                else if (queryObj.schedulingStarted === 'N') sql += ` AND COALESCE(sfs.beginningTime, scs.iisbeginingTime, scs.disbeginingTime, sfs.createdAt, scs.createdAt) IS  NULL`
                break
            case 'openWorkOrders':
                if (queryObj.openWorkOrders === 'Y') sql += ` AND pendingWo.openWorkOrders > 0`
                else if (queryObj.openWorkOrders === 'N') sql += ` AND pendingWo.openWorkOrders IS NULL`
                break
            default:
                break
            }
        })
        if (queryObj.callDateFrom && queryObj.callDateTo) {
            let startDate = moment(queryObj.callDateFrom).tz(queryObj.timezone).startOf('day').format('YYYY/MM/DD')
            let endDate = moment(queryObj.callDateTo).tz(queryObj.timezone).endOf('day').format('YYYY/MM/DD')
            sql += ` AND COALESCE(SomeOne.createdAt, PreArr.createdAt) between '${startDate}' AND '${endDate}'`
        }
        if (queryObj.caseDateFrom && queryObj.caseDateTo) {
            let startDate = moment(queryObj.caseDateFrom).tz(queryObj.timezone).startOf('day').format('YYYY/MM/DD')
            let endDate = moment(queryObj.caseDateTo).tz(queryObj.timezone).endOf('day').format('YYYY/MM/DD')
            sql += ` AND [a].[createdAt] between '${startDate}' AND '${endDate}'`
        }
        return sql
    }

    async getActiveFinance (transaction) {
        try {
            let agreementFinanceCheckQuery = `
                SELECT *
                FROM Agreement
                INNER JOIN AgreementFinance ON  AgreementFinance.agreementId = Agreement.id
                WHERE Agreement.id =:agreementId AND AgreementFinance.isActive = 1 AND AgreementFinance.isRecent=1 AND AgreementFinance.financeType IN ('Finance', 'Special-equal','Special-unequal','Refinance')
            `
            let agreementFinanceDetails = await models.sequelize.query(agreementFinanceCheckQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                },
                transaction
            })

            return agreementFinanceDetails.length ? agreementFinanceDetails : null
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    async updateRemainingInterest (financeId) {
        // do update
        try {
            const result = await models.AgreementFinance.update({
                remainingInterest: 0
            }, {
                where: {
                    id: financeId,
                    isActive: 1,
                    isRecent: 1
                }
            })
            await models.AgreementFinanceSchedule.update({
                remainingInterestToBePaid: 0
            }, {
                where: {
                    agreementFinanceId: financeId
                }
            })
            if (result && result[0] > 0) {
                return true
            } else {
                throw new Error('RECORD_NOT_FOUND')
            }
        } catch (err) {
            let errorMessage = err.message || err
            throw new Error(errorMessage)
        }
    }
}
module.exports = AgreementController
