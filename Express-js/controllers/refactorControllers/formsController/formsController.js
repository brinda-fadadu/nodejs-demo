const models = require('../../../models/index')
const Op = require('sequelize').Op
const logger = require('../../../lib/logger')
const PersonController = require('../personController/personController')
const docuSignForms = require('../../../services/docusign/forms/index.js')
const { docuSignClient } = require('../../../services').docusign
const { returnFullName } = require('../../../utils/formatters')
const _ = require('lodash')
const moment = require('moment')
const request = require('request-promise')
const { bullJobRetry, getQueryObject, getModel } = require('../../../lib/util')
const Email = require('../../../lib/Emailer/core')
const path = require('path')
const makeHTML = require('../../../utils/generatePDF/dataHTML')
const { v4: uuidv4 } = require('uuid')
const BaseForm = require('../../../services/docusign/forms/baseForm')

class formsController {
    /**
     * Gets one form based in form Id
     * @param {*} id formId
     * @param {*} transaction
     */
    static async _getFormById (id) {
        let form = await models.Form.findOne({
            where: {
                id: id
            }
        })
        if (!form) {
            throw new Error('FORM_NOT_FOUND')
        }
        return form
    }

    /**
     * Fetch all the forms from DB.
     * @param {*} transaction
     */
    static getAllForms (formName) {
        let whereCondition = { isList: true }
        if (formName) {
            whereCondition = { title: formName }
        }
        return models.FormCategory.findAll({
            include: [{
                model: models.Form,
                as: 'forms',
                where: whereCondition,
                required: true,
                include: [{
                    model: models.FormRecipientRole,
                    as: 'formRecipientRoles',
                    include: [{
                        model: models.FormRecipientContactRole,
                        as: 'formRecipientContactRoles',
                        include: [{
                            model: models.ContactRole,
                            as: 'formContactRoles'
                        }]
                    }, {
                        model: models.FormRecipientAgreementRole,
                        as: 'formRecipientAgreementRoles',
                        include: [{
                            model: models.AgreementRole,
                            as: 'formAgreementRoles'
                        }]
                    },
                    {
                        model: models.FormRecipientRoleCarboncopyEmail,
                        as: 'formRecipientRoleCarboncopyEmail'
                    }]
                },
                {
                    model: models.FormQuestion,
                    as: 'formQuestions'
                }]
            }]
        })
    }

    async getCaseForms (whereCondition, caseInfoFormAttributes, includes, order) {
        let queryObject = getQueryObject(whereCondition, caseInfoFormAttributes, includes, order)
        let caseInfoForms = await models.CaseInfoForm.findAll(queryObject)
        return caseInfoForms
    }

    getOperationAndCondition (personId, status) {
        // let andCondition1 = { status: 'created', envelopeId: { [Op.ne]: null } }
        // let andCondition1 = {}
        let andCondition2 = {
            [Op.and]: [{
                // [Op.or]: [{ status: { [Op.eq]: 'Completed' } }, { status: { [Op.eq]: 'sent' } }, { status: { [Op.eq]: 'Created' } }, { status: { [Op.eq]: 'voided' } }]
            }]
        }
        if (personId && andCondition2[Op.and]) {
            // andCondition1.personId = personId
            andCondition2[Op.and][0].personId = personId
        }
        if (status && andCondition2[Op.and]) {
            andCondition2[Op.and][0].status = {
                [Op.in]: status
            }
        }
        /* if (addendumId && andCondition2[Op.and]) {
            // andCondition1.addendumId = addendumId
            andCondition2[Op.and][0].addendumId = addendumId
        }
        if (agreementId && andCondition2[Op.and]) {
            // andCondition1.agreementId = agreementId
            andCondition2[Op.and][0].agreementId = agreementId
        } */
        let orCondition = {
            // [Op.or]: [andCondition1, andCondition2]
            [Op.or]: [andCondition2]
        }
        return orCondition
    }

