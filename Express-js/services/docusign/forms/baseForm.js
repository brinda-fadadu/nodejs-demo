const models = require('../../../models')
const _ = require('underscore')
const { docuSignClient } = require('../../../services').docusign
// const { v4: uuidv4 } = require('uuid')

class BaseForm {
    constructor ({ caseInfoFormId }) {
        this.caseInfoFormId = caseInfoFormId
    }

    async init () {
        // PersonInfo scope returns null when there is no data for includes but there is a row for Person
        // Ideally it should return person data at least. Need to see why.
        // let where = {}
        // if (this.formId) {
        //   where = {formId: this.formId}
        // }
        // console.log('this.formId', this.formId)
        const caseInfoForm = await models.CaseInfoForm.scope('form', 'templates', 'recipients', 'personInfo').findByPk(this.caseInfoFormId,
            {
                order: [[{ model: models.CaseInfoFormTemplate, as: 'templates' }, 'id', 'DESC']]
                // include: [{
                //   model: models.CaseInfoFormTemplate,
                //   as: 'templates',
                //   where,
                //   include: [{
                //       model: models.Form,
                //       as: 'form'
                //   }]
                // }],
            })
        this.caseInfoForm = caseInfoForm
        this.person = caseInfoForm.Person
        this.recipients = caseInfoForm.recipients
        this.templates = caseInfoForm.templates
        if (caseInfoForm.templates.length > 0) {
            this.form = caseInfoForm.templates[0].form
        } else {
            this.form = caseInfoForm.form
        }
        return true
    }

    /**
     * Get the person's full Name
     */
    get personFullName () {
        return [this.person.firstName, this.person.middleName, this.person.lastName]
            .join(' ')
            .trim()
    }

    /**
     * Gets all the recipients based on the role of the recipient sent as arg
     * @param {} docusignRoleName
     */
    getSignerByRole (docusignRoleName, formId) {
        if (this.recipients) {
            return this.recipients.find(v => {
                return v.recipientRole.docusignRole === docusignRoleName && v.recipientRole.formId === formId
            })
        }
    }

    /**
     * Not using in the project at the moment
     */
    getStaff () {
        if (this.recipients) {
            return this.recipients.filter(v => v.employeeId)
        }
    }

    /**
     * Gets all person contacts
     * Not using in the project at the moment
     */
    getPersonContacts () {
        if (this.recipients) {
            return this.recipients.filter(v => v.personContactId)
        }
    }
    async getState (name) {
        if (name) {
            let state = await models.State.findOne({ where: { name } })
            return (state && state.code) ? state.code : name
        } else {
            return ''
        }
    }
    getCountry (country) {
        country = country === 'United States' ? 'US' : country
        return country
    }
    buildSigner (recipient) {
        if (recipient !== undefined && recipient !== null) {
            const person = recipient.employee ||
                (recipient.personContact ? recipient.personContact.person : '') ||
                recipient.otherRecipient ||
                (recipient.agreementPerson ? recipient.agreementPerson.person : '') ||
                (recipient.agreementPropertyOwner ? recipient.agreementPropertyOwner.person : '') ||
                (recipient.certifier ? recipient.certifier.certifierPerson : '') ||
                (recipient.formRecipientRoleCarboncopyEmail ? recipient.formRecipientRoleCarboncopyEmail : '') ||
                recipient.vendor
            if (recipient.formRecipientRoleCarboncopyEmail) {
                person.name = 'EmbalmingTeam'
            }
            let name = person && person.name
            if (!name) {
                name = [person.firstName, person.middleName, person.lastName].join(' ').trim()
            }

            if (recipient.formRecipientRoleCarboncopyEmail) {
                return {
                    email: recipient.usedDefaultEmail || person.email,
                    name: name,
                    roleName: recipient.recipientRole.docusignRole,
                    recipientId: recipient.id
                }
            } else {
                return {
                    email: recipient.usedDefaultEmail || person.email,
                    name: name,
                    roleName: recipient.recipientRole.docusignRole,
                    recipientId: recipient.id,
                    clientUserId: recipient.docusignClientUserId
                }
            }
        }
    }

    convertToTextTabsLatest (recipient, data, checkBoxData, groupLabelData, emailSubject) {
        if (recipient !== undefined && recipient !== null) {
            const signer = this.buildSigner(recipient)
            const textTabs = []
            for (const [tabLabelKey, value] of Object.entries(data)) {
                textTabs.push({ tabLabel: tabLabelKey, value: value })
            }
            const checkboxTabs = []
            if (checkBoxData) {
                for (const [tabLabelKey, value] of Object.entries(checkBoxData)) {
                    checkboxTabs.push({ tabLabel: tabLabelKey, selected: value })
                }
            }
            const radioGroupTabs = []
            if (groupLabelData) {
                for (const [tabLabelKey, tabLabelValue] of Object.entries(groupLabelData)) {
                    tabLabelValue.map(t => {
                        for (const [key, value] of Object.entries(t)) {
                            radioGroupTabs.push({ groupName: tabLabelKey, radios: [{ selected: value, value: key }] })
                        }
                    })
                }
            }

            let recepientInfo = {
                ...signer,
                tabs: { textTabs, checkboxTabs, radioGroupTabs }
            }

            if (emailSubject) recepientInfo.emailNotification = { emailSubject }

            return recepientInfo
        }
    }

    async envelopeData () {
        throw new Error(`Implement 'envelopData' method for ${this.name} `)
    }

