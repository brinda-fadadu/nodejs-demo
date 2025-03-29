const logger = require('../../../lib/logger')
const { upsert } = require('../utils')
const models = require('../../../models')
const moment = require('moment')
const _ = require('lodash')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const seedValues = require('../../../config/seed')
const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../controllers/refactorControllers/personController/personController')
const { getAgreementRoles } = require('../../../controllers/refactorControllers/utils')
const { updateAgreementDetails } = require('../../../controllers/refactorControllers/agreementController/agreementUtils')
const { createQuotationNumber } = require('./quotationUtils')
const { getPriceWithDecimial } = require('../../../lib/util')

class QuotationController {
    constructor (quotationId) {
        this.quotationId = quotationId
    }
    static get TYPES () {
        let contractTypes = seedValues.seed.ContractType
        contractTypes = _.transform(contractTypes, (res, val, key) => {
            res[_.startCase(_.lowerCase(val))] = parseInt(key)
        }, {})
        return contractTypes
    }

    /**
     * Get records list from quotation table using validated query params
     * @param {object} query has cemeteryAgreementId, funeralAgreementId, limit, page
     */
    static async listOfQuotations (query) {
        try {
            const selections = `
                    [qu].*, 
                    [p].[id] AS [person.id], 
                    [p].[email] AS [person.email], 
                    [p].[firstName] AS [person.firstName], 
                    [p].[lastName] AS [person.lastName], 
                    [p].[maidenName] AS [person.maidenName], 
                    [p].[phoneNumber] AS [person.phoneNumber], 
                    [p].[dateOfBirth] AS [person.dateOfBirth],
                    [fa].[id] AS [funeralAgreement.id], 
                    [fa].[saleTypeId] AS [funeralAgreement.saleTypeId], 
                    [fa].[arrangerId] AS [funeralAgreement.arrangerId], 
                    [fa].[locationId] AS [funeralAgreement.locationId], 
                    [fa].[type] AS [funeralAgreement.type], 
                    [fa].[needType] AS [funeralAgreement.needType], 
                    [fa].[totalPurchasePrice] AS [funeralAgreement.totalPurchasePrice], 
                    [ca].[id] AS [cemeteryAgreement.id], 
                    [ca].[saleTypeId] AS [cemeteryAgreement.saleTypeId], 
                    [ca].[arrangerId] AS [cemeteryAgreement.arrangerId], 
                    [ca].[locationId] AS [cemeteryAgreement.locationId], 
                    [ca].[type] AS [cemeteryAgreement.type], 
                    [ca].[needType] AS [cemeteryAgreement.needType], 
                    [ca].[totalPurchasePrice] AS [cemeteryAgreement.totalPurchasePrice], 
                    [u].[name] AS [salesCounselor]
                `
            let filteringConditions = `
                    (
                        [qu].[deletedBy] IS NULL
                        AND [qu].[deletedAt] IS NULL
                        AND (
                        [qu].[funeralAgreementId] IS NOT NULL
                        OR [qu].[cemeteryAgreementId] IS NOT NULL
                        OR [qu].[personId] IS NOT NULL
                        )
                        AND [qu].[convertedToCase] = 0
                    )
                `
            const buildQuery = (selections, joinRequired = false) => `
                    SELECT
                    ${selections}
                    FROM 
                        [Quotation] AS [qu] 
                        ${joinRequired ? `LEFT JOIN [Person] AS [p] ON [qu].[personId] = [p].[id] 
                        LEFT JOIN [Agreement] AS [fa] ON [qu].[funeralAgreementId] = [fa].[id] 
                        LEFT JOIN [Agreement] AS [ca] ON [qu].[cemeteryAgreementId] = [ca].[id]` : ''} 
                        LEFT JOIN [User] as [u] ON [qu].[createdBy] = [u].id
                    WHERE
                    ${filteringConditions}
                `
            const [rows, count] = await Promise.all([
                models.sequelize.query(`
                    ${buildQuery(selections, true)}
                    ORDER BY 
                        [qu].[UpdatedAt] DESC
                    OFFSET 
                        ${query.page ? ((query.page - 1) * (query.limit || 10)) : 0} 
                    ROWS FETCH NEXT 
                        ${Number(query.limit || 10)} ROWS ONLY
                    `, {
                    type: models.sequelize.QueryTypes.SELECT,
                    nest: true,
                    replacements: {}
                }),
                models.sequelize.query(
                    `${buildQuery('COUNT(qu.id) AS total')}`, {
                        type: models.sequelize.QueryTypes.SELECT,
                        replacements: {}
                    })
            ])
            return {
                count: count[0].total,
                rows: rows
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
    async getQuotation () {
        try {
            let quotation = await models.Quotation.findOne({
                where: {
                    [Op.and]: [
                        {
                            id: this.quotationId
                        },
                        {
                            deletedAt: null
                        }
                    ]
                },
                include: [{
                    model: models.Person,
                    as: 'person',
                    attributes: ['email', 'firstName', 'lastName', 'maidenName', 'phoneNumber', 'dateOfBirth']
                }, {
                    model: models.Agreement,
                    as: 'funeralAgreement'
                }, {
                    model: models.Agreement,
                    as: 'cemeteryAgreement'
                }],
                distinct: true
            })
            if (!quotation) {
                throw new Error('QUOTATION_NOT_FOUND')
            }
            return quotation
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
    /**
     *
     * @param {*} data is the reqBody for the quotation along with the currentUserId
     * @param {integer} createdBy is the id of the current user who is loggedIn
     * @param {integer} cemeteryAgreementId is the id of the cemetery record
     * @param {integer} funeralAgreementId is the id of the funeral record
     */
    static async upsertQuotation (data) {
        let transaction = await models.sequelize.transaction()
        try {
            await this.validateRequestData(data)
            if (!data.id) {
                data.quotationNumber = await createQuotationNumber(transaction)
                data.expiryDate = moment().add(30, 'days').toDate()
            } else {
                // can't update convertedToCase key in update api
                delete data.convertedToCase
                let quotationDetails = await models.Quotation.findOne({
                    where: {
                        id: data.id
                    },
                    raw: true
                })
                // can't update quotation if it's already converted into cases
                if (quotationDetails.convertedToCase) {
                    throw new Error('CONVERTED_TO_CASE_CANT_UPDATE_QUOTATION')
                }
            }
            let quotation = await upsert('Quotation', data, transaction)
            await transaction.commit()
            return quotation
        } catch (err) {
            logger.error(err)
            await transaction.rollback()
            throw err
        }
    }
    /**
     *
     * @param {integer} quotationId is the reocrd id which user want to delete
     */
    async deleteQuotation (userId) {
        let transaction = await models.sequelize.transaction()
        try {
            await models.Quotation.update({
                deletedBy: userId,
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss')
            }, {
                where: { id: this.quotationId },
                transaction
            })
            await transaction.commit()
        } catch (err) {
            logger.error(err)
            await transaction.rollback()
            throw err
        }
    }

    /**
    *
    * @param {integer} quotationId preview quotation form
    */
    async previewQuotation (data, currentUser) {
        const FormsController = require('../formsController/formsController')
        try {
            let formReqData = await this.previewOrShareQuotationRequest(data)
            return await FormsController.createCaseInfoFormPreview(
                formReqData.formId,
                formReqData.personId,
                formReqData,
                currentUser
            )
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /**
    *
    * @param {integer} quotationId sharing quotation to client through email
    */
    async shareQuotation (data, currentUser) {
        const FormsController = require('../formsController/formsController')
        try {
            let formReqData = await this.previewOrShareQuotationRequest(data)
            let [draftEnvelopeform] = await FormsController.createCaseInfoFormsAndEnvelopes(
                formReqData.personId,
                formReqData,
                currentUser
            )
            await FormsController.confirmAndChangeEnvelopeStatusToSent(draftEnvelopeform.envelopeId)
            return `A new quote for $${getPriceWithDecimial(formReqData.total)} has been shared with ${formReqData.email}.`
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    async previewOrShareQuotationRequest (data) {
        const FormsController = require('../formsController/formsController')
        // validating request details
        if (data && data.emailSubject && data.emailSubject.length > 100) {
            throw new Error('CREATE_ENVELOPE_EMAIL_SUBJECT_LENGTH')
        }
        if (data && (!data.hasOwnProperty('envelopeName') || !data.hasOwnProperty('emailSubject') || !data.hasOwnProperty('emailMessage')) && (!data.envelopeName || !data.emailSubject || !data.emailMessage)) {
            throw new Error('CREATE_ENVELOPE_ENVELOPE_NAME_EMAIL_SUBJECT_MESSAGE_REQUIRED')
        }
        const addRecipient = (id, formRecipientRoleId) => { return { id, formRecipientRoleId } }
        let quotation = await models.Quotation.findOne({
            where: {
                [Op.and]: [
                    {
                        id: this.quotationId
                    },
                    {
                        deletedAt: null
                    }
                ]
            },
            include: [{
                model: models.Person,
                as: 'person',
                attributes: ['email', 'firstName', 'lastName', 'maidenName', 'phoneNumber']
            },
            {
                model: models.Agreement,
                as: 'funeralAgreement',
                required: false,
                include: {
                    model: models.AgreementPerson,
                    where: {
                        isOwner: true
                    },
                    attributes: ['isOwner', 'id', 'roleId'],
                    as: 'beneficiary',
                    required: false
                }
            }, {
                model: models.Agreement,
                as: 'cemeteryAgreement',
                required: false,
                include: {
                    model: models.AgreementPerson,
                    where: {
                        isOwner: true
                    },
                    attributes: ['isOwner', 'id', 'roleId'],
                    as: 'beneficiary',
                    required: false
                }
            }, {
                model: models.User,
                as: 'employee',
                attributes: ['email', 'name', 'id'],
                include: {
                    model: models.Employee,
                    attributes: ['name', 'email', 'id'],
                    as: 'reportingManager'
                }
            }],
            distinct: true
        })
        if (!quotation) {
            throw new Error('QUOTATION_NOT_FOUND')
        }
        if (!quotation.funeralAgreement && !quotation.cemeteryAgreement) {
            throw new Error('QUOTATION_AGREEMENT_NOT_FOUND')
        }
        if (!quotation.person) {
            throw new Error('ADD_PERSON_IN_QUOTATION')
        }
        let total = ((quotation.funeralAgreement || {}).due || 0) + ((quotation.cemeteryAgreement || {}).due || 0)
        if (!total) {
            throw new Error('ITEM_NOT_FOUND_OR_ITEM_REMOVED_FROM_AGREEMENT')
        }
        if (!quotation.expiryDate || moment().isAfter(quotation.expiryDate)) {
            throw new Error('QUOTATION_IS_EXPIRED')
        }
        let metaData = {
            timezone: data.timezone,
            envelopeName: data.envelopeName,
            emailSubject: data.emailSubject,
            emailMessage: data.emailMessage,
            brandId: data.brandId
        }
        let formReqData = {
            compositeTemplates: true,
            metaData: JSON.stringify(metaData),
            personId: quotation.personId,
            total
        }
        let formData
        let formateFormReqData = {}
        formateFormReqData.agreementPersons = []
        formateFormReqData.employees = []
        let itemType
        let employeeData = await models.Employee.findOne({
            where: {
                email: quotation.employee.email
            }
        })

        // sharing quotation form based on agreement
        if ((quotation.funeralAgreement || {}).due && (quotation.cemeteryAgreement || {}).due) {
            itemType = 'Quotation'
        } else if ((quotation.funeralAgreement || {}).due) {
            itemType = 'PN Quote - Funeral'
        } else if ((quotation.cemeteryAgreement || {}).due) {
            itemType = 'Quote - Cemetery'
            formateFormReqData.agreementId = quotation.cemeteryAgreementId
            if (quotation.employee && quotation.employee.reportingManager === null) {
                throw new Error('REPORTING_MANAGER_NOT_FOUND')
            }
        } else {
            throw new Error('ITEM_NOT_FOUND_OR_ITEM_REMOVED_FROM_AGREEMENT')
        }
        [formData] = await FormsController.getAllForms(itemType)
        if (!formData || !formData.forms || !formData.forms.length) {
            throw new Error('FORM_NOT_FOUND')
        }
        formateFormReqData.formId = formData.forms[0].id
        formateFormReqData.envelopeName = formData.forms[0].title
        formReqData.quotationId = quotation.id
        formReqData.email = (quotation.person || {}).email || ''
        formData.forms[0].formRecipientRoles.map((item) => {
            if (item.docusignRole === 'Sales Counselor' || item.docusignRole === 'FuneralAssignedTo') {
                formateFormReqData.employees.push(addRecipient(employeeData.id, item.id))
            } else if (itemType === 'PN Quote - Funeral' && item.docusignRole === 'Purchaser') {
                formateFormReqData.agreementPersons.push(addRecipient((((quotation.funeralAgreement || {}).beneficiary || [])[0] || {}).id, item.id))
            } else if (['Quote - Cemetery', 'Quotation'].includes(itemType) && item.docusignRole === 'Purchaser') {
                formateFormReqData.agreementPersons.push(addRecipient((((quotation.cemeteryAgreement || {}).beneficiary || [])[0] || {}).id, item.id))
            } else if (['Quote - Cemetery', 'Quotation'].includes(itemType) && item.docusignRole === 'Sales Manager') {
                formateFormReqData.employees.push(addRecipient(quotation.employee.reportingManager.id, item.id))
            }
        })
        formReqData.forms = [formateFormReqData]
        return formReqData
    }

    /**
    *
    * @param {integer} quotationId for converting quotation into cases
    */
    async covertToCase (userId) {
        let promise = []
        let transaction = await models.sequelize.transaction()
        try {
            let quotation = await models.Quotation.findOne({
                where: {
                    [Op.and]: [
                        {
                            id: this.quotationId
                        },
                        {
                            deletedAt: null
                        }
                    ]
                },
                transaction
            })
            if (!quotation) {
                throw new Error('QUOTATION_NOT_FOUND')
            }
            if (quotation.convertedToCase) {
                throw new Error('CONVERTED_TO_CASE')
            }
            if (!quotation.personId) {
                throw new Error('PERSON_NOT_FOUND')
            }
            if (!quotation.funeralAgreementId && !quotation.cemeteryAgreementId) {
                throw new Error('QUOTATION_AGREEMENT_NOT_FOUND')
            }
            if (!quotation.expiryDate || moment().isAfter(quotation.expiryDate)) {
                throw new Error('QUOTATION_IS_EXPIRED')
            }
            let person = await models.Person.findOne({
                where: {
                    id: quotation.personId
                }
            })
            promise.push(await new VerifiedPersonController(quotation.personId).verifyPerson(person, null, transaction))
            if (quotation.funeralAgreementId) {
                promise.push(await updateAgreementDetails(quotation.funeralAgreementId, quotation.personId, transaction))
            }
            if (quotation.cemeteryAgreementId) {
                promise.push(await updateAgreementDetails(quotation.cemeteryAgreementId, quotation.personId, transaction))
            }
            let data = await Promise.all(promise)
            quotation.set({
                convertedToCase: true,
                updatedBy: userId,
                updatedAt: moment().format('MM/DD/YYYY HH:mm:ss')
            })
            await quotation.save({ transaction })
            await transaction.commit()
            return `Quotation with quotation number # ${quotation.quotationNumber} is successfully converted into cases # ${(data[1] || {}).contractNumber || ''} ${(data[2] || {}).contractNumber ? ', # ' + (data[2] || {}).contractNumber : ''}`
        } catch (err) {
            logger.error(err)
            await transaction.rollback()
            throw err
        }
    }

    /**
    *
    * @param {integer} quotationId for add person in quotation
    */
    async addPerson (data) {
        let transaction = await models.sequelize.transaction()
        let agreementRoles = await getAgreementRoles('map')
        let persons = []
        try {
            let quotation = await models.Quotation.findOne({
                where: {
                    [Op.and]: [
                        {
                            id: this.quotationId
                        },
                        {
                            deletedAt: null
                        }
                    ]
                },
                transaction
            })
            if (!quotation) {
                throw new Error('QUOTATION_NOT_FOUND')
            }
            if (quotation.personId) {
                throw new Error('PERSON_ALREADY_ADDED_FOR_QUOTATION')
            }
            if (!quotation.funeralAgreementId && !quotation.cemeteryAgreementId) {
                throw new Error('QUOTATION_AGREEMENT_NOT_FOUND')
            }
            const createdPerson = await PersonController.createOrUpdate(data, {}, {}, transaction)
            const buildPerson = (roleId, personId, agreementId, isOwner = false) => { return { roleId, personId, agreementId, isOwner } }
            if (quotation.funeralAgreementId) {
                persons.push(buildPerson(agreementRoles['Beneficiary'], createdPerson.id, quotation.funeralAgreementId, true))
                persons.push(buildPerson(agreementRoles['Purchaser'], createdPerson.id, quotation.funeralAgreementId))
            }
            if (quotation.cemeteryAgreementId) {
                persons.push(buildPerson(agreementRoles['Beneficiary'], createdPerson.id, quotation.cemeteryAgreementId, true))
                persons.push(buildPerson(agreementRoles['Purchaser'], createdPerson.id, quotation.cemeteryAgreementId))
            }
            await models.AgreementPerson.bulkCreate(persons, { transaction })
            quotation.set({
                personId: createdPerson.id,
                updatedBy: data.userId,
                updatedAt: moment().format('MM/DD/YYYY HH:mm:ss')
            })
            await quotation.save({ transaction })
            await transaction.commit()
            quotation.dataValues.person = createdPerson
            return quotation
        } catch (err) {
            logger.error(err)
            await transaction.rollback()
            throw err
        }
    }
    /**
     *
     * @param {*} data is the reqBody for the quotation along with the currentUserId
     * @param {integer} createdBy is the id of the current user who is loggedIn
     * @param {integer} cemeteryAgreementId is the id of the cemetery record
     * @param {integer} funeralAgreementId is the id of the funeral record
     */
    static async upsertCasePerson (data) {
        let transaction = await models.sequelize.transaction()
        try {
            // updating user details
            if (data.id) {
                const verifiedPersonController = new VerifiedPersonController(data.id)
                await verifiedPersonController.setPrimaryDetails(data, data.userId)
                return await verifiedPersonController.getVerifiedPerson(transaction)
            }
            // creating new person
            const createdPerson = await PersonController.createOrUpdate(data, {}, {}, transaction)
            if (createdPerson) {
                data.id = createdPerson.id
            }
            if (_.get(data, 'personVerificationDetails')) {
                data.ssn = _.get(data, 'personVerificationDetails.ssn')
            }
            const personType = !data.isAlive ? 'decedent' : null
            const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
            await verifiedPersonController.verifyPerson(data, personType, transaction)
            const personDetails = await verifiedPersonController.getVerifiedPerson(transaction)
            await transaction.commit()
            return personDetails
        } catch (err) {
            logger.error(err)
            await transaction.rollback()
            throw err
        }
    }
    static async validateRequestData (data) {
        if (data.cemeteryAgreementId) {
            let cemeteryAgreement = await models.Agreement.count({
                where: {
                    id: data.cemeteryAgreementId,
                    type: this.TYPES['Cemetry']
                }
            })
            if (!cemeteryAgreement) {
                throw new Error('AGREEMENT_NOT_FOUND')
            }
        }
        if (data.funeralAgreementId) {
            let funeralAgreement = await models.Agreement.count({
                where: {
                    id: data.funeralAgreementId,
                    type: this.TYPES['Funeral']
                }
            })
            if (!funeralAgreement) {
                throw new Error('AGREEMENT_NOT_FOUND')
            }
        }
    }
    static async removeJunkQuotation () {
        // Deleting other than one-day-old data with empty details in quotation table
        await models.Quotation.destroy({
            where: {
                [Op.and]: [
                    {
                        funeralAgreementId: null
                    },
                    {
                        cemeteryAgreementId: null
                    },
                    {
                        personId: null
                    },
                    {
                        createdAt: {
                            [Op.lte]: moment().subtract(1, 'days').format('YYYY-MM-DD HH:mm:ss')
                        }
                    }
                ]
            }
        })
    }
}
module.exports = QuotationController