    /**
     * This method gets all the case info forms that belongs to a person
     * @param {*} personId
     * @param {*} queryParams formname and agreementId of agreement form and edrs form
     */
    async getCaseInfoForms (personId, queryParams) {
        // let formController = new formsController()
        const packageForms = ['AN Cemetery Package', 'AN Cremation Package', 'AN Funeral Package', 'GA Insurance Package', 'GA Trust Package', 'PN Cemetery Package']
        let formName = queryParams ? queryParams.formName : null
        let agreementId = queryParams ? queryParams.agreementId : null
        let addendumId = queryParams ? queryParams.addendumId : null
        let whereConditionInForm = { isList: true }
        let templateReq = true
        if (formName) {
            whereConditionInForm.title = formName
            whereConditionInForm.isList = false
            templateReq = false
            if (agreementId) {
                // TODO: Includes can be minimized by having recursive function call in getModel function
                let result = await this.getCaseForms({ status: { [Op.ne]: 'voided' } }, ['id', 'formId', 'status', 'createdAt'], [
                    getModel(models.Form, 'form', false, ['title', 'description'], { title: { [Op.in]: packageForms } }),
                    getModel(models.CaseInfoFormTemplate, 'templates', false, ['formId'], { agreementId: agreementId }, [
                        getModel(models.Form, 'form', true, ['title', 'description'], { title: { [Op.in]: packageForms } })
                    ]),
                    getModel(models.Person, null, null, ['id', 'firstName', 'middleName', 'lastName'], null, [
                        getModel(models.PersonVerificationDetails, 'personVerificationDetails', null, ['onePortalId'], null)
                    ])
                ])
                if (result && result.length) {
                    let agreementForms = await this.getCaseForms({}, ['createdAt'], [
                        getModel(models.Form, 'form', false, ['title', 'description'], { title: { [Op.notIn]: packageForms } }),
                        getModel(models.CaseInfoFormTemplate, 'templates', false, ['formId'], { agreementId: agreementId }, [
                            getModel(models.Form, 'form', true, ['title', 'description'], { title: { [Op.notIn]: packageForms } })
                        ])
                    ], [['createdAt', 'DESC']])
                    const getPackageNameFromSharedForms = result.map(r => {
                        if (r.form ? r.form.title.toLowerCase().includes(formName.toLowerCase()) : r.templates.length ? r.templates[0].form.title.toLowerCase().includes(formName.toLowerCase()) : false) {
                            if (agreementForms && agreementForms.length > 0 && r.createdAt <= agreementForms[0].createdAt) {
                                return undefined
                            }
                            return {
                                formName: r.form.title,
                                sharedOnePortalId: r.Person.personVerificationDetails.onePortalId,
                                firstName: r.Person.firstName,
                                middleName: r.Person.middleName,
                                lastName: r.Person.lastName,
                                personId: r.Person.id
                            }
                        }
                    })
                    if (getPackageNameFromSharedForms && getPackageNameFromSharedForms[0]) { return getPackageNameFromSharedForms[0] }
                }
            }
        } else if (queryParams.apiType === 'quotation') {
            delete whereConditionInForm.isList
        }
        let status = ['sent', 'Completed', 'voided']
        let templateWhereCond = {}
        let caseInfoFormConditions = this.getOperationAndCondition(personId, status)
        // TODO: Addendum and agreement block can be combined there is repetation of code which can be avoided
        // if (agreementId) {
        //     const agreementPersons = await models.AgreementPerson.findAll(getQueryObject({
        //         agreementId: agreementId,
        //         roleId: 3
        //     }, ['personId']))
        //     const personIds = agreementPersons.map(person => {
        //         return person.personId
        //     })
        //     caseInfoFormConditions = {
        //         [Op.and]: this.getOperationAndCondition(undefined, ['inProgress', 'created', 'sent', 'Completed', 'voided'])['[Op.and]'],
        //         [Op.and]: this.getOperationAndCondition({ [Op.in]: personIds }, undefined, agreementId, undefined)['[Op.and]']
        //     }
        // }
        let addendum = null
        let agreementPersons
        if (addendumId) {
            addendum = await models.Addendum.findOne(getQueryObject({ id: addendumId }))
            agreementId = addendum.agreementId
            templateWhereCond.addendumId = addendumId
        }
        if (agreementId) {
            agreementPersons = await models.AgreementPerson.findAll(getQueryObject({
                agreementId: agreementId,
                roleId: 3
            }, ['personId']))
            const personIds = agreementPersons.map(person => {
                return person.personId
            })
            templateWhereCond.agreementId = agreementId
            caseInfoFormConditions = this.getOperationAndCondition({ [Op.in]: personIds }, status)
        }

        let query = getQueryObject(caseInfoFormConditions, ['id', 'status', 'envelopeId', 'agreementId', 'createdAt', 'envelopeName', 'isCompositeEnvelope', 'quotationId'], [
            getModel(models.CaseInfoFormRecipient, 'recipients', undefined, undefined, {
                status: {
                    // [Op.in]: ['inProgress', 'created', 'Completed', 'sent', 'voided', 'AutoResponded']
                    [Op.in]: ['created', 'Completed', 'sent', 'voided', 'AutoResponded']
                }
            }, [
                getModel(models.User, 'createdByUser'),
                getModel(models.FormRecipientRole, 'recipientRole'),
                getModel(models.PersonContact.unscoped(), 'personContact', false, undefined, undefined, [
                    getModel(models.Person, 'person'),
                    getModel(models.Relation, 'relation')
                ]),
                getModel(models.Employee, 'employee'),
                getModel(models.OtherRecipient, 'otherRecipient'),
                getModel(models.AgreementPerson.unscoped(), 'agreementPerson', false, undefined, undefined, [
                    getModel(models.Person, 'person'),
                    getModel(models.Relation, 'relation')
                ]),
                getModel(models.AgreementPropertyOwner, 'agreementPropertyOwner', false, undefined, undefined, [
                    getModel(models.Person, 'person')
                ]),
                getModel(models.Certifier, 'certifier', false, undefined, undefined, [
                    getModel(models.Person, 'certifierPerson')
                ]),
                getModel(models.FormRecipientRoleCarboncopyEmail, 'formRecipientRoleCarboncopyEmail', false)
            ]),
            getModel(models.CaseInfoFormTemplate, 'templates', templateReq, undefined, templateWhereCond, [
                getModel(models.Form, 'form', true, undefined, whereConditionInForm, undefined)
            ])
        ])
        if ((agreementId && formName) || formName) {
            query.order = [['createdAt', 'DESC']]
            query.limit = 1
        } else if (queryParams.apiType === 'quotation') {
            query.order = [['createdAt', 'DESC']]
        }
        const formsList = await models.CaseInfoForm.findAll(query)
        if (formsList.length) {
            let ids = []
            const formattedList = await Promise.all(formsList.filter(caseInfoForm => {
                if (queryParams.apiType === 'quotation' && caseInfoForm.quotationId) {
                    let index = ids.findIndex(p => p === caseInfoForm.quotationId)
                    if (index !== -1) {
                        return false
                    }
                    ids.push(caseInfoForm.quotationId)
                }
                let data = {
                    id: caseInfoForm.id,
                    status: caseInfoForm.status,
                    envelopeId: caseInfoForm.envelopeId,
                    // formId: caseInfoForm.templates[0].form.id,
                    quotationId: caseInfoForm.quotationId || null,
                    envelopeName: caseInfoForm.envelopeName,
                    agreementId: caseInfoForm.agreementId,
                    createdAt: caseInfoForm.createdAt,
                    templates: caseInfoForm.templates,
                    isCompositeEnvelope: caseInfoForm.isCompositeEnvelope,
                    recipients: caseInfoForm.recipients.map(recipient => {
                        // ADD IS EMAILSENTFORSIGNING, docusignRecipientId -> personSigningOrder (Rename column in DB)
                        if (recipient.employeeId) {
                            return this.recipientMapper(recipient, {
                                id: this.createColumnNameObject('employee.id', true),
                                name: this.createColumnNameObject('employee.name', true),
                                email: this.createColumnNameObject('employee.email', true, undefined, 'usedDefaultEmail'),
                                status: this.createColumnNameObject('status', true),
                                roleType: this.createColumnNameObject('recipientRole.roleType', true),
                                docusignRole: this.createColumnNameObject('recipientRole.docusignRole', true),
                                roleId: this.createColumnNameObject('recipientRole.id', true),
                                recipientId: this.createColumnNameObject('id', true),
                                personSigningOrder: this.createColumnNameObject('personSigningOrder', true),
                                isEmailSentForSigning: this.createColumnNameObject('isEmailSentForSigning', true)
                            })
                        }
                        if (recipient.personContact) {
                            return this.recipientMapper(recipient, {
                                id: this.createColumnNameObject('personContact.person.id', true),
                                name: this.createColumnNameObject('personContact.person', true, returnFullName),
                                email: this.createColumnNameObject('personContact.person.email', true, undefined, 'usedDefaultEmail'),
                                status: this.createColumnNameObject('status', true),
                                roleType: this.createColumnNameObject('recipientRole.roleType', true),
                                docusignRole: this.createColumnNameObject('recipientRole.docusignRole', true),
                                roleId: this.createColumnNameObject('recipientRole.id', true),
                                recipientId: this.createColumnNameObject('id', true),
                                personSigningOrder: this.createColumnNameObject('personSigningOrder', true),
                                isEmailSentForSigning: this.createColumnNameObject('isEmailSentForSigning', true)
                            })
                        }
                        if (recipient.agreementPersonId) {
                            return this.recipientMapper(recipient, {
                                id: this.createColumnNameObject('agreementPerson.person.id', true),
                                name: this.createColumnNameObject('agreementPerson.person', true, returnFullName),
                                email: this.createColumnNameObject('agreementPerson.person.email', true, undefined, 'usedDefaultEmail'),
                                status: this.createColumnNameObject('status', true),
                                roleType: this.createColumnNameObject('recipientRole.roleType', true),
                                docusignRole: this.createColumnNameObject('recipientRole.docusignRole', true),
                                roleId: this.createColumnNameObject('recipientRole.id', true),
                                recipientId: this.createColumnNameObject('id', true),
                                personSigningOrder: this.createColumnNameObject('personSigningOrder', true),
                                isEmailSentForSigning: this.createColumnNameObject('isEmailSentForSigning', true)
                            })
                        }
                        if (recipient.agreementPropertyOwnerId) {
                            return this.recipientMapper(recipient, {
                                id: this.createColumnNameObject('agreementPropertyOwner.person.id', true),
                                name: this.createColumnNameObject('agreementPropertyOwner.person', true, returnFullName),
                                email: this.createColumnNameObject('agreementPropertyOwner.person.email', true, undefined, 'usedDefaultEmail'),
                                status: this.createColumnNameObject('status', true),
                                roleType: this.createColumnNameObject('recipientRole.roleType', true),
                                docusignRole: this.createColumnNameObject('recipientRole.docusignRole', true),
                                roleId: this.createColumnNameObject('recipientRole.id', true),
                                recipientId: this.createColumnNameObject('id', true),
                                personSigningOrder: this.createColumnNameObject('personSigningOrder', true),
                                isEmailSentForSigning: this.createColumnNameObject('isEmailSentForSigning', true)
                            })
                        }
                        if (recipient.certifierId) {
                            return this.recipientMapper(recipient, {
                                id: this.createColumnNameObject('certifier.certifierPerson.id', true),
                                name: this.createColumnNameObject('certifier.certifierPerson', true, returnFullName),
                                email: this.createColumnNameObject('certifier.certifierPerson.email', true, undefined, 'usedDefaultEmail'),
                                status: this.createColumnNameObject('status', true),
                                roleType: this.createColumnNameObject('recipientRole.roleType', true),
                                docusignRole: this.createColumnNameObject('recipientRole.docusignRole', true),
                                recipientId: this.createColumnNameObject('id', true),
                                personSigningOrder: this.createColumnNameObject('personSigningOrder', true),
                                isEmailSentForSigning: this.createColumnNameObject('isEmailSentForSigning', true)
                            })
                        }
                        if (recipient.otherRecipientId) {
                            return this.recipientMapper(recipient, {
                                id: this.createColumnNameObject('otherRecipient.id', true),
                                name: this.createColumnNameObject('otherRecipient.name', true),
                                email: this.createColumnNameObject('otherRecipient.email', true, undefined, 'usedDefaultEmail'),
                                status: this.createColumnNameObject('status', true),
                                roleType: this.createColumnNameObject('recipientRole.roleType', true),
                                docusignRole: this.createColumnNameObject('recipientRole.docusignRole', true),
                                roleId: this.createColumnNameObject('recipientRole.id', true),
                                recipientId: this.createColumnNameObject('id', true),
                                personSigningOrder: this.createColumnNameObject('personSigningOrder', true),
                                isEmailSentForSigning: this.createColumnNameObject('isEmailSentForSigning', true)
                            })
                        }
                        if (recipient.formRecipientRoleCarbonCopyEmailId) {
                            return this.recipientMapper(recipient, {
                                id: this.createColumnNameObject('formRecipientRoleCarboncopyEmail.id', true),
                                name: this.createColumnNameObject('Embalmingteam', false),
                                email: this.createColumnNameObject('formRecipientRoleCarboncopyEmail.email', true, undefined, 'usedDefaultEmail'),
                                status: this.createColumnNameObject('status', true),
                                roleType: this.createColumnNameObject('recipientRole.roleType', true),
                                docusignRole: this.createColumnNameObject('recipientRole.docusignRole', true),
                                recipientId: this.createColumnNameObject('id', true),
                                personSigningOrder: this.createColumnNameObject('personSigningOrder', true),
                                isEmailSentForSigning: this.createColumnNameObject('isEmailSentForSigning', true)
                            })
                        }
                    })
                }
                let sortedList = data.recipients.sort((a, b) => parseInt(a.roleId) - parseInt(b.roleId))
                data.recipients = sortedList
                return data
            }))
            return formattedList
        } else {
            return formsList
        }
    }

    createColumnNameObject (columnName, isColumnName, functionName, defaultEmail) {
        return {
            columnName: columnName,
            isColumnName: isColumnName,
            functionName: functionName,
            defaultEmail: defaultEmail
        }
    }

    recipientMapper (recipient, properties) {
        let mapper = {
            id: properties.id ? _.get(recipient, properties.id.columnName) : null,
            name: properties.name && properties.name.isColumnName ? properties.name.functionName ? properties.name.functionName(_.get(recipient, properties.name.columnName)) : _.get(recipient, properties.name.columnName) : properties.name.columnName,
            email: properties.email ? _.get(recipient, properties.email.defaultEmail) || _.get(recipient, properties.email.columnName) : null,
            status: properties.status ? _.get(recipient, properties.status.columnName) : null,
            roleType: properties.roleType ? _.get(recipient, properties.roleType.columnName) : null,
            docusignRole: properties.docusignRole ? _.get(recipient, properties.docusignRole.columnName) : null,
            recipientId: properties.recipientId ? _.get(recipient, properties.recipientId.columnName) : null,
            personSigningOrder: properties.personSigningOrder ? _.get(recipient, properties.personSigningOrder.columnName) : null,
            isEmailSentForSigning: properties.isEmailSentForSigning ? _.get(recipient, properties.isEmailSentForSigning.columnName) : null
        }
        if (properties.roleId) {
            mapper.roleId = _.get(recipient, properties.roleId.columnName)
        }
        return mapper
    }