    async createEnvelope (docusignClient, status, transaction) {
        const signersWithData = await this.envelopeData()
        const result = await docusignClient.sendCompositeTemplateEnvelope(
            this.form.docusignTemplateId,
            signersWithData,
            status
        )

        await this.caseInfoForm.update(
            {
                status: status,
                envelopeId: result.envelopeId
            }
        )

        await models.CaseInfoFormRecipient.update(
            {
                status: status,
                docusignFormId: result.envelopeId
            },
            {
                where: { caseInfoFormId: this.caseInfoForm.id }
            }
        )

        return result
    }
    // Below is old method. after setting new signing flow commented method can be removed.
    /* async createEnvelopeData (status, caseInfoFormId, type) {
        try {
            let templateRolesInput = await this.envelopeData()
            const inputToEnvelope = {
                status: status,
                templateId: this.form.docusignTemplateId,
                templateRoles: templateRolesInput
            }
            let caseInfoFormRecipientData = {}
            const createdEnvelopeResult = await docuSignClient.creatingEnvelopeInDocusign(inputToEnvelope)
            if (type !== 'preview') {
                caseInfoFormRecipientData = await docuSignClient.getRecipientsOfEnvelopeInDocusign(createdEnvelopeResult.envelopeId)
                if (caseInfoFormRecipientData && caseInfoFormRecipientData.signers) {
                    for (let i in caseInfoFormRecipientData.signers) {
                        let query = `Select  cifr.id from CaseInfoFormRecipient cifr
              INNER JOIN FormRecipientRole formrole on formrole.id = cifr.formRecipientRoleId
              where cifr.caseInfoFormId = ${caseInfoFormId} AND formrole.docusignRole = '${caseInfoFormRecipientData.signers[i].roleName}'`
                        let data = await models.sequelize.query(query,
                            { type: models.sequelize.QueryTypes.SELECT })
                        if (data && data.length) {
                            await models.CaseInfoFormRecipient.update(
                                {
                                    docusignRecipientId: Number(caseInfoFormRecipientData.signers[i].routingOrder)
                                },
                                {
                                    where: { id: data[0].id }
                                }
                            )
                        }
                    }
                }
            }
            if (status !== 'created') {
                await this.caseInfoForm.update(
                    {
                        status: status,
                        envelopeId: createdEnvelopeResult.envelopeId
                    }
                )

                await models.CaseInfoFormRecipient.update(
                    {
                        status: status
                    },
                    {
                        where: { caseInfoFormId: this.caseInfoForm.id }
                    }
                )
            }

            return { createdEnvelopeResult, caseInfoFormRecipientData }
        } catch (err) {
            throw err
        }
    } */

    // can be removed once testing completes for new flow
    async createEnvelopeData (status, caseInfoFormId, type) {
        try {
            // let meta = JSON.parse(this.caseInfoForm.metaData.replace(/'/g, '"'))
            let meta = JSON.parse(this.caseInfoForm.metaData)

            let templateRolesInput = await this.envelopeData()
            let inputToEnvelope = {
                status: status,
                templateId: this.form.docusignTemplateId,
                templateRoles: templateRolesInput
            }
            if (meta && meta.emailSubject && meta.emailMessage) {
                inputToEnvelope.emailSubject = meta.emailSubject
                inputToEnvelope.emailBlurb = meta.emailMessage
            }
            if (meta && meta.brandId) {
                let brand = await this.getBrandData(meta.brandId)
                inputToEnvelope.brandId = brand.brandId
            }

            let formsWithFormQuestions = ['Interment Order Authorization Form', 'Cremation and Disposition Authorization', 'AN Cemetery Package', 'AN Cremation Package']
            if (formsWithFormQuestions.includes(this.form.title)) {
                inputToEnvelope.status = 'created'
            }
            let caseInfoFormRecipientData = {}
            const createdEnvelopeResult = await docuSignClient.creatingEnvelopeInDocusign(inputToEnvelope)
            caseInfoFormRecipientData = await docuSignClient.getRecipientsOfEnvelopeInDocusign(createdEnvelopeResult.envelopeId)
            let conditionForDocusignProcessorObj = {}
            if (formsWithFormQuestions.includes(this.form.title)) {
                conditionForDocusignProcessorObj = await this.updateAndDeleteRecipientTabsForSelectedForms(this.form, this.caseInfoForm, createdEnvelopeResult, caseInfoFormRecipientData, type)
                status = conditionForDocusignProcessorObj && conditionForDocusignProcessorObj.status ? conditionForDocusignProcessorObj.status : status
            }
            if (type !== 'preview') {
                if (caseInfoFormRecipientData && caseInfoFormRecipientData.signers) {
                    for (let i in caseInfoFormRecipientData.signers) {
                        let query = `Select  cifr.id from CaseInfoFormRecipient cifr
              INNER JOIN FormRecipientRole formrole on formrole.id = cifr.formRecipientRoleId
              where cifr.caseInfoFormId = ${caseInfoFormId} AND formrole.docusignRole = '${caseInfoFormRecipientData.signers[i].roleName}'`
                        let data = await models.sequelize.query(query,
                            { type: models.sequelize.QueryTypes.SELECT })
                        if (data && data.length) {
                            await models.CaseInfoFormRecipient.update(
                                {
                                    personSigningOrder: Number(caseInfoFormRecipientData.signers[i].routingOrder)
                                },
                                {
                                    where: { id: data[0].id }
                                }
                            )
                        }
                    }
                }
            }
            if (!(status === 'created' && type === 'preview')) {
                await this.caseInfoForm.update(
                    {
                        status: status,
                        envelopeId: createdEnvelopeResult.envelopeId
                    }
                )
                await models.CaseInfoFormRecipient.update(
                    {
                        status: status
                    },
                    {
                        where: { caseInfoFormId: this.caseInfoForm.id }
                    }
                )
            } else {
                await this.caseInfoForm.update(
                    {
                        envelopeId: createdEnvelopeResult.envelopeId
                    }
                )
            }
            return { createdEnvelopeResult, caseInfoFormRecipientData, conditionForDocusignProcessorObj }
        } catch (err) {
            throw err
        }
    }

    async fetchAgreementIdAndAddendumId (formName) {
        let templates = this.templates
        if (templates.length > 0) {
            let caseInfoFromTemplate = await templates.find(template => template.form && template.form.title === formName)
            if (caseInfoFromTemplate) {
                this.caseInfoForm.agreementId = caseInfoFromTemplate.agreementId
                this.caseInfoForm.addendumId = caseInfoFromTemplate.addendumId
            }
        }
        return true
    }

    async createCompositeEnvelopeData (caseInfoForm, compositeTemplates, status, type, addtionalData) {
        try {
            this.addtionalData = addtionalData
            let meta = JSON.parse(this.caseInfoForm.metaData)
            let inputToEnvelope = { status, compositeTemplates }

            if (meta && meta.emailSubject && meta.emailMessage) {
                inputToEnvelope.emailSubject = meta.emailSubject
                inputToEnvelope.emailBlurb = meta.emailMessage
            }
            if (meta && meta.brandId) {
                let brand = await this.getBrandData(meta.brandId)
                inputToEnvelope.brandId = brand.brandId
            }

            const createdEnvelopeResult = await docuSignClient.creatingEnvelopeInDocusign(inputToEnvelope)
            // update envelopeId in db
            await this.caseInfoForm.update({ envelopeId: createdEnvelopeResult.envelopeId })
            // const envelopeLockResult = await docuSignClient.setEnvelopeLock(createdEnvelopeResult.envelopeId)
            // console.log('envelopeLockResult----', envelopeLockResult)
            // get recipients list from docusign
            const caseInfoFormRecipientData = await docuSignClient.getRecipientsOfEnvelopeInDocusign(createdEnvelopeResult.envelopeId)
            const formsWithFormQuestions = ['Interment Order Authorization Form', 'Cremation and Disposition Authorization', 'AN Cemetery Package', 'AN Cremation Package']
            for (const template of this.templates) {
                let form = template.form
                if (formsWithFormQuestions.includes(form.title)) {
                    const envelopeTemplatesList = await docuSignClient.envelopeTemplatesList(createdEnvelopeResult.envelopeId)
                    let docusignTemplates = envelopeTemplatesList ? envelopeTemplatesList.templates : []
                    let documentId = null
                    if (docusignTemplates.length > 0) {
                        for (const template of this.templates) {
                            let form = template.form
                            if (form.title === 'AN Cremation Package') {
                                const envelopeDocumentList = await docuSignClient.envelopeDocumentList(createdEnvelopeResult.envelopeId)
                                let envelopeDocuments = envelopeDocumentList ? envelopeDocumentList.envelopeDocuments : []
                                for (const document of envelopeDocuments) {
                                    if (document.name === 'Cremation & Disposition Authorization.pdf') {
                                        documentId = document.documentId
                                    }
                                }
                            } else if (formsWithFormQuestions.includes(form.title)) {
                                const template = docusignTemplates.find(template => template.templateId === form.docusignTemplateId)
                                if (template) {
                                    documentId = template.documentId
                                }
                            }
                            await this.updateAndDeleteRecipientTabsForSelectedForms(form, this.caseInfoForm, createdEnvelopeResult, caseInfoFormRecipientData, documentId)
                        }
                    }
                } else {
                    const recipientsToDelete = caseInfoFormRecipientData.signers.filter(this.comparer(caseInfoForm.recipients))
                    if (recipientsToDelete && recipientsToDelete.length) {
                        let input = []
                        recipientsToDelete.map(r => { input.push({ recipientId: r.recipientId }) })
                        await docuSignClient.deleteRecipientsInDocusign(createdEnvelopeResult.envelopeId, { 'signers': input })
                    }
                }
            }

            // update recipients routing order in db
            await this.updateRoutingOrderOfRecipientsInDB(caseInfoFormRecipientData.signers, caseInfoForm.recipients, caseInfoForm.id)
            return { caseInfoForm: this.caseInfoForm }
        } catch (err) {
            throw err
        }
    }

    async updateRoutingOrderOfRecipientsInDB (docusignSignersResult, dbSigners, caseInfoFormId) {
        if (docusignSignersResult && docusignSignersResult.length && dbSigners && dbSigners.length) {
            docusignSignersResult.map(async docusignSinger => {
                const dbRecipient = dbSigners.find(dbSigner => dbSigner.docusignClientUserId === docusignSinger.clientUserId)
                if (dbRecipient) {
                    await models.CaseInfoFormRecipient.update(
                        {
                            personSigningOrder: Number(docusignSinger.routingOrder)
                        },
                        {
                            where: { caseInfoFormId, id: dbRecipient.id }
                        }
                    )
                }
            })
        }
        return true
    }