    /**
     * Creates a Case info form in the DB and returns the case info form object
     * @param {number} formId
     * @param {number} personId
     * @param {object} data This is an object with employees, contacts and other recipients as an array
     * @param {number} userId
     * @param {string} docStatus
     */
    static async createCaseInfoForm (formId, personId, data, userId, docStatus) {
        try {
            const caseInfoForm = {
                formId: formId,
                personId: personId,
                addendumId: data.addendumId || null,
                agreementId: data.agreementId || null,
                status: docStatus,
                createdBy: userId,
                recipients: [],
                metaData: data.metaData || null,
                envelopeName: data.envelopeName || data.formName,
                quotationId: data.quotationId || null
            }

            if (data.employees && data.employees.length) {
                data.employees.forEach((emp) => {
                    caseInfoForm.recipients.push({
                        employeeId: emp.id,
                        formRecipientRoleId: emp.formRecipientRoleId,
                        // availableInPerson: emp.availableInPerson,
                        inPersonHostId: emp.inPersonHostId,
                        usedDefaultEmail: emp.usedDefaultEmail,
                        createdBy: userId,
                        status: docStatus
                    })
                })
            }

            if (data.vendors && data.vendors.length) {
                data.vendors.forEach((vendor) => {
                    caseInfoForm.recipients.push({
                        vendorId: vendor.id,
                        formRecipientRoleId: vendor.formRecipientRoleId,
                        // availableInPerson: vendor.availableInPerson,
                        inPersonHostId: vendor.inPersonHostId,
                        usedDefaultEmail: vendor.usedDefaultEmail,
                        createdBy: userId,
                        status: docStatus
                    })
                })
            }

            if (data.contacts && data.contacts.length) {
                data.contacts.forEach((contact) => {
                    caseInfoForm.recipients.push({
                        personContactId: contact.id,
                        formRecipientRoleId: contact.formRecipientRoleId,
                        // availableInPerson: contact.availableInPerson,
                        inPersonHostId: contact.inPersonHostId,
                        usedDefaultEmail: contact.usedDefaultEmail,
                        createdBy: userId,
                        status: docStatus
                    })
                })
            }

            if (data.otherRecipients && data.otherRecipients.length) {
                await Promise.all(
                    data.otherRecipients.map(async (otherRecipient) => {
                        otherRecipient['createdBy'] = userId
                        const otherRecipientCreatedResult = await models.OtherRecipient.create(otherRecipient)
                        caseInfoForm.recipients.push({
                            otherRecipientId: otherRecipientCreatedResult.id,
                            formRecipientRoleId: otherRecipient.formRecipientRoleId,
                            // availableInPerson: otherRecipient.availableInPerson,
                            inPersonHostId: otherRecipient.inPersonHostId,
                            usedDefaultEmail: otherRecipient.usedDefaultEmail,
                            createdBy: userId,
                            status: docStatus
                        })
                    })
                )
            }

            if (data.agreementPersons && data.agreementPersons.length) {
                data.agreementPersons.forEach((c) => {
                    caseInfoForm.recipients.push({
                        agreementPersonId: c.id,
                        formRecipientRoleId: c.formRecipientRoleId,
                        // availableInPerson: c.availableInPerson,
                        inPersonHostId: c.inPersonHostId,
                        usedDefaultEmail: c.usedDefaultEmail,
                        createdBy: userId,
                        status: docStatus
                    })
                })
            }
            if (data.agreementPropertyOwners && data.agreementPropertyOwners.length) {
                data.agreementPropertyOwners.forEach((c) => {
                    caseInfoForm.recipients.push({
                        agreementPropertyOwnerId: c.id,
                        formRecipientRoleId: c.formRecipientRoleId,
                        // availableInPerson: c.availableInPerson,
                        inPersonHostId: c.inPersonHostId,
                        usedDefaultEmail: c.usedDefaultEmail,
                        createdBy: userId,
                        status: docStatus
                    })
                })
            }
            if (data.certifiers && data.certifiers.length) {
                data.certifiers.forEach((c) => {
                    caseInfoForm.recipients.push({
                        certifierId: c.id,
                        formRecipientRoleId: c.formRecipientRoleId,
                        // availableInPerson: c.availableInPerson,
                        inPersonHostId: c.inPersonHostId,
                        usedDefaultEmail: c.usedDefaultEmail,
                        createdBy: userId,
                        status: docStatus
                    })
                })
            }
            if (data.carbonCopyEmail && data.carbonCopyEmail.length) {
                data.carbonCopyEmail.forEach((c) => {
                    caseInfoForm.recipients.push({
                        formRecipientRoleCarbonCopyEmailId: c.id,
                        formRecipientRoleId: c.formRecipientRoleId,
                        // availableInPerson: c.availableInPerson,
                        usedDefaultEmail: c.usedDefaultEmail,
                        createdBy: userId,
                        status: docStatus
                    })
                })
            }

            const result = await models.CaseInfoForm.create(caseInfoForm, {
                include: [{
                    model: models.CaseInfoFormRecipient,
                    as: 'recipients'
                }]
            })
            return result
        } catch (err) {
            logger.error(`Error while creating caseinfoform and caseinfoformrecipients from database ${err}`)
            throw err
        }
    }

    /**
     * Creates a Case info form in the DB and returns the case info form object
     * @param {number} formId
     * @param {number} personId
     * @param {object} data This is an object with employees, contacts and other recipients as an array
     * @param {number} userId
     * @param {string} docStatus
     */
    static async newCreateCaseInfoForm (formId, data, personId, userId, docStatus) {
        try {
            let caseInfoForm = {
                formId: formId,
                personId: personId,
                addendumId: data.addendumId || null,
                agreementId: data.agreementId || null,
                status: docStatus,
                createdBy: userId,
                metaData: data.metaData || null,
                envelopeName: data.envelopeName || data.formName
            }
            caseInfoForm.recipients = await formsController.createCaseInfoFormRecipients(data, userId, docStatus)
            const result = await models.CaseInfoForm.create(caseInfoForm, {
                include: [{
                    model: models.CaseInfoFormRecipient,
                    as: 'recipients'
                }]
            })
            return result
        } catch (err) {
            logger.error(`Error while creating caseinfoform and caseinfoformrecipients from database ${err}`)
            throw err
        }
    }

    static async createCaseInfoFormForCompositeForms (formId, forms, metaData, personId, userId, docStatus, isCompositeEnvelope, quotationId = null) {
        try {
            let caseInfoForm = {
                formId: formId,
                personId: personId,
                status: docStatus,
                createdBy: userId,
                recipients: [],
                templates: [],
                metaData: metaData,
                envelopeName: JSON.parse(metaData).envelopeName || forms[0].envelopeName,
                isCompositeEnvelope,
                quotationId
            }
            let recipient
            for (var form of forms) {
                recipient = await formsController.caseInfoFormRecipients(form, userId, docStatus)
                caseInfoForm.recipients.push(...recipient)
                caseInfoForm.templates.push({ formId: form.formId, agreementId: form.agreementId, addendumId: form.addendumId })
            }

            const result = await models.CaseInfoForm.create(caseInfoForm, {
                include: [{
                    model: models.CaseInfoFormRecipient,
                    as: 'recipients'
                }, {
                    model: models.CaseInfoFormTemplate,
                    as: 'templates'
                }]
            })
            return result
        } catch (err) {
            logger.error(`Error while creating caseinfoform and caseinfoformrecipients from database ${err}`)
            throw err
        }
    }

    static async caseInfoFormRecipients (data, userId, docStatus) {
        let recipients = []
        if (data.employees && data.employees.length) {
            recipients.push(...this.caseInfoFormRecipientsObj(data.employees, 'emp', userId, docStatus))
        }
        if (data.vendors && data.vendors.length) {
            recipients.push(...this.caseInfoFormRecipientsObj(data.vendors, 'vendor', userId, docStatus))
        }
        if (data.contacts && data.contacts.length) {
            recipients.push(...this.caseInfoFormRecipientsObj(data.contacts, 'contact', userId, docStatus))
        }
        if (data.otherRecipients && data.otherRecipients.length) {
            await Promise.all(data.otherRecipients.map(async (otherRecipient) => {
                otherRecipient['createdBy'] = userId
                const otherRecipientCreatedResult = await models.OtherRecipient.create(otherRecipient)
                recipients.push({
                    otherRecipientId: otherRecipientCreatedResult.id,
                    formRecipientRoleId: otherRecipient.formRecipientRoleId,
                    // availableInPerson: otherRecipient.availableInPerson,
                    inPersonHostId: otherRecipient.inPersonHostId,
                    usedDefaultEmail: otherRecipient.usedDefaultEmail,
                    createdBy: userId,
                    status: docStatus,
                    docusignClientUserId: uuidv4() // creating docusign clientUserId
                })
            }))
        }
        if (data.agreementPersons && data.agreementPersons.length) {
            recipients.push(...this.caseInfoFormRecipientsObj(data.agreementPersons, 'agmntPerson', userId, docStatus))
        }
        if (data.agreementPropertyOwners && data.agreementPropertyOwners.length) {
            recipients.push(...this.caseInfoFormRecipientsObj(data.agreementPropertyOwners, 'agmntPropOwner', userId, docStatus))
        }
        if (data.certifiers && data.certifiers.length) {
            recipients.push(...this.caseInfoFormRecipientsObj(data.certifiers, 'certifier', userId, docStatus))
        }
        if (data.carbonCopyEmail && data.carbonCopyEmail.length) {
            recipients.push(...this.caseInfoFormRecipientsObj(data.carbonCopyEmail, 'cc', userId, docStatus))
        }
        return recipients
    }

    static caseInfoFormRecipientsObj (recipients, recptType, userId, docStatus) {
        let finalRecipients = []
        recipients.forEach((e) => {
            let recptIdKey = recptType === 'emp' ? 'employeeId' : recptType === 'vendor'
                ? 'vendorId' : recptType === 'contact' ? 'personContactId' : recptType === 'agmntPerson'
                    ? 'agreementPersonId' : recptType === 'agmntPropOwner' ? 'agreementPropertyOwnerId' : recptType === 'certifier'
                        ? 'certifierId' : 'formRecipientRoleCarbonCopyEmailId'
            let recptObj = {
                formRecipientRoleId: e.formRecipientRoleId,
                usedDefaultEmail: e.usedDefaultEmail,
                createdBy: userId,
                status: docStatus,
                docusignClientUserId: uuidv4() // creating docusign clientUserId
            }
            recptObj[recptIdKey] = e.id
            finalRecipients.push(recptObj)
        })
        return finalRecipients
    }