    static async merge1 (envelopeId, recipients, signerType) {
        if (recipients && recipients.length) {
            const uniqueSignerRecipients = this.removeDuplicatesInSignerRecipients(recipients)
            let recipientsData = []
            let input = []
            const mergeResult = await Promise.all(uniqueSignerRecipients.map(async eachRecipient => {
                if (eachRecipient.toDeleteDuplicateRecipientIds && eachRecipient.toDeleteDuplicateRecipientIds.length) {
                    // let deletedResult
                    if (signerType === 'signers') {
                        await Promise.all(await eachRecipient.toDeleteDuplicateRecipientIds.map(async dupRecipient => {
                            const fetchTabsOfDuplicateRecipient = await docuSignClient.getRecipientTabs(envelopeId, dupRecipient)
                            let obj = {}
                            obj.recipientId = dupRecipient
                            obj.tabs = fetchTabsOfDuplicateRecipient
                            input.push({ recipientId: dupRecipient })
                            recipientsData.push(obj)
                            return true
                            // console.log('dupRecipient',dupRecipient)
                            // console.log('fetchTabsOfDuplicateRecipient',fetchTabsOfDuplicateRecipient)
                            // const formatedTabsInput = this.formatUpdateTabsInput(fetchTabsOfDuplicateRecipient)
                            // await docuSignClient.updateRecipientTabsInDocusign(envelopeId, eachRecipient.recipientId, formatedTabsInput)
                            // deletedResult = await docuSignClient.deleteSingleRecipientInDocusign(envelopeId, dupRecipient)
                            // return deletedResult
                        }))
                    } else if (signerType === 'carbonCopies') {
                        // let deletedResult
                        let input = []
                        eachRecipient.toDeleteDuplicateRecipientIds.map(async dupRecipient => {
                            input.push({ recipientId: dupRecipient })
                        })
                        // let result = await docuSignClient.deleteRecipientsInDocusign(envelopeId, { 'signers': input })
                        return true
                        // await Promise.all(await eachRecipient.toDeleteDuplicateRecipientIds.map(async dupRecipient => {
                        //     deletedResult = await docuSignClient.deleteSingleRecipientInDocusign(envelopeId, dupRecipient)
                        //     return deletedResult
                        // }))
                    } else { }
                }
            }))
            if (recipientsData.length && input.length) {
                await docuSignClient.updateALLRecipientTabsInDocusign(envelopeId, { 'signers': recipientsData })
                await docuSignClient.deleteRecipientsInDocusign(envelopeId, { 'signers': input })
            }
            // console.log('recipientsData-----', JSON.stringify(recipientsData))
            return mergeResult
        }
    }

    static async merge (recipients) {
        if (recipients && recipients.length) {
            const uniqueSignerRecipients = this.removeDuplicatesInSignerRecipients(recipients)
            let recipientsData = []
            uniqueSignerRecipients.map(uniqueSignerRecipient => {
                let inputObject = {
                    'recipientId': uniqueSignerRecipient.recipientId,
                    'routingOrder': uniqueSignerRecipient.routingOrder,
                    'roleName': uniqueSignerRecipient.roleName
                }
                recipientsData.push(inputObject)
                uniqueSignerRecipient.toDeleteDuplicateRecipientIds.map(toDeleteDuplicateRecipientId => {
                    let toDeleteDuplicateRecipientIdInputObject = {
                        'recipientId': toDeleteDuplicateRecipientId,
                        'routingOrder': uniqueSignerRecipient.routingOrder,
                        'roleName': uniqueSignerRecipient.roleName
                    }
                    recipientsData.push(toDeleteDuplicateRecipientIdInputObject)
                })
            })
            if (recipientsData.length) {
                for (var i = 0; i < recipientsData.length; i++) {
                    recipientsData[i].routingOrder = parseInt(recipientsData[i].routingOrder)
                }
                recipientsData = recipientsData.sort((a, b) => {
                    return a.routingOrder - b.routingOrder
                })

                for (let i = 0; (i <= recipientsData.length - 1 && recipientsData.length > 1); i++) {
                    if (i === recipientsData.length - 1) {
                        if (recipientsData[i - 1].routingOrder !== recipientsData[i].routingOrder) {
                            recipientsData[i].routingOrder = recipientsData[i - 1].routingOrder + 1
                        }
                    } else {
                        if (recipientsData[i].routingOrder === recipientsData[i + 1].routingOrder) {
                            if (recipientsData[i].roleName !== recipientsData[i + 1].roleName) {
                                recipientsData[i + 1].routingOrder = recipientsData[i].routingOrder + 1
                            }
                        } else {
                            if (recipientsData[i].roleName !== recipientsData[i + 1].roleName) {
                                recipientsData[i + 1].routingOrder = recipientsData[i].routingOrder + 1
                            }
                        }
                    }
                }
            }
            return recipientsData
        }
    }

    // remove duplicate recipients in singleform/multipleforms(envelope) from docusign
    static async mergeRecipients (envelopeId, caseInfoFormRecipientData) {
        const signersRecipientData = await this.merge(caseInfoFormRecipientData.signers)
        const ccRecipientData = await this.merge(caseInfoFormRecipientData.carbonCopies)
        await docuSignClient.updatingRecipientsInDocusign(envelopeId, { signers: signersRecipientData, carbonCopies: ccRecipientData }, { combine_same_order_recipients: true })
        let fetchRecipientsAfterMerging = await docuSignClient.getRecipientsOfEnvelopeInDocusign(envelopeId)
        return fetchRecipientsAfterMerging
    }