    /**
     * Deletes all the Case info forms based on the list of caseInfoForms sent as argument
     * @param {array} caseInfoFormIds An array of case info forms
     */
    static async deleteCaseInfoForms (caseInfoForms) {
        caseInfoForms.forEach(async (caseInfoForm) => {
            await models.CaseInfoFormTemplate.destroy({ where: { caseInfoFormId: caseInfoForm.id } })
            await models.CaseInfoFormRecipient.destroy({ where: { caseInfoFormId: caseInfoForm.id } })
            await models.CaseInfoForm.destroy({ where: { id: caseInfoForm.id } })
        })
        const envelopeIdsToDelete = await caseInfoForms.map(c => c.envelopeId)
        let deletedResult
        if (envelopeIdsToDelete.length) {
            deletedResult = await docuSignClient.moveToRecycleBin(envelopeIdsToDelete)
        }
        return deletedResult
    }

    /**
     * Delete drafted and created case info forms of a person
     * @param {number} personId
     */
    static async deleteDraftedAndCreatedCaseInfoFormsOfAPerson (personId) {
        try {
            const personController = new PersonController(personId)
            await personController.getDetails()
            const caseInfoFormResults = await models.CaseInfoForm.findAll({
                where: {
                    [Op.and]: [{
                        personId,
                        [Op.or]: [
                            {
                                status: 'created'
                            },
                            {
                                status: 'draft'
                            }
                        ]
                    }]
                }
            })
            if (!caseInfoFormResults) {
                throw new Error('CASEINFOFORMS_NOT_FOUND')
            }
            const deleteForm = await this.deleteCaseInfoForms(caseInfoFormResults)
            return deleteForm
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This function creates a docusign form envelope and adds data, recipients and in person signer details ans sends the email if necessary
     * @param {object} form
     * @param {object} caseInfoForm
     * @param {string} status
     * @param {transaction} t
     */
    static async sendFormToDocusignClient (forms, caseInfoForm, status, type) {
        let caseInfoData = { caseInfoFormId: caseInfoForm.id }
        let compositeTemplates = []
        let docuSignForm
        let addtionalData = {}

        for (var form of forms) {
            caseInfoData.formId = form.id
            switch (form.title) {
            case 'Release Authorization':
                docuSignForm = new docuSignForms.ReleaseAuthorizationForm(caseInfoData)
                break
            case 'Witness of Removal':
                docuSignForm = new docuSignForms.WitnessOfRemovalForm(caseInfoData)
                break
            case 'Authorization to Accept or Decline Embalming':
                docuSignForm = new docuSignForms.EmbalmingForm(caseInfoData)
                break
            case 'Affidavit of Disposition of Control Over Remains':
                docuSignForm = new docuSignForms.DispositionForm(caseInfoData)
                break
            case 'Disclosure of Preneed Funeral Arrangement':
                docuSignForm = new docuSignForms.FuneralArrangementForm(caseInfoData)
                break
            case 'AN Statement of Goods and Services':
                docuSignForm = new docuSignForms.AnFuneralStatemntForm(caseInfoData)
                break
            case 'Death Certificate Working Copy-dev':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.DeathCertificate(caseInfoData)
                break
            case 'Purchase Order form to send to Vendors':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.PurchaseOrderForm(caseInfoData)
                break
            case 'Retail Installment Agreement':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.RetailInstalmentAgreementForm(caseInfoData)
                break
            case 'Installment Agreement Addendum':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.InstallmentAgreementAddendumForm(caseInfoData)
                break
            case 'Cremation and Disposition Authorization':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.CremationAndDispositionAuthorizationForm(caseInfoData)
                break
            case 'Claim and Assignment of Insurance Policy':
                caseInfoData.personId = caseInfoForm.personId
                caseInfoData.recipients = caseInfoForm.recipients.slice(1)
                docuSignForm = new docuSignForms.ClaimAndAssignmentOfInsurancePolicyForm(caseInfoData)
                break
            case 'Pre-need Trust Agreement':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.PreNeedTruestAgreementForm(caseInfoData)
                break
            case 'Declaration for Disposition of Cremated Remains':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.DeclarationForDispositionOfCrematedRemainsForm(caseInfoData)
                break
            case 'Disinterment Witness Disclosure and Acknowledgement and Release of Liability':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.DisintermentWitnessDisclosureAndAcknowledgementAndReleaseOfLiability(caseInfoData)
                break
            case 'Witness of Cremation Release':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.WitnessOfCremationReleaseForm(caseInfoData)
                break
            case 'Authorization and Release of Abandoned and Unclaimed Cremated Remains':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.AuthorizationAndReleaseOfAdondonnedAndUnclaimedCreamatedRemainsForm(caseInfoData)
                break
            case 'Notice of Right to Cancel-Homesteaders':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.NoticeOfRightToCancelHomesteadersForm(caseInfoData)
                break
            case 'CA Cheque Request':
                caseInfoData.personId = caseInfoForm.personId
                caseInfoData.metaData = JSON.parse(caseInfoForm.metaData)
                docuSignForm = new docuSignForms.CAChequeRequest(caseInfoData)
                break
            case 'Cremated Remains Receipt':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.CrematedRemainsReciptForm(caseInfoData)
                break
            case 'Foreign Language Release':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.ForeignLanguageReleaseForm(caseInfoData)
                break
            case 'Declaration of Intent Regarding Preneed Funeral Arrangement by Beneficiary':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.DeclarationOfIntentByBeneficiaryForm(caseInfoData)
                break
            case 'Designation of Interment Rights':
                docuSignForm = new docuSignForms.DesignationOfIntermentRights(caseInfoData)
                break
            case 'Authorization Agreement for Preauthorized Payments':
                docuSignForm = new docuSignForms.AuthorizationAgreementforPreauthorizedPayments(caseInfoData)
                break
            case 'Temporary Release and Assignment of Cremated Remains':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.TemporaryRemainsAndAssignmentOfCrematedRemains(caseInfoData)
                break
            case 'Interment Order Authorization Form':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.IntermentOrderAuthorizationForm(caseInfoData)
                break
            case 'Assignment of Contract and-or Interment Rights':
                docuSignForm = new docuSignForms.AssignmentOfContractAndIntermentRights(caseInfoData)
                break
            case 'Deed Replacement':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.DeedReplacementForm(caseInfoData)
                break
            case 'Family Protection Plan':
                docuSignForm = new docuSignForms.FamilyProtectionPlan(caseInfoData)
                break
            case 'Child and Grandchild Protection Plan':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.ChildAndGrandchildProtectionPlan(caseInfoData)
                break
            case 'Order and Authorization for Disinterment and Removal':
                docuSignForm = new docuSignForms.OrderAndAuthorizationForDisintermentAndRemoval(caseInfoData)
                break
            case 'Quitclaim and Transfer - Property Only':
                docuSignForm = new docuSignForms.QuitclaimAndTransfer(caseInfoData)
                break
            case 'PN Statement of Goods and Services - Insurance':
                docuSignForm = new docuSignForms.PnStatementOfGoodsAndServicesInsurance(caseInfoData)
                break
            case 'PN Statement of Goods and Services - Trust':
                docuSignForm = new docuSignForms.PNStatementOfGoodsAndServicesTrust(caseInfoData)
                break
            case 'PN Quote - Funeral':
                docuSignForm = new docuSignForms.PNQuoteFuneral(caseInfoData)
                break
            case 'Acceptance-decline video streaming services':
                docuSignForm = new docuSignForms.AcceptanceDeclineVideoStreamingServices(caseInfoData)
                break
            case 'XX SPLIT DEPOSIT FORM':
                docuSignForm = new docuSignForms.XXSplitDeposit(caseInfoData)
                break
            case 'Quote - Cemetery':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.QuoteCemetery(caseInfoData)
                break
            case 'Global Atlantic Group - Preneed New Business Options':
                docuSignForm = new docuSignForms.GlobalAtlanticGroupPreneedNewBusinessOptions(caseInfoData)
                break
            case 'Global Atlantic Group - Electronic Document Disclosure and Consent':
                docuSignForm = new docuSignForms.GlobalAtlanticGroupElectronicDocumentDisclosureAndConsent(caseInfoData)
                break
            case 'DeathCertificate Worksheet':
                docuSignForm = new docuSignForms.DeathCertificateWorksheet(caseInfoData)
                break
            case 'Request for cremation':
                docuSignForm = new docuSignForms.RequestForCremation(caseInfoData)
                break
            case 'Appointment Confirmation to discuss PN funeral arrangements & life insurance or annuity funding':
                docuSignForm = new docuSignForms.AppointmentConfirmationToDiscussPNFuneralArrangementsAndLifeInsuranceOrAnnuityFunding(caseInfoData)
                break
            case 'Acknowledgment to retail installment agreement purchase of PN cemetery opening and closing services':
                docuSignForm = new docuSignForms.AknowledgmenttoRetailInstallmentAgreementPurchaseOfPNCemeteryOopeningAndClosingServices(caseInfoData)
                break
            case 'Acknowledgement and receipt':
                docuSignForm = new docuSignForms.AcknowledgementAndReceipt(caseInfoData)
                break
            case 'Authorization Agreement for Preauthorized Payments-Funeral':
                docuSignForm = new docuSignForms.AuthorizationAgreementforPreauthorizedPaymentsFuneral(caseInfoData)
                break
            case 'Family Protection Package':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.FamilyProtectionPackage(caseInfoData)
                break
            case 'AN Funeral Package':
                docuSignForm = new docuSignForms.ANFuneralPackage(caseInfoData)
                break
            case 'AN Cremation Package':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.ANCremationPackage(caseInfoData)
                break
            case 'AN Cemetery Package':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.ANCemeteryPackage(caseInfoData)
                break
            case 'PN Cemetery Package':
                docuSignForm = new docuSignForms.PNCemeteryPackage(caseInfoData)
                break
            case 'GA Trust Package':
                docuSignForm = new docuSignForms.GATrustPackage(caseInfoData)
                break
            case 'GA Insurance Package':
                docuSignForm = new docuSignForms.GAInsurancePackage(caseInfoData)
                break
            case 'Notice of Right to Cancel':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.NoticeOfRightToCancelForm(caseInfoData)
                break
            case 'Notification of change on Interment order and authorization for disposition of decedent remains':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.NotificationOfChangeOnIOA(caseInfoData)
                break
            case 'Cremation Record':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.CremationRecord(caseInfoData)
                break
            case 'Pre-Need Trust Notice of Cancellation':
                docuSignForm = new docuSignForms.PreNeedTrustNoticeOfCancellation(caseInfoData)
                break
            case 'Quotation':
                caseInfoData.personId = caseInfoForm.personId
                docuSignForm = new docuSignForms.QuotationForm(caseInfoData)
                break
            default:
                break
            }

            logger.info(`docuSignForm info: ${docuSignForm} ,Stringified form: ${JSON.stringify(docuSignForm)}`)
            await docuSignForm.init()
            logger.info(`docuSignForm init started`)
            await docuSignForm.fetchAgreementIdAndAddendumId(form.title)
            let templateRolesInput = await docuSignForm.envelopeData()

            compositeTemplates.push({
                serverTemplates: [{
                    sequence: '1',
                    templateId: form.docusignTemplateId
                }],
                inlineTemplates: [{
                    sequence: '2',
                    recipients: {
                        signers: templateRolesInput
                    }
                }]
            })

            if (docuSignForm.addtionalData) {
                // let title = form.title
                // addtionalData[title] = docuSignForm.addtionalData[title]
                for (const key in docuSignForm.addtionalData) {
                    addtionalData[key] = docuSignForm.addtionalData[key]
                }
            }
        }
        const result = await docuSignForm.createCompositeEnvelopeData(caseInfoForm, compositeTemplates, status, type, addtionalData)
        return result
    }

    /**
     * This function creates case info form, sends the form to docusign and generates preview URL
     * @param {*} formId caseInfoFormId
     * @param {*} personId
     * @param {*} reqData
     * @param {*} user
     */
    static async createCaseInfoFormPreview (formId, personId, reqData, user) {
        let caseInfoForm
        try {
            const personController = new PersonController(personId)
            await personController.getDetails()
            const form = await this._getFormById(formId)
            caseInfoForm = await this.createCaseInfoForm(formId, personId, reqData, user.id, 'preview')
            // Note: To add case info form id if the form is a purchase order form
            if (form.title === 'Purchase Order form to send to Vendors') {
                await models.PurchaseOrder.update({
                    updatedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                    updatedBy: user.id
                }, {
                    where: {
                        id: reqData[0].purchaseOrderId
                    }
                })

                await models.PurchaseOrderItem.update({
                    updatedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                    updatedBy: user.id,
                    caseInfoFormId: caseInfoForm.id
                }, {
                    where: {
                        id: reqData[0].purchaseOrderItemId
                    }
                })
            }
            let sendResult = await this.sendFormToDocusignClient([form], caseInfoForm, 'created', 'preview', false)
            sendResult = sendResult.createdEnvelopeResult
            const url = await docuSignClient.generatePreviewUrl(sendResult.envelopeId)
            await caseInfoForm.reload()
            const result = caseInfoForm.toJSON()
            result.previewURL = `${url}&sendButtonAction=redirect&showEditPages=false&showHeaderActions=false&showEditDocumentVisibility=false&showEditDocuments=false&showEditRecipients=false&backButtonAction=redirect&showBackButton=false`
            return result
        } catch (err) {
            logger.error(err)
            await this.deleteCaseInfoForms([caseInfoForm])
            throw err
        }
    }

    /**
     * Create all the caseInfo forms of a person
     * @param {*} personId
     * @param {*} reqData is an array of forms object with keys formsId: integer, formRecipient role ID:integer and availableInPerson: bool
     * @param {*} currentUser
     */
    static async createCaseInfoFormsAndSendUsingDocusign (personId, reqData, currentUser) {
        try {
            const { queueNames, queues } = require('../../../appQueues')
            const docusignQueue = queues[queueNames.docusign_queue]
            const personController = new PersonController(personId)
            const person = await personController.getDetails()

            const forms = await models.Form.findAll({ where: { id: reqData.map(f => f.formId) } })
            if (forms.length !== reqData.length) {
                throw new Error('COULD_NOT_FIND_ALL_FORMS')
            }
            let caseInfoForms = []
            try {
                caseInfoForms = await Promise.all(reqData.map(async formData => {
                    let form = forms.find(f => f.id === formData.formId)
                    const caseInfoForm = await this.createCaseInfoForm(form.id, person.id, formData, currentUser.id, 'inProgress')
                    // Note: To add case info form id if the form is a purchase order form
                    if (form.title === 'Purchase Order form to send to Vendors') {
                        await models.PurchaseOrder.update({
                            updatedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                            updatedBy: currentUser.id
                        }, {
                            where: {
                                id: formData.purchaseOrderId
                            }
                        })

                        await models.PurchaseOrderItem.update({
                            updatedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                            updatedBy: currentUser.id,
                            caseInfoFormId: caseInfoForm.id
                        }, {
                            where: {
                                id: formData.purchaseOrderItemId
                            }
                        })
                        const poDocusignQueue = queues[queueNames.po_docusign_queue]
                        poDocusignQueue.add('POsendForm', caseInfoForm, bullJobRetry)
                    } else {
                        docusignQueue.add('sendForm', caseInfoForm, bullJobRetry)
                    }
                    return caseInfoForm
                }))
                return caseInfoForms
            } catch (err) {
                await this.deleteCaseInfoForms(caseInfoForms)
                logger.error(`Error while (Inner catch block)send forms and form recipients for particular OPI ${err}`)
                throw err
            }
        } catch (err) {
            logger.error(`Error while (Outer catch block)send forms and form recipients for particular OPI ${err}`)
            throw err
        }
    }

    static async createCaseInfoFormsAndEnvelopes (personId, reqData, currentUser) {
        try {
            const personController = new PersonController(personId)
            await personController.getDetails()

            const forms = await models.Form.findAll({ where: { id: reqData.forms.map(f => f.formId) } })
            if (forms.length !== reqData.forms.length) {
                throw new Error('COULD_NOT_FIND_ALL_FORMS')
            }
            // For creating composite envelope (set of forms sending in one go -- receiver will get single email for the no.of forms selected)
            if (reqData.compositeTemplates) {
                let caseInfoForm = await this.createCaseInfoFormForCompositeForms(null, reqData.forms, reqData.metaData, personId, currentUser.id, 'created', true, reqData.quotationId)
                // creating envelope for multiple forms
                const result = await this.sendFormToDocusignClient(forms, caseInfoForm, 'created', 'preview')
                // const signers = result.mergedRecipientResult ? result.mergedRecipientResult.signers : []
                // const recipients = caseInfoForm.recipients

                // if (signers.length && recipients.length) {
                //     const { queueNames, queues } = require('../../../appQueues')
                //     const dataToSend = { caseInfoFormId: caseInfoForm.id, signers, recipients }
                //     const docusignDuplicateRecipientsRemovalQueue = queues[queueNames.docusign_duplicate_recipients_removal]
                //     docusignDuplicateRecipientsRemovalQueue.add('removeDuplicateRecipients', dataToSend, bullJobRetry)
                // }

                // caseInfoForm = await models.CaseInfoForm.scope('templates', 'recipients', 'personInfo').findByPk(caseInfoForm.id)
                // caseInfoForm = result.caseInfoForm.toJSON()
                // caseInfoForm.signers = signers
                // return [caseInfoForm]
                return [result.caseInfoForm]
            } else {
                // For individual forms flow (receiver will receive multiple emails based on selected no.of forms)
                let caseInfoForms = []
                caseInfoForms = await Promise.all(reqData.forms.map(async formData => {
                    let form = forms.find(f => f.id === formData.formId)
                    let caseInfoForm = await this.createCaseInfoFormForCompositeForms(formData.formId, [formData], formData.metaData, personId, currentUser.id, 'created', false, reqData.quotationId)
                    // creating envelope for each form
                    const result = await this.sendFormToDocusignClient([form], caseInfoForm, 'created', 'preview')
                    // caseInfoForm = result.caseInfoForm.toJSON()
                    // caseInfoForm.signers = result.mergedRecipientResult ? result.mergedRecipientResult.signers : []
                    // return caseInfoForm
                    return result.caseInfoForm
                }))
                // await Promise.all(caseInfoForms.map(async eachForm => {
                //     if (eachForm.signers.length && eachForm.recipients.length) {
                //         const { queueNames, queues } = require('../../../appQueues')
                //         const dataToSend = { caseInfoFormId: eachForm.id, signers: eachForm.signers, recipients: eachForm.recipients }
                //         const docusignDuplicateRecipientsRemovalQueue = queues[queueNames.docusign_duplicate_recipients_removal]
                //         docusignDuplicateRecipientsRemovalQueue.add('removeDuplicateRecipients', dataToSend, bullJobRetry)
                //     }
                // }))
                return caseInfoForms
            }
        } catch (err) {
            logger.error(`Error while send forms and form recipients for particular OPI ${err}`)
            throw err
        }
    }

    /**
     * This functions voids a CaseInfoForm
     * @param {number} caseInfoFormId required
     * @param {*} personId not required
     * @param {*} receivedTransaction not required
     */
    static async voidCaseInfoForm (caseInfoFormId, personId, receivedTransaction, scope = { isPersonIdNeeded: true }) {
        let transaction = receivedTransaction
        try {
            if (!receivedTransaction) {
                transaction = await models.sequelize.transaction()
            }
            if (_.get(scope, 'isPersonIdNeeded', true)) {
                const personController = new PersonController(personId)
                await personController.getDetails(transaction)
            }

            const caseInfoFormResult = await models.CaseInfoForm.findOne({ where: { id: caseInfoFormId }, transaction })
            if (!caseInfoFormResult) throw new Error('CASE_INFO_FORM_NOT_FOUND')
            if (caseInfoFormResult.status !== 'Completed') {
                const envelopDetails = await docuSignClient.fetchEnvelopeStatusFromDocusign(caseInfoFormResult.envelopeId)
                let envelopeStatus = envelopDetails.status || JSON.parse(envelopDetails).status
                if (envelopeStatus && (envelopeStatus.toLowerCase() !== 'completed' && envelopeStatus.toLowerCase() !== 'deleted')) {
                    await docuSignClient.voidDocument(caseInfoFormResult.envelopeId)
                    await models.CaseInfoForm.update({
                        status: 'voided'
                    }, { where: { id: caseInfoFormResult.id }, transaction })
                } else {
                    throw new Error('FORM_IS_ALREADY_COMPLETED_OR_DELETED')
                }
            } else {
                throw new Error('FORM_IS_ALREADY_COMPLETED')
            }
            await caseInfoFormResult.reload({ transaction })
            if (!receivedTransaction) await transaction.commit()
            return caseInfoFormResult
        } catch (error) {
            logger.error(error)
            if (!receivedTransaction) await transaction.rollback()
            throw error
        }
    }

    /**
     * This function downloads a caseInfoForm
     * @param {*} envelopeId required
     * @param {*} personId
     * @param {*} res required
     */
    static async downloadCaseInfoForm (envelopeId, personId) {
        try {
            const personController = new PersonController(personId)
            await personController.getDetails()

            const caseInfoFormResult = await models.CaseInfoForm.findOne({ where: { [Op.and]: [{ personId, envelopeId }] } })
            if (!caseInfoFormResult) throw new Error('CASE_INFO_FORM_NOT_FOUND')

            try {
                const downloadedResult = await docuSignClient.downloadDocument(envelopeId)
                return downloadedResult
            } catch (error) {
                logger.error(`Error while downloading form for particular envelopeId ${error}`)
                throw error
            }
        } catch (error) {
            logger.error(`Error while downloading form for particular envelopeId ${error}`)
            throw error
        }
    }

    static async checkStatusAndReturnUrlOfSentForm (envelopeId, personId) {
        try {
            const caseInfoFormResult = await models.CaseInfoForm.findOne({ where: { [Op.and]: [{ personId, envelopeId }] } })
            if (!caseInfoFormResult) {
                const caseInfoForm = await models.CaseInfoForm.findOne({ where: { envelopeId } })
                if (!caseInfoForm) throw new Error('CASE_INFO_FORM_NOT_FOUND')
            }
            try {
                const previewURL = await docuSignClient.generatePreviewUrl(envelopeId)
                return previewURL
            } catch (error) {
                logger.error(`Error while fetching latest status of from for particular envelopeId ${error}`)
                throw error
            }
        } catch (error) {
            logger.error(`Error while fetching latest status of from for particular envelopeId ${error}`)
            throw error
        }
    }

    /**
     * Fetches the In-Person Signing Hosts
     */
    static async getInPersonHosts () {
        try {
            let hosts = await models.FormInPersonHost.findAll()
            hosts.map(e => {
                e.name = [e.firstName, e.lastName].join(' ').trim()
            })
            return hosts
        } catch (error) {
            logger.error(`Error while fetching In-Person Signing Hosts`)
            throw error
        }
    }
    /**
     * Fetches brands
     */
    static getDocusignBrands () {
        try {
            let brands = models.Docusignbrand.findAll({ attributes: ['id', 'brandName'] })
            return brands
        } catch (error) {
            logger.error(`Error while fetching Docusign brands`)
            throw error
        }
    }
    // FYI: Below methods are developed for embedded signing POC
    // TODO: Developer can use below methods code for new signing flow implementation
    /**
     * This function creates case info form, sends the form to docusign and generates preview URL
     * @param {*} formId caseInfoFormId
     * @param {*} personId
     * @param {*} reqData
     * @param {*} user
     */
    /* static async createCaseInfoFormForEmbeddedSigning (formId, personId, reqData, user) {
        let caseInfoForm
        try {
            if (reqData.signingType === 'embedded') {
                const personController = new PersonController(personId)
                await personController.getDetails()
                const form = await this._getFormById(formId)

                caseInfoForm = await this.createCaseInfoForm(formId, personId, reqData, user.id, 'sent')
                let sendResult = await this.sendFormToDocusignClient(form, caseInfoForm, 'sent')
                const envelopeId = sendResult.createdEnvelopeResult.envelopeId
                let fetchFirstRecipient = sendResult.caseInfoFormRecipientData && sendResult.caseInfoFormRecipientData.signers ? sendResult.caseInfoFormRecipientData.signers.find(eachRecipient => eachRecipient.routingOrder === '1') : null

                const recipientViewResult = await docuSignClient.generatePreviewrecipientUrl(envelopeId, fetchFirstRecipient)
                await caseInfoForm.reload()
                const result = caseInfoForm.toJSON()
                result.recipientSigningUrl = recipientViewResult.redirectUrl
                return result
            } else {
                throw new Error('SigningType should be embedded')
            }
        } catch (err) {
            logger.error(err)
            if (err.message === 'SigningType should be embedded') {
                throw err
            } else {
                await this.deleteCaseInfoForms([caseInfoForm])
                throw err
            }
        }
    } */

    /**
     * To fetch url for signing the recipient in embedded mode
     * @param {*} envelopeId inorder to fetch recipeints
     * @param {*} personId inorder to fetch caseinfoform
     */
    /*  static async fetchNextRecipientViewForSigning (envelopeId, personId) {
        try {
            const caseInfoFormResult = await models.CaseInfoForm.findOne({ where: { [Op.and]: [{ personId, envelopeId }] } })
            if (!caseInfoFormResult) {
                const caseInfoForm = await models.CaseInfoForm.findOne({ where: { envelopeId } })
                if (!caseInfoForm) throw new Error('CASE_INFO_FORM_NOT_FOUND')
            }
            try {
                let latestRecipient
                const caseInfoFormRecipients = await docuSignClient.getRecipientsOfEnvelopeInDocusign(caseInfoFormResult.envelopeId)
                latestRecipient = caseInfoFormRecipients && caseInfoFormRecipients.signers
                    ? caseInfoFormRecipients.signers.find(eachRecipient => eachRecipient.status === 'sent') : []
                let result = {}
                if (latestRecipient && latestRecipient.status !== 'completed') {
                    const recipientViewResult = await docuSignClient.generatePreviewrecipientUrl(envelopeId, latestRecipient)
                    result.recipientSigningUrl = recipientViewResult.redirectUrl
                }
                return result
            } catch (error) {
                console.log(error)
                logger.error(`Error while fetching next recipeintview of given envelopeId ${error}`)
                throw error
            }
        } catch (error) {
            console.log(error)
            logger.error(`Error while fetching receipients of given envelopeId ${error}`)
        }
    } */

    /* static async createCaseInfoFormsAndSendUsingDocusign1 (personId, reqData, currentUser) {
        try {
            const personController = new PersonController(personId)
            const person = await personController.getDetails()

            const forms = await models.Form.findAll({ where: { id: reqData.map(f => f.formId) } })
            if (forms.length !== reqData.length) {
                throw new Error('COULD_NOT_FIND_ALL_FORMS')
            }
            let caseInfoForms = []
            try {
                caseInfoForms = await Promise.all(reqData.map(async formData => {
                    let form = forms.find(f => f.id === formData.formId)
                    const caseInfoForm = await this.createCaseInfoForm(form.id, person.id, formData, currentUser.id, 'created')
                    let sendResult = await this.sendFormToDocusignClient(form, caseInfoForm, 'created')
                    const caseInfoFormRecipientResults = await models.CaseInfoFormRecipient.findAll({ where: { caseInfoFormId: caseInfoForm.id } })
                    // let caseInfoFormRecipientfirstrecipientId = caseInfoFormRecipientResults.filter((ele) => ele.docusignRecipientId === 1)
                    // this.generateRecipientUrlAndSendEmail(personId, caseInfoFormRecipientfirstrecipientId.id, currentUser)
                    return caseInfoForm
                }))
                return caseInfoForms
            } catch (err) {
                await this.deleteCaseInfoForms(caseInfoForms)
                logger.error(`Error while (Inner catch block)send forms and form recipients for particular OPI ${err}`)
                throw err
            }
        } catch (err) {
            logger.error(`Error while (Outer catch block)send forms and form recipients for particular OPI ${err}`)
            throw err
        }
    } */

    async generateRecipientUrlAndSendEmail (personId, recipientId, signingType, currentUser) {
        try {
            let caseInfoFormRecipientResult = await models.CaseInfoFormRecipient.findOne({ where: { id: recipientId },
                include: [{
                    model: models.FormRecipientRole,
                    as: 'recipientRole'
                }] })
            if (!caseInfoFormRecipientResult) {
                throw new Error('CASE_INFO_FORM_RECIPIENT_NOT_FOUND')
            }
            const caseInfoFormResult = await models.CaseInfoForm.findOne({ where: { id: caseInfoFormRecipientResult.caseInfoFormId } })
            if (!caseInfoFormResult) {
                throw new Error('CASE_INFO_FORM_NOT_FOUND')
            }
            if (caseInfoFormResult && !caseInfoFormResult.envelopeId) {
                throw new Error('CASE_INFO_FORM_ENVELOPEID_NOT_FOUND')
            } else {
                const envelopeDetails = JSON.parse(await docuSignClient.fetchEnvelopeStatusFromDocusign(caseInfoFormResult.envelopeId))
                if (envelopeDetails.status === 'created') {
                    try {
                        let result = await docuSignClient.updatingStatusOfEnvelopeInDocusign(caseInfoFormResult.envelopeId, { status: 'sent' })
                        if (result) {
                            await models.CaseInfoForm.update({
                                status: 'sent'
                            }, {
                                where: { id: caseInfoFormResult.id }
                            })
                        }
                    } catch (e) {
                        throw new Error('FAILED_UPDATING_DOCUSIGN_STATUS')
                    }
                }
                const caseInfoFormRecipientsFromDocusign = await docuSignClient.getRecipientsOfEnvelopeInDocusign(caseInfoFormResult.envelopeId)
                // Update docusignClientUserId for old recipients
                if (caseInfoFormRecipientsFromDocusign && caseInfoFormRecipientResult.docusignClientUserId === null) {
                    if (caseInfoFormRecipientResult.recipientRole && caseInfoFormRecipientResult.recipientRole.docusignRole) {
                        let docusignRecipient = caseInfoFormRecipientsFromDocusign.signers.find((ele) => ele.roleName === caseInfoFormRecipientResult.recipientRole.docusignRole)
                        if (docusignRecipient) {
                            await models.CaseInfoFormRecipient.update({
                                personSigningOrder: docusignRecipient.routingOrder,
                                docusignClientUserId: docusignRecipient.clientUserId
                            }, { where: { id: recipientId } })
                            caseInfoFormRecipientResult = await models.CaseInfoFormRecipient.findOne({ where: { id: recipientId } })
                        }
                    }
                }

                let signingOrder = caseInfoFormRecipientResult.personSigningOrder
                let dbClientUserId = caseInfoFormRecipientResult.docusignClientUserId
                if (signingOrder > 1) {
                    let prevRecpts = caseInfoFormRecipientsFromDocusign.signers.filter((ele) => Number(ele.routingOrder) < signingOrder)
                    prevRecpts.forEach(e => {
                        if (e.status !== 'completed') {
                            throw new Error('PREVIOUS_SIGNER_DID_NOT_SIGN_YET')
                        }
                    })
                }
                let formRecipient
                if (caseInfoFormRecipientResult.docusignClientUserId) {
                    formRecipient = caseInfoFormRecipientsFromDocusign.signers.find((ele) => {
                        if (ele.clientUserId && caseInfoFormRecipientResult.docusignClientUserId && (ele.clientUserId === caseInfoFormRecipientResult.docusignClientUserId)) {
                            return ele
                        }
                    })
                } else {
                    formRecipient = caseInfoFormRecipientsFromDocusign.signers.find((ele) => {
                        if (ele.routingOrder && signingOrder && (Number(ele.routingOrder) === signingOrder)) {
                            return ele
                        } else {
                            return null
                        }
                    })
                }
                if (envelopeDetails.status === 'completed') {
                    if (caseInfoFormResult.status !== 'completed') {
                        await models.CaseInfoForm.update({
                            status: 'completed'
                        }, {
                            where: { id: caseInfoFormResult.id }
                        })
                        await this.updateCaseInfoFormRecipient(caseInfoFormRecipientResult.id)
                    }
                    throw new Error('CASE_INFO_FORM_ENVELOPE_IS_COMPLETED')
                }
                if (formRecipient) {
                    let recipientViewResult
                    try {
                        recipientViewResult = await docuSignClient.generatePreviewrecipientUrl(caseInfoFormResult.envelopeId, formRecipient)
                    } catch (error) {
                        logger.info(`Failed to generate recipient view url for envelope ${caseInfoFormResult.envelopeId} and recipient - ${JSON.stringify(formRecipient)}`)
                        throw error
                    }
                    if (formRecipient.status === 'completed') {
                        if (caseInfoFormRecipientResult.status !== 'completed') {
                            await this.updateCaseInfoFormRecipient(caseInfoFormRecipientResult.id)
                        }
                        throw new Error('ALREADY_SIGNED')
                    }
                    if (signingType === 'embedded') {
                        // Need to send url
                        return recipientViewResult
                    } else {
                        // Need to send mail to the recipient for signing
                        // const caseInfoForm = await models.CaseInfoForm.scope('form', 'recipients', 'personInfo').findByPk(caseInfoFormRecipientResult.caseInfoFormId)
                        const caseInfoForm = await models.CaseInfoForm.scope('recipients').findByPk(caseInfoFormRecipientResult.caseInfoFormId)
                        let recipientDetails = caseInfoForm.recipients.find((ele) => {
                            if (ele.docusignClientUserId && dbClientUserId && (ele.docusignClientUserId === dbClientUserId)) {
                                return ele
                            } else if (ele.personSigningOrder && signingOrder && (ele.personSigningOrder === signingOrder)) {
                                return ele
                            }
                        })
                        let rDetails = this.getRecipientNameAndEmailDetails(recipientDetails)
                        let metaData = JSON.parse(caseInfoFormResult.metaData)
                        let clLogo = 'https://clcimagesdev.blob.core.windows.net/opi-dev/locationImages/cl-logo.png'
                        let brandName = 'Brand Name'
                        if (metaData.brandId) {
                            let brandDetails = await this.getBrandAndLogo(metaData.brandId)
                            clLogo = brandDetails.clLogo
                            brandName = brandDetails.brandName
                        }
                        let baseUrl = process.env.BASE_URL
                        let data = {
                            clLogo: clLogo,
                            url: `${baseUrl}/api/v1/docusignlink/${recipientId}`,
                            brandName: brandName,
                            emailBody: this.nl2br(metaData.emailMessage)
                        }
                        let htmlTemplate = path.resolve(__dirname, `../../../utils/generatePDF/htmlTemplates/docusignTemplate.html`)
                        let renderedHtml = await makeHTML(htmlTemplate, data)
                        await Email.sendMail(rDetails.email, metaData.emailSubject, null, null, null, null, null, renderedHtml)
                        await models.CaseInfoFormRecipient.update({
                            isEmailSentForSigning: true
                        }, {
                            where: { id: caseInfoFormRecipientResult.id }
                        })
                        return { message: 'Mail sent' }
                    }
                } else {
                    throw new Error('RECIPIENT_NOT_FOUND_FOR_DOCUSIGN_FORM')
                }
            }
        } catch (err) {
            logger.error(`Error while (Outer catch block)send forms and form recipients for particular OPI ${err}`)
            throw err
        }
    }

    nl2br (str, isXhtml) {
        if (typeof str === 'undefined' || str === null) {
            return ''
        }
        var breakTag = (isXhtml || typeof isXhtml === 'undefined') ? '<br/>' : '<br>'
        return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2')
    }

    async updateCaseInfoFormRecipient (caseInfoFormRecptId) {
        try {
            let caseInfoFormRecpt = await models.CaseInfoFormRecipient.update({
                status: 'completed'
            }, {
                where: { id: caseInfoFormRecptId }
            })
            return caseInfoFormRecpt
        } catch (err) {
            logger.error(`Error while updating CaseInfoFormRecipient status to completed ${err}`)
            throw err
        }
    }

    getRecipientNameAndEmailDetails (recipientDetails) {
        let rDetails = {}
        if (recipientDetails.employeeId) {
            rDetails = this.recipientMapper(recipientDetails, {
                name: this.createColumnNameObject('employee.name', true),
                email: this.createColumnNameObject('employee.email', true, undefined, 'usedDefaultEmail')
            })
        } else if (recipientDetails.personContact) {
            rDetails = this.recipientMapper(recipientDetails, {
                name: this.createColumnNameObject('personContact.person', true, returnFullName),
                email: this.createColumnNameObject('personContact.person.email', true, undefined, 'usedDefaultEmail')
            })
        } else if (recipientDetails.agreementPersonId) {
            rDetails = this.recipientMapper(recipientDetails, {
                name: this.createColumnNameObject('agreementPerson.person', true, returnFullName),
                email: this.createColumnNameObject('agreementPerson.person.email', true, undefined, 'usedDefaultEmail')
            })
        } else if (recipientDetails.agreementPropertyOwnerId) {
            rDetails = this.recipientMapper(recipientDetails, {
                name: this.createColumnNameObject('agreementPropertyOwner.person', true, returnFullName),
                email: this.createColumnNameObject('agreementPropertyOwner.person.email', true, undefined, 'usedDefaultEmail')
            })
        } else if (recipientDetails.certifierId) {
            rDetails = this.recipientMapper(recipientDetails, {
                name: this.createColumnNameObject('certifier.certifierPerson', true, returnFullName),
                email: this.createColumnNameObject('certifier.certifierPerson.email', true, undefined, 'usedDefaultEmail')
            })
        } else if (recipientDetails.otherRecipientId) {
            rDetails = this.recipientMapper(recipientDetails, {
                name: this.createColumnNameObject('otherRecipient.name', true),
                email: this.createColumnNameObject('otherRecipient.email', true, undefined, 'usedDefaultEmail')
            })
        }
        if (recipientDetails.formRecipientRoleCarbonCopyEmailId) {
            rDetails = this.recipientMapper(recipientDetails, {
                name: this.createColumnNameObject('Embalmingteam', false),
                email: this.createColumnNameObject('formRecipientRoleCarboncopyEmail.email', true, undefined, 'usedDefaultEmail')
            })
        }
        return rDetails
    }

    async getBrandAndLogo (brandId) {
        const brand = await models.Docusignbrand.findOne({
            where: { id: brandId }
        })
        let clLogo, brandName
        switch (brand.brandName) {
        case 'Brand Name':
            clLogo = 'https://clcimagesdev.blob.core.windows.net/opi-dev/locationImages/cl-logo.png'
            brandName = 'Brand Name'
            break
        case 'SSO':
            clLogo = 'https://clcimagesdev.blob.core.windows.net/opi-dev/locationImages/Sneider_And_Sullivan_O_Connells.png'
            brandName = `Sneider & Sullivan & O'Connell's`
            break
        case 'Miller Dutra':
            clLogo = 'https://clcimagesdev.blob.core.windows.net/opi-dev/locationImages/CoastSide_Chapel.png'
            brandName = 'Miller Dutra Coast-side Chapel'
            break
        case 'CNG':
            clLogo = 'https://clcimagesdev.blob.core.windows.net/opi-dev/locationImages/Crosby_N_Gray.png'
            brandName = 'Crosby-N. Gray & Co. Funeral Home'
            break
        case 'ACCS':
            clLogo = 'https://clcimagesdev.blob.core.windows.net/opi-dev/locationImages/All_Country.png'
            brandName = 'All County Cremation Services'
            break
        default:
            clLogo = 'https://clcimagesdev.blob.core.windows.net/opi-dev/locationImages/cl-logo.png'
            brandName = 'Brand Name'
        }
        return { brandName, clLogo }
    }

    // Generating Preview URL for composite Forms and updating recipients orderOfSigning to docusign
    static async generatePreviewUrl (envelopeId) {
        // const createLock = await docuSignClient.setEnvelopeLock(envelopeId)
        const url = await docuSignClient.generatePreviewUrl(envelopeId)
        const previewURL = `${url}&sendButtonAction=redirect&showEditPages=false&showHeaderActions=false&showEditDocumentVisibility=false&showEditDocuments=false&showEditRecipients=false&backButtonAction=redirect&showBackButton=false`
        // const previewURL = `${url}&sendButtonAction=redirect&showEditPages=false&showHeaderActions=false&showEditDocumentVisibility=false&showEditDocuments=false&showEditRecipients=false&backButtonAction=redirect&showBackButton=false&lockToken=${createLock.lockToken}`
        return { previewURL }
    }

    // Change routingOrder of recipients
    static async adjustRoutingOrder (envelopeId, caseInfoFormId, recipientsWithChangedRoutingOrder) {
        try {
            const caseInfoFormResult = await models.CaseInfoForm.findOne({ where: { id: caseInfoFormId } })
            if (caseInfoFormResult.status === 'created') {
                await docuSignClient.updatingRecipientsInDocusign(envelopeId, { signers: recipientsWithChangedRoutingOrder })
                let fetchRecipientsAfterChangingRountingOrder = await docuSignClient.getRecipientsOfEnvelopeInDocusign(envelopeId)
                await this.updateCaseInfoFormRecipientPersonSigningOrder(caseInfoFormId, fetchRecipientsAfterChangingRountingOrder.signers)
                return fetchRecipientsAfterChangingRountingOrder
            } else {
                throw new Error('CASEINFOFORM/ENVELOPE_STATUS_IS_NOT_IN_INPROGRESS')
            }
        } catch (err) {
            logger.error(`Error while changing routing order of recipients in an envelope ${err}`)
            throw err
        }
    }

    static async updateCaseInfoFormRecipientPersonSigningOrder (caseInfoFormId, docusignSigners) {
        try {
            for (var signer of docusignSigners) {
                await models.CaseInfoFormRecipient.update({
                    personSigningOrder: signer.routingOrder
                }, {
                    where: {
                        caseInfoFormId,
                        docusignClientUserId: signer.clientUserId
                    }
                })
            }
        } catch (err) {
            logger.error(`Error while updating CaseInfoFormRecipient PersonSigningOrder ${err}`)
            throw err
        }
    }

    static async confirmAndChangeEnvelopeStatusToSent (envelopeId) {
        let caseInfoFormResult
        try {
            caseInfoFormResult = await models.CaseInfoForm.findOne({ where: { envelopeId } })
            if (caseInfoFormResult) {
                const getLock = await docuSignClient.getEnvelopeLock(envelopeId)
                if (getLock) {
                    const result = await docuSignClient.updatingStatusOfEnvelopeInDocusign(envelopeId, { status: 'sent' }, getLock.lockToken)
                    if (result) {
                        await models.CaseInfoForm.update({
                            status: 'sent'
                        }, {
                            where: { id: caseInfoFormResult.id }
                        })
                    }
                    return result
                } else {
                    const result = await docuSignClient.updatingStatusOfEnvelopeInDocusign(envelopeId, { status: 'sent' })
                    if (result) {
                        await models.CaseInfoForm.update({
                            status: 'sent'
                        }, {
                            where: { id: caseInfoFormResult.id }
                        })
                    }
                    return result
                }
            } else {
                throw new Error('CASEINFOFORM_WITH_PROVIDED_ENVELOPEID_NOT_EXIST')
            }
        } catch (err) {
            if (err.error && err.error.errorCode === 'EDIT_LOCK_ENVELOPE_NOT_LOCKED') {
                try {
                    const result = await docuSignClient.updatingStatusOfEnvelopeInDocusign(envelopeId, { status: 'sent' })
                    if (result) {
                        await models.CaseInfoForm.update({
                            status: 'sent'
                        }, {
                            where: { id: caseInfoFormResult.id }
                        })
                    }
                    return result
                } catch (err) {
                    logger.error(`Error while changing the status of envelope to sent ${err}`)
                    throw err
                }
            } else {
                logger.error(`Error while changing the status of envelope to sent ${err}`)
                throw err
            }
        }
    }

    async getMergeRecipients (body) {
        try {
            const { caseInfoFormId, envelopeId } = body
            let signers = []
            let recipients = []

            const caseInfoForm = await models.CaseInfoForm.scope('recipients').findByPk(caseInfoFormId)

            if (caseInfoForm && caseInfoForm.recipients) {
                recipients = caseInfoForm.recipients.map(recipient => {
                    if (recipient.employeeId) {
                        return this.recipientMapper(recipient, {
                            id: this.createColumnNameObject('employee.id', true),
                            name: this.createColumnNameObject('employee.name', true),
                            email: this.createColumnNameObject('employee.email', true, undefined, 'usedDefaultEmail'),
                            docusignRole: this.createColumnNameObject('recipientRole.docusignRole', true)
                        })
                    }
                    if (recipient.personContact) {
                        return this.recipientMapper(recipient, {
                            id: this.createColumnNameObject('personContact.person.id', true),
                            name: this.createColumnNameObject('personContact.person', true, returnFullName),
                            email: this.createColumnNameObject('personContact.person.email', true, undefined, 'usedDefaultEmail'),
                            docusignRole: this.createColumnNameObject('recipientRole.docusignRole', true)
                        })
                    }
                    if (recipient.agreementPersonId) {
                        return this.recipientMapper(recipient, {
                            id: this.createColumnNameObject('agreementPerson.person.id', true),
                            name: this.createColumnNameObject('agreementPerson.person', true, returnFullName),
                            email: this.createColumnNameObject('agreementPerson.person.email', true, undefined, 'usedDefaultEmail'),
                            docusignRole: this.createColumnNameObject('recipientRole.docusignRole', true)
                        })
                    }
                    if (recipient.agreementPropertyOwnerId) {
                        return this.recipientMapper(recipient, {
                            id: this.createColumnNameObject('agreementPropertyOwner.person.id', true),
                            name: this.createColumnNameObject('agreementPropertyOwner.person', true, returnFullName),
                            email: this.createColumnNameObject('agreementPropertyOwner.person.email', true, undefined, 'usedDefaultEmail'),
                            docusignRole: this.createColumnNameObject('recipientRole.docusignRole', true)
                        })
                    }
                    if (recipient.certifierId) {
                        return this.recipientMapper(recipient, {
                            id: this.createColumnNameObject('certifier.certifierPerson.id', true),
                            name: this.createColumnNameObject('certifier.certifierPerson', true, returnFullName),
                            email: this.createColumnNameObject('certifier.certifierPerson.email', true, undefined, 'usedDefaultEmail'),
                            docusignRole: this.createColumnNameObject('recipientRole.docusignRole', true)
                        })
                    }
                    if (recipient.otherRecipientId) {
                        return this.recipientMapper(recipient, {
                            id: this.createColumnNameObject('otherRecipient.id', true),
                            name: this.createColumnNameObject('otherRecipient.name', true),
                            email: this.createColumnNameObject('otherRecipient.email', true, undefined, 'usedDefaultEmail'),
                            docusignRole: this.createColumnNameObject('recipientRole.docusignRole', true)
                        })
                    }
                    if (recipient.formRecipientRoleCarbonCopyEmailId) {
                        return this.recipientMapper(recipient, {
                            id: this.createColumnNameObject('formRecipientRoleCarboncopyEmail.id', true),
                            name: this.createColumnNameObject('Embalmingteam', false),
                            email: this.createColumnNameObject('formRecipientRoleCarboncopyEmail.email', true, undefined, 'usedDefaultEmail'),
                            docusignRole: this.createColumnNameObject('recipientRole.docusignRole', true)
                        })
                    }
                })

                const caseInfoFormRecipientData = await docuSignClient.getRecipientsOfEnvelopeInDocusign(envelopeId)
                const mergedRecipientResult = await BaseForm.mergeRecipients(envelopeId, caseInfoFormRecipientData)
                signers = mergedRecipientResult ? mergedRecipientResult.signers : []

                for (const s of signers) {
                    s.roles = []
                    s.roles.push(s.roleName)
                    for (const r of recipients) {
                        if (r.docusignRole.toLowerCase() !== s.roleName.toLowerCase() && r.name.toLowerCase() === s.name.toLowerCase() && r.email.toLowerCase() === s.email.toLowerCase()) {
                            s.roles.push(r.docusignRole)
                        }
                    }
                }

                if (signers.length && caseInfoForm.recipients.length) {
                    const { queueNames, queues } = require('../../../appQueues')
                    const dataToSend = { caseInfoFormId: caseInfoForm.id, signers, recipients: caseInfoForm.recipients }
                    const docusignDuplicateRecipientsRemovalQueue = queues[queueNames.docusign_duplicate_recipients_removal]
                    docusignDuplicateRecipientsRemovalQueue.add('removeDuplicateRecipients', dataToSend, bullJobRetry)
                }
            }
            return { signers }
        } catch (err) {
            logger.error(`Error while getting merge recipients ${err}`)
            throw err
        }
    }

    async validateEmail (email) {
        try {
            const options = {
                method: 'POST',
                url: 'https://api.sendgrid.com/v3/validations/email',
                headers: { 'content-type': 'application/json',
                    authorization: `Bearer ${process.env.SEND_GRID_KEY}` },
                body: { email: email, source: 'signup' },
                json: true
            }
            const { result } = await request(options)
            if (result.verdict === 'Valid') return true
            else throw new Error('EMAIL_ID_IS_INVALID')
        } catch (err) {
            throw err
        }
    }
}

module.exports = formsController