    // remove duplicate recipients in singleform/multipleforms(envelope) javascript logic
    static removeDuplicatesInSignerRecipients (originalArray) {
        for (let i = 0; i <= originalArray.length - 1; i++) {
            originalArray[i].toDeleteDuplicateRecipientIds = []
            for (let j = i + 1; j <= originalArray.length - 1; j++) {
                if (originalArray[i].name.toLowerCase() === originalArray[j].name.toLowerCase() && originalArray[i].email.toLowerCase() === originalArray[j].email.toLowerCase()) {
                    originalArray[i].toDeleteDuplicateRecipientIds.push(originalArray[j].recipientId)
                    originalArray.splice(j, 1)
                    j--
                }
            }
        }
        return originalArray
    }

    // Format the input to update tabs of a recipient
    static formatUpdateTabsInput (tabsObject) {
        let formatedTabs = {}
        Object.keys(tabsObject).map(ele => {
            formatedTabs[ele] = []
            tabsObject[ele].map(tabvalues => {
                formatedTabs[ele].push({ tabId: tabvalues.tabId })
            })
        })
        return formatedTabs
    }

    async updateAndDeleteRecipientTabsForSelectedForms (form, caseInfoForm, envelopeResult, envelopeRecipientsResult, documentId) {
        if (documentId === null) {
            throw new Error(`Document id is required for form ${form.title}`)
        }
        let Recipienttabs = await docuSignClient.getRecipientsTabsOfEnvelopeInDocusign(envelopeResult.envelopeId, documentId)
        // if (['AN Cemetery Package', 'AN Cremation Package'].includes(form.title)) {
        //     Recipienttabs = await docuSignClient.getRecipientsTabsOfEnvelopeInDocusign(envelopeResult.envelopeId, 5) // 1 is documentId. mostly for all the forms we have 1 document only. thats why hard coded document number
        // } else {
        //     Recipienttabs = await docuSignClient.getRecipientsTabsOfEnvelopeInDocusign(envelopeResult.envelopeId, 1) // 1 is documentId. mostly for all the forms we have 1 document only. thats why hard coded document number
        // }
        let tabIds = {}
        let tabRecipient = {}
        Recipienttabs.initialHereTabs.map((initialHereTab) => {
            tabIds[initialHereTab.tabLabel] = initialHereTab.tabId
            tabRecipient[initialHereTab.tabLabel] = initialHereTab.recipientId
        })
        Recipienttabs.textTabs.map((textTab) => {
            tabIds[textTab.tabLabel] = textTab.tabId
            tabRecipient[textTab.tabLabel] = textTab.recipientId
        })
        let recipientIds = {}
        envelopeRecipientsResult.signers.map((ele) => { recipientIds[ele.recipientIdGuid] = ele.recipientId })
        await Promise.all(envelopeRecipientsResult.signers.map(async (ele) => {
            if (ele.roleName === 'Legal Representative' && ['Interment Order Authorization Form', 'AN Cemetery Package'].includes(form.title)) {
                // let metaData = caseInfoForm.metaData ? JSON.parse(caseInfoForm.metaData.replace(/'/g, '"')) : ''
                let metaData = caseInfoForm.metaData ? JSON.parse(caseInfoForm.metaData) : ''
                let siteverifiedbyfamilypriortoplacement = metaData.siteverifiedbyfamilypriortoplacement ? metaData.siteverifiedbyfamilypriortoplacement : null
                let updatePayload = {
                    'name': 'InitialHere',
                    'tabType': 'initialhereoptional',
                    'tabId': '',
                    'optional': true
                }

                if (siteverifiedbyfamilypriortoplacement === 'Verified') {
                    updatePayload.tabId = tabIds['verifiedInitial']
                    updatePayload.optional = false
                    await this.updateRecipientTabsInDocusign(envelopeResult.envelopeId, ele.recipientId, { 'initialHereTabs': [updatePayload] })

                    updatePayload.tabId = tabIds['waivedInitial']
                    await this.deleteRecipientTabsInDocusign(envelopeResult.envelopeId, ele.recipientId, { 'initialHereTabs': [updatePayload] })
                } else if (siteverifiedbyfamilypriortoplacement === 'Waived') {
                    updatePayload.tabId = tabIds['waivedInitial']
                    updatePayload.optional = false
                    await this.updateRecipientTabsInDocusign(envelopeResult.envelopeId, ele.recipientId, { 'initialHereTabs': [updatePayload] })

                    updatePayload.tabId = tabIds['verifiedInitial']
                    await this.deleteRecipientTabsInDocusign(envelopeResult.envelopeId, ele.recipientId, { 'initialHereTabs': [updatePayload] })
                } else { }
            }

            if (['AssignedTo', 'FuneralAssignedTo'].includes(ele.roleName) && ['Cremation and Disposition Authorization', 'AN Cremation Package'].includes(form.title)) {
                await this.updateOnCremationAndDispositionAuthorization(caseInfoForm, envelopeResult, tabIds, tabRecipient, recipientIds)
            }
        }))

        const recipientsToDelete = envelopeRecipientsResult.signers.filter(this.comparer(caseInfoForm.recipients))
        if (recipientsToDelete && recipientsToDelete.length) {
            let input = []
            recipientsToDelete.map(r => { input.push({ recipientId: r.recipientId }) })
            await docuSignClient.deleteRecipientsInDocusign(envelopeResult.envelopeId, { 'signers': input })
        }
    }

    async updateRecipientTabsInDocusign (envelopeId, recipientId, payload) {
        // eslint-disable-next-line
        return await docuSignClient.updateRecipientTabsInDocusign(envelopeId, recipientId, payload)
    }
    async deleteRecipientTabsInDocusign (envelopeId, recipientId, payload) {
        // eslint-disable-next-line
        return await docuSignClient.deleteRecipientTabsInDocusign(envelopeId, recipientId, payload)
    }

    async updateOnCremationAndDispositionAuthorization (caseInfoForm, envelopeResult, tabIds, tabRecipient, recipientIds) {
        let predefinedData = this.addtionalData['Cremation and Disposition Authorization']
        let intialObject = {
            SelfCheckbox: ['SelfInitial'],
            AgentCheckbox: ['PowerOfAttorneyInitial'],
            SpouseCheckbox: ['SpouseInitial'],
            ChildCheckbox: ['SoleSurvivingChildInitial'],
            ChildrenCheckbox: ['MultipleChildren1Initial', 'MultipleChildren2Initial', 'MultipleChildren3Initial', 'MultipleChildren4Initial', 'MultipleChildren5Initial', 'MultipleChildren6Initial', 'MultipleChildren7Initial', 'MultipleChildren8Initial'],
            RepCheckbox: ['Other1Initial', 'Other2Initial', 'Other3Initial', 'Other4Initial', 'Other5Initial', 'Other6Initial', 'Other7Initial', 'Other8Initial']
        }
        let textBoxObject = {
            ChildrenCheckbox: 'ChildrenCount',
            RepCheckbox: 'OtherAuthorizedRep',
            'Release to Funeral Home': 'ReleaseTo',
            'Send by US priority mail': 'MailExpress',
            'Other lawful disposition': 'Disposition',
            'Release to other': 'ReleaseToIdentification'
        }
        const checkedValue = Object.keys(predefinedData).filter((ele) => predefinedData[ele])[0]

        let updateInitialPayload = {}
        intialObject[checkedValue].map((ele, index) => {
            let update = {
                'name': 'InitialHere',
                'tabType': 'initialhereoptional',
                'optional': false,
                'tabId': tabIds[ele]
            }
            if (index > 0) {
                update.optional = true
            }
            if (updateInitialPayload[tabRecipient[ele]]) {
                updateInitialPayload[tabRecipient[ele]].push(update)
            } else {
                updateInitialPayload[tabRecipient[ele]] = [update]
            }
        })

        delete intialObject[checkedValue]
        delete textBoxObject[checkedValue]
        let deleteInitialPayload = {}
        Object.keys(intialObject).map((ele) => {
            return intialObject[ele].map((ele1) => {
                let update = {
                    'name': 'InitialHere',
                    'tabType': 'initialhereoptional',
                    'optional': false,
                    'tabId': tabIds[ele1]
                }
                if (deleteInitialPayload[tabRecipient[ele1]]) {
                    deleteInitialPayload[tabRecipient[ele1]].push(update)
                } else {
                    deleteInitialPayload[tabRecipient[ele1]] = [update]
                }
            })
        })

        // let metaData = caseInfoForm.metaData ? JSON.parse(caseInfoForm.metaData.replace(/'/g, '"')) : ''
        let metaData = caseInfoForm.metaData ? JSON.parse(caseInfoForm.metaData) : ''

        let dispositionoptions = metaData.dispositionoptions ? metaData.dispositionoptions : null
        let dispositionObject = {
            'Release to Funeral Home': ['ReleaseToFuneralHomeInitial1', 'ReleaseToFuneralHomeInitial2', 'ReleaseToFuneralHomeInitial3', 'ReleaseToFuneralHomeInitial4', 'ReleaseToFuneralHomeInitial5', 'ReleaseToFuneralHomeInitial6', 'ReleaseToFuneralHomeInitial7', 'ReleaseToFuneralHomeInitial8'],
            'Send by US priority mail': ['SendByUSPriorityMailInitial1', 'SendByUSPriorityMailInitial2', 'SendByUSPriorityMailInitial3', 'SendByUSPriorityMailInitial4', 'SendByUSPriorityMailInitial5', 'SendByUSPriorityMailInitial6', 'SendByUSPriorityMailInitial7', 'SendByUSPriorityMailInitial8'],
            'Other lawful disposition': ['OtherLawfulDispositionInitial1', 'OtherLawfulDispositionInitial2', 'OtherLawfulDispositionInitial3', 'OtherLawfulDispositionInitial4', 'OtherLawfulDispositionInitial5', 'OtherLawfulDispositionInitial6', 'OtherLawfulDispositionInitial7', 'OtherLawfulDispositionInitial8'],
            'Placement at Lawn': ['PlacementAtInitial1', 'PlacementAtInitial2', 'PlacementAtInitial3', 'PlacementAtInitial4', 'PlacementAtInitial5', 'PlacementAtInitial6', 'PlacementAtInitial7', 'PlacementAtInitial8'],
            'Placement at Olivet': ['PlacementAtOlivetInitial1', 'PlacementAtOlivetInitial2', 'PlacementAtOlivetInitial3', 'PlacementAtOlivetInitial4', 'PlacementAtOlivetInitial5', 'PlacementAtOlivetInitial6', 'PlacementAtOlivetInitial7', 'PlacementAtOlivetInitial8'],
            'Release to other': ['ReleaseToOtherInitial1', 'ReleaseToOtherInitial2', 'ReleaseToOtherInitial3', 'ReleaseToOtherInitial4', 'ReleaseToOtherInitial5', 'ReleaseToOtherInitial6', 'ReleaseToOtherInitial7', 'ReleaseToOtherInitial8']
        }
        dispositionObject[dispositionoptions].map((ele, index) => {
            let update = {
                'name': 'InitialHere',
                'tabType': 'initialhereoptional',
                'optional': false,
                'tabId': tabIds[ele]
            }
            if (index > 0) {
                update.optional = true
            }
            if (updateInitialPayload[tabRecipient[ele]]) {
                updateInitialPayload[tabRecipient[ele]].push(update)
            } else {
                updateInitialPayload[tabRecipient[ele]] = [update]
            }
        })
        delete dispositionObject[dispositionoptions]
        delete textBoxObject[dispositionoptions]
        Object.keys(dispositionObject).map((ele) => {
            return dispositionObject[ele].map((ele1) => {
                let update = {
                    'name': 'InitialHere',
                    'tabType': 'initialhereoptional',
                    'optional': false,
                    'tabId': tabIds[ele1]
                }
                if (deleteInitialPayload[tabRecipient[ele1]]) {
                    deleteInitialPayload[tabRecipient[ele1]].push(update)
                } else {
                    deleteInitialPayload[tabRecipient[ele1]] = [update]
                }
            })
        })

        let deleteTextPayload = {}
        Object.keys(textBoxObject).map((ele) => {
            let update = {
                'tabLabel': ele,
                'tabId': tabIds[textBoxObject[ele]]
            }
            if (deleteTextPayload[tabRecipient[textBoxObject[ele]]]) {
                deleteTextPayload[tabRecipient[textBoxObject[ele]]].push(update)
            } else {
                deleteTextPayload[tabRecipient[textBoxObject[ele]]] = [update]
            }
        })

        for (let value in updateInitialPayload) {
            await this.updateRecipientTabsInDocusign(envelopeResult.envelopeId, recipientIds[value], { 'initialHereTabs': updateInitialPayload[value] })
        }
        for (let value in deleteInitialPayload) {
            await this.deleteRecipientTabsInDocusign(envelopeResult.envelopeId, recipientIds[value], { 'initialHereTabs': deleteInitialPayload[value], textTabs: deleteTextPayload[value] ? deleteTextPayload[value] : [] })
            delete deleteTextPayload[value]
        }
        for (let value in deleteTextPayload) {
            await this.deleteRecipientTabsInDocusign(envelopeResult.envelopeId, recipientIds[value], { 'textTabs': deleteTextPayload[value] })
        }
    }

    comparer (otherArray) {
        return function (current) {
            return otherArray.filter(function (other) {
                return other.docusignClientUserId === current.clientUserId
            }).length === 0
        }
    }

    async getLocationOfRemains (lorDetails) {
        let transferPlace = lorDetails && lorDetails.transferFromPlace ? lorDetails.transferFromPlace : null
        let transferLoc = lorDetails && lorDetails.transferFromLocation && lorDetails.transferFromLocation.place && lorDetails.transferFromLocation.place.address ? lorDetails.transferFromLocation.place.address : null
        if (!lorDetails || (!transferPlace && !transferLoc)) {
            return ''
        }
        let org = transferPlace && transferPlace.organization ? transferPlace.organization.name : null
        let addressData = transferPlace ? transferPlace.address : null || transferLoc
        const state = await this.getState(addressData.state)
        return addressData ? _.compact([org, addressData.line1,
            addressData.line2,
            addressData.city,
            addressData.county,
            state,
            addressData.country !== 'United States' ? addressData.country : '',
            addressData.zipcode
        ]).join(' ').trim() : ''
    }

    get personContactDetails () {
        let contactDetails = this.recipients.find(ele => ele.personContact)
        if (!contactDetails || !contactDetails.personContact || !contactDetails.personContact.person) {
            return {}
        }
        contactDetails = contactDetails.personContact
        const fullName = [
            contactDetails.person.firstName,
            contactDetails.person.middleName,
            contactDetails.person.lastName
        ]
            .join(' ')
            .trim()
        const relation = contactDetails.relation ? contactDetails.relation.name : ''
        return { fullName, relation }
    }
    // price format - $1,000,000.00
    getPrice (price) {
        let formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            signDisplay: 'never'
        })
        let dollarPrice = '0.00'
        if (price || price === 0) {
            dollarPrice = `${(Math.abs(price)).toFixed(2)}`
        }
        return price >= 0 ? formatter.format(dollarPrice).substring(1) : `-${formatter.format(dollarPrice).substring(1)}`
    };

    getPriceWithDecimial (values) {
        return this.getPrice(Number.parseFloat(values).toFixed(2))
        /* if (values >= 0) {
            return Number.parseFloat(values).toFixed(2)
        } else {
            return ''
        } */
    }
    async getAddress (personAddress) {
        const state = await this.getState(personAddress.state)
        return [personAddress.line1, personAddress.line2, personAddress.city, state, personAddress.country !== 'United States' ? personAddress.country : '', personAddress.zipcode].join(' ').trim()
    }
    getLineAddress (personAddress) {
        return [personAddress.line1, personAddress.line2].join(' ').trim()
    }
    async fetchANStmtDetails (personId) {
        try {
            const result = await models.AgreementPerson.findOne({
                where: {
                    personId,
                    deletedBy: null,
                    deletedAt: null
                },
                include: [{
                    model: models.Agreement,
                    where: {
                        type: 1,
                        needType: 1
                    },
                    include: [{
                        model: models.Location,
                        as: 'location',
                        required: true,
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
                    }]
                }]
            })
            return result
        } catch (err) {
            throw err
        }
    }

    async getBrandData (brandId) {
        try {
            let brand = await models.Docusignbrand.findOne({
                where: { id: brandId }
                // attributes: [ 'id', 'brandId' ]
            })
            return brand
        } catch (err) {
            throw err
        }
    }

    getAgreementData (agreementId) {
        try {
            return models.Agreement.findOne({
                where: { id: agreementId },
                include: [
                    {
                        model: models.Location,
                        as: 'location',
                        required: true,
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
            })
        } catch (err) {
            throw err
        }
    }

    async getAgreementPropertyLocation (agreementId) {
        const id = agreementId || this.caseInfoForm.agreementId
        const [agmntDetails] = await models.Agreement.findAll({
            where: { id: id },
            include: [
                {
                    model: models.AgreementProperty,
                    as: 'agreementProperties',
                    where: { reservationStatus: 'confirmed', deletedAt: null, deletedBy: null },
                    required: false,
                    include: [
                        {
                            model: models.Property,
                            as: 'property',
                            required: true,
                            include: [
                                {
                                    model: models.PropertyGarden,
                                    as: 'propertyGardens',
                                    required: true,
                                    include: [
                                        {
                                            model: models.PropertyCampus,
                                            as: 'propertyCampus',
                                            required: true
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    model: models.Location,
                    as: 'location',
                    required: true
                }
            ]
        })
        return agmntDetails
    }

    async formatPhoneNumber (value) {
        if (!value) {
            return ''
        }
        let val = value.replace(/\D/g, '')
        let newVal = ''
        // format - (XXX) XXX-XXXX
        if (val.length > 0) {
            newVal = `(`
        }
        if (val.length > 3) {
            newVal += `${val.substr(0, 3)}) `
            val = val.substr(3)
        }
        if (val.length > 3 && val.length < 7) {
            newVal += `${val.substr(0, 3)}-`
            val = val.substr(3)
        }
        if (val.length > 6) {
            newVal += `${val.substr(0, 3)}-`
            val = val.substr(3)
        }
        newVal += val
        return newVal
    }

    // FYI: below code is for embedded signing POC
    /* async createEnvelopeData1 (status, caseInfoFormId, type) {
        try {
            // let meta = JSON.parse(this.caseInfoForm.metaData.replace(/'/g, '"'))
            let meta = JSON.parse(this.caseInfoForm.metaData)

            let templateRolesInput = await this.envelopeData()
            let inputToEnvelope = {
                status: status,
                templateId: this.form.docusignTemplateId,
                templateRoles: templateRolesInput
            }
            if (meta && meta.emailSubject && meta.emailMessage) {
                inputToEnvelope.emailSubject = meta.emailSubject
                inputToEnvelope.emailBlurb = meta.emailMessage
            }
            if (meta && meta.brandId) {
                let brand = await this.getBrandData(meta.brandId)
                inputToEnvelope.brandId = brand.brandId
            }

            let formsWithFormQuestions = ['Interment Order Authorization Form', 'Cremation and Disposition Authorization', 'AN Cemetery Package', 'AN Cremation Package']
            if (formsWithFormQuestions.includes(this.form.title)) {
                inputToEnvelope.status = 'created'
            }
            let caseInfoFormRecipientData = {}
            const createdEnvelopeResult = await docuSignClient.creatingEnvelopeInDocusign(inputToEnvelope)
            caseInfoFormRecipientData = await docuSignClient.getRecipientsOfEnvelopeInDocusign(createdEnvelopeResult.envelopeId)
            let conditionForDocusignProcessorObj = {}
            if (formsWithFormQuestions.includes(this.form.title)) {
                conditionForDocusignProcessorObj = await this.updateAndDeleteRecipientTabsForSelectedForms(this.form, this.caseInfoForm, createdEnvelopeResult, caseInfoFormRecipientData, type)
                status = conditionForDocusignProcessorObj && conditionForDocusignProcessorObj.status ? conditionForDocusignProcessorObj.status : status
            }
            if (type !== 'preview') {
                if (caseInfoFormRecipientData && caseInfoFormRecipientData.signers) {
                    for (let i in caseInfoFormRecipientData.signers) {
                        let query = `Select  cifr.id from CaseInfoFormRecipient cifr
              INNER JOIN FormRecipientRole formrole on formrole.id = cifr.formRecipientRoleId
              where cifr.caseInfoFormId = ${caseInfoFormId} AND formrole.docusignRole = '${caseInfoFormRecipientData.signers[i].roleName}'`
                        let data = await models.sequelize.query(query,
                            { type: models.sequelize.QueryTypes.SELECT })
                        if (data && data.length) {
                            await models.CaseInfoFormRecipient.update(
                                {
                                    docusignRecipientId: Number(caseInfoFormRecipientData.signers[i].routingOrder)
                                },
                                {
                                    where: { id: data[0].id }
                                }
                            )
                        }
                    }
                }
            }
            // if (status !== 'created') {
                await this.caseInfoForm.update(
                    {
                        status: status,
                        envelopeId: createdEnvelopeResult.envelopeId
                    }
                )
                await models.CaseInfoFormRecipient.update(
                    {
                        status: status
                    },
                    {
                        where: { caseInfoFormId: this.caseInfoForm.id }
                    }
                )
            // }
            return { createdEnvelopeResult, caseInfoFormRecipientData, conditionForDocusignProcessorObj }
        } catch (err) {
            throw err
        }
    } */
}

module.exports = BaseForm
