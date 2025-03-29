const models = require('../../../models')
const moment = require('moment')
const esPerson = require('../../../es_models/person')
const esAgreement = require('../../../es_models/Agreement')
const AddressController = require('../addressController/addressController')
const { getAgreementRoles } = require('../utils')
const { upsert, removePrefix } = require('../utils')
const Sequelize = require('sequelize')
const _ = require('lodash')
const Op = Sequelize.Op
const logger = require('../../../lib/logger')
const CremationSyncToFAAController = require('../familyPortalController/cremationSyncController')

class PersonController {
    constructor (id) {
        this.id = id
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
     * @property {Organization} organization - is the organization details of the place. it exists only if the place is an organization
     * @property {Address} address - is the address details object
     */

    /**
     * @typedef {Object} Person
     * @property {number} id
     * @property {string} prefix
     * @property {string} firstName
     * @property {string} middleName
     * @property {string} lastName
     * @property {string} maidenName
     * @property {string} phoneNumber
     * @property {string} secondaryPhoneNumber
     * @property {string} email
     * @property {number|string} gender
     * @property {date} dateOfBirth
     * @property {Boolean} isAlive
     */

    async getDetails (transaction) {
        return this._loadPerson(transaction)
    }

    /**
     *
     * @param {Person} person
     * @param {Place} addressPlace
     * @param {Address} birthPlace
     * @param {*} transaction
     */
    static async createOrUpdate (person, addressPlace, birthPlace, transaction) {
        let context = {}
        if (!_.isEmpty(addressPlace)) {
            addressPlace = await AddressController.managePlace(addressPlace, transaction)
            person.addressPlaceId = _.get(addressPlace, 'id')
        }
        if (!_.isEmpty(birthPlace)) {
            birthPlace = await AddressController.managePlace(birthPlace, transaction)
            person.birthPlaceId = _.get(birthPlace, 'id')
        }
        if (!_.get(addressPlace, 'organizationId')) {
            // Add ES hook only if person is not from Organization
            context = {
                afterCreate: esPerson.save,
                afterUpdate: esPerson.save
            }
        }
        const createdPerson = await upsert('Person', person, transaction, context)
        return createdPerson
    }

    /**
     * @param {Object} deathDetails
     * @param {data} deathDetails.dateOfDeath
     * @param {Place} deathDetails.placeOfDeath
     * @param {Place} deathDetails.lor
     * @param {*} transaction
     */
    async createOrUpdateDeathDetails (deathDetails, transaction) {
        const esDataUpdate = () => {
            return esPerson.save(this.person, { transaction })
        }
        await this._loadPerson(transaction)
        const existingDeathDetails = await this.getDeathDetails(transaction)
        if (existingDeathDetails) {
            deathDetails.id = existingDeathDetails.id
        }
        deathDetails.personId = this.id
        const upsertedDeathDetails = await upsert('DeathDetails', deathDetails, transaction, {
            afterUpdate: esDataUpdate,
            afterCreate: esDataUpdate
        })
        return upsertedDeathDetails
    }

    async getDeathDetails (transaction) {
        return models.DeathDetails.findOne({
            where: {
                personId: this.id
            },
            transaction
        })
    }

    /**
     * To fetch Person details
     * @param {*} transaction
     */
    async _loadPerson (transaction) {
        // finding the person details of the person
        const person = await models.Person.scope('withBirthPlace').findOne({
            where: {
                id: this.id
            },
            transaction
        })
        if (person) {
            this.person = person
            return person
        } else {
            throw new Error('PERSON_NOT_FOUND')
        }
    }

    async _loadPersonByOpi (opiId) {
        // finding the person details of the person
        const person = await models.Person.scope('withBirthPlace').findOne({
            include: [{
                model: models.PersonVerificationDetails,
                as: 'personVerificationDetails',
                where: {
                    onePortalId: opiId
                }
            }]
        })
        if (person) {
            return person
        } else {
            throw new Error('PERSON_NOT_FOUND')
        }
    }
    /**
     * To generate unique OnePortalId
     */
    static generateOnePortalId () {
        let date = moment().format('YYYY-MM-DD')
        date = date.replace(/[^\w\s]/gi, '')

        let timeStamp = moment()
            .toDate()
            .getTime()
        timeStamp = timeStamp.toString()
        timeStamp = timeStamp.substr(timeStamp.length - 6)

        let uniqueOnePortalId = `CS-${date}-${timeStamp}`
        return uniqueOnePortalId
    }

    /**
     * To know the Person is verified or not
     * @param {*} personId is id of a person
     * @param {*} transaction
     */
    async isVerifiedPerson (transaction) {
        // fetch the person details
        await this._loadPerson(transaction)
        // return whether the person is verified or not
        return this.person.isVerified
    }

    /**
     * To get all the persons related to call
     * @param {*} identifier is call identifier
     * @param {*} transaction
     */
    static async getCallRelatedPerson (identifier, transaction) {
        try {
            const call = await models.Call.findOne({
                where: { identifier },
                include: [
                    {
                        model: models.SomeOnePassed,
                        as: 'someOneHasPassed',
                        include: [
                            {
                                model: models.Person,
                                as: 'decedent'
                            },
                            {
                                model: models.Person,
                                as: 'informant'
                            }
                        ]
                    },
                    {
                        model: models.PreArrangementReason,
                        as: 'preNeedReason',
                        include: [
                            {
                                model: models.Person,
                                as: 'beneficiary'
                            }
                        ]
                    },
                    {
                        model: models.Person,
                        as: 'caller'
                    }
                ],
                transaction
            })
            return call
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * To create Notifier, Informant and Next of Kin contacts for Decedent in a call
     * @param {Object} call represents details of call
     * @param {number} someOneHasPassedIndex is the index of a person who passed away
     * @param {*} transaction
     */
    async createContactsForDecedent (call, someOneHasPassedIndex, transaction) {
        try {
            // requiring inside of method, to avoid circular dependency
            const VerifiedPersonController = require('./verifiedPersonController')
            const decedentId = this.id
            const verifiedPersonController = new VerifiedPersonController(decedentId)

            // Caller contact payload creation
            let callerContactPayload = await this._createContactPayload(
                decedentId, call.caller.toJSON(), call.someOnePassed[someOneHasPassedIndex].callerDecedentRelationId
            )
            const notifierContact = await verifiedPersonController.addOrUpdateNotifer(callerContactPayload, transaction)

            let informantContactPayload
            let isInformantSameAsCaller = call.someOnePassed[someOneHasPassedIndex].isInformantSameAsCaller
            let isCallerNok = call.someOnePassed[someOneHasPassedIndex].isCallerNok
            if (!isInformantSameAsCaller) {
                // Infomant contact payload creation
                informantContactPayload = await this._createContactPayload(
                    decedentId, call.someOnePassed[someOneHasPassedIndex].informant.toJSON(),
                    call.someOnePassed[someOneHasPassedIndex].informantRelationId
                )
            } else {
                informantContactPayload = {
                    id: notifierContact.id,
                    ...callerContactPayload
                }
            }
            await verifiedPersonController.addOrUpdateInformant(informantContactPayload, transaction)

            if (isCallerNok) {
                const nokRequestBody = {
                    ...callerContactPayload,
                    id: notifierContact.id
                }
                await verifiedPersonController.addOrUpdateNok(nokRequestBody, transaction)
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * To create Contact payload
     * @param {*} personId is id of a person
     * @param {Person} contactPersonToBeCreated represents contact details of a person to be created
     * @param {number} relationId
     */
    async _createContactPayload (personId, contactPersonToBeCreated, relationId) {
        try {
            return {
                personId,
                contactType: 1,
                person: {
                    ...contactPersonToBeCreated
                },
                createdAt: Date.now(),
                relationId,
                resourceType: 'Person'
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
    static async getPersonAndContractDetails (eachPerson) {
        let roles = await getAgreementRoles('map')
        if (eachPerson._source) {
            let personFromDb = await models.Person.scope('withPlace', 'withVerificationDetails', 'withDeathDetails').findOne({
                where: {
                    id: eachPerson._source.id,
                    deletedBy: null,
                    deletedAt: null
                }
            })
            const agreements = await models.AgreementPerson.findAll({
                where: {
                    personId: eachPerson._source.id,
                    deletedBy: null,
                    deletedAt: null
                },
                include: [{
                    model: models.Person,
                    as: 'person'
                }]

            })
            const agreementPropertyOwner = await models.AgreementPropertyOwner.findAll({
                where: {
                    ownerId: eachPerson._source.id,
                    deletedBy: null,
                    deletedAt: null
                }
            })
            let payload
            let contractDetails = []
            await Promise.all(agreements.map(async agreement => {
                const agreementDetails = await models.Agreement.findOne({
                    where: {
                        id: agreement.agreementId,
                        contractNumber: { [Op.ne]: null }
                    },
                    include: [{
                        model: models.AgreementPerson,
                        as: 'beneficiary',
                        attributes: ['personId'],
                        where: {
                            deletedAt: null,
                            deletedBy: null
                        }
                    }]
                })
                if (agreementDetails) {
                    payload = {
                        id: agreementDetails.id,
                        contractNumber: agreementDetails.contractNumber,
                        type: agreementDetails.type,
                        role: !(_.get(agreement, 'person.isAlive')) && agreement.roleId === 3 ? 'Decedent' : Object.keys(roles).find(key => roles[key] === agreement.roleId),
                        decedentId: _.get(agreementDetails.beneficiary, '[0].personId', '')
                    }
                    contractDetails.push(payload)
                }
            }))
            await Promise.all(agreementPropertyOwner.map(async agreementOwner => {
                const agreementDetails = await models.Agreement.findOne({
                    where: {
                        contractNumber: { [Op.ne]: null }
                    },
                    include: [{
                        model: models.AgreementProperty,
                        as: 'agreementProperties',
                        where: {
                            id: agreementOwner.agreementPropertyId,
                            deletedAt: null,
                            deletedBy: null
                        }
                    }, {
                        model: models.AgreementPerson,
                        as: 'beneficiary',
                        attributes: ['personId']
                    }]
                })
                if (agreementDetails) {
                    payload = {
                        id: agreementDetails.id,
                        contractNumber: agreementDetails.contractNumber,
                        type: agreementDetails.type,
                        role: 'PropertyOwner',
                        decedentId: _.get(agreementDetails.beneficiary, '[0].personId', '')
                    }
                    contractDetails.push(payload)
                }
            }))
            if (personFromDb) {
                personFromDb = personFromDb.toJSON()
            }
            let result = {
                ...personFromDb,
                ...{ contractDetails }
            }
            return result
        } else return ''
    }

    /**
     * to  search person
     * @param {Object} data
     * @param {number} data.page
     * @param {number} data.limit
     * @param {string} data.q
     * @param {Boolean} data.isVerified
     */

    static async simpleSearch (data) {
        data.page = Number(data.page)
        data.limit = Number(data.limit)
        let limit = data.limit ? data.limit : 10
        let query = removePrefix(data.q.trim())
        let boolQuery = {}
        let searchResults
        let searchData
        try {
            if (data.isOpi && !JSON.parse(data.isOpi)) {
                query = query.toUpperCase()
                boolQuery.must = {
                    query_string: {
                        query: `${query}*`,
                        fields: ['contractNumber']
                    }
                }
                if (data.apiType && data.apiType === 'app') {
                    const agreementQuery = 'SELECT funeralAgreementId, cemeteryAgreementId FROM Quotation where convertedToCase = 1'
                    const agreementIdListArray = await models.sequelize.query(agreementQuery,
                        { type: models.sequelize.QueryTypes.SELECT })
                    const funeralAgreementIdArray = await agreementIdListArray.map(function (item) { return item.funeralAgreementId })
                    const cemeteryAgreementIdArray = await agreementIdListArray.map(function (item) { return item.cemeteryAgreementId })
                    const agreementIdArray = await funeralAgreementIdArray.concat(cemeteryAgreementIdArray)
                    boolQuery.filter = []
                    boolQuery.filter.push({ terms: { id: agreementIdArray } })
                }

                searchResults = await esAgreement.client.search({
                    index: esAgreement.indexName,
                    body: {
                        from: data.page ? (data.page - 1) * limit : 0,
                        size: limit,
                        query: {
                            bool: boolQuery
                        }
                    }
                })

                searchData = await Promise.all(searchResults.hits.hits.map(async record => {
                    const agreementDetails = await models.Agreement.scope('withAgreementPersons', 'commonIncludes').findOne({
                        where: {
                            id: record._source.id
                        }
                    })
                    return agreementDetails
                }))
            } else {
                if (query.split('-')[0] === 'CS') {
                    boolQuery.must = {
                        multi_match: {
                            query: query,
                            type: 'cross_fields',
                            fields: ['onePortalId', 'firstName', 'middleName', 'lastName', 'phoneNumber', 'secondaryPhoneNumber'],
                            operator: 'and'
                        }
                    }
                } else {
                    boolQuery.must = {
                        multi_match: {
                            query,
                            type: 'cross_fields',
                            fields: ['onePortalId', 'firstName', 'middleName', 'lastName', 'phoneNumber', 'secondaryPhoneNumber'],
                            operator: 'or'
                        }
                    }
                }
                boolQuery.filter = []
                if (data.isVerified && JSON.parse(data.isVerified)) {
                    boolQuery.filter.push({ term: { isVerified: data.isVerified === 'true' } })
                }
                if (data.apiType && data.apiType === 'app') {
                    boolQuery.filter.push({ term: { createdAtapp: 'true' } })
                }
                searchResults = await esPerson.client.search({
                    index: esPerson.indexName,
                    body: {
                        from: data.page ? (data.page - 1) * limit : 0,
                        size: limit,
                        query: {
                            bool: boolQuery
                        }
                    }
                })
                searchData = await Promise.all(searchResults.hits.hits.map(async eachPerson => {
                    let personAndContractData = await this.getPersonAndContractDetails(eachPerson)
                    return personAndContractData
                }))
            }
            return {
                totalResults: searchResults.hits.total,
                results: searchData.filter(Boolean)
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    async personElasticSearchByOpi (data) {
        let opi = removePrefix(data.q.trim())
        let persons = await esPerson.search({ 'onePortalId': opi })
        if ((!persons.results) || (persons.results && persons.results._source && persons.results._source.onePortalId !== opi)) {
            // dummy personId as we don't have personId
            let transaction
            try {
                let person = await this._loadPersonByOpi(opi)
                transaction = await models.sequelize.transaction()
                await esPerson.save(person, { transaction })
                await transaction.commit()
                return 'Person is added to Elastic Search verify in Global Search.'
            } catch (err) {
                // Rollback transaction only if the transaction object is defined
                if (transaction) await transaction.rollback()
                logger.error(err)
                throw err
            }
        } else {
            return 'Person is already available in Elastic Search verify in Global Search.'
        }
    }
    /**
     * @param {Object} data
      * @param {number} data.page
     * @param {Array} data.fieldCriteria
     * @param {string} data.matchCriteria
     * @param {Boolean} data.isVerified
     */
    static async advanceSearch (data) {
        let limit = data.limit ? data.limit : 100
        const mainCondition = data.matchCriteria === 'all' ? 'must' : 'should'

        let subQuery = []
        data.fieldCriterias.map((e) => {
            switch (e.field) {
            case 'simpleSearch':
                let query = {}
                if (e.value.trim().split('-')[0] === 'CS') {
                    query = {
                        multi_match: {
                            query: e.value,
                            type: 'cross_fields',
                            fields: ['onePortalId', 'firstName', 'middleName', 'lastName', 'phoneNumber', 'secondaryPhoneNumber'],
                            operator: 'and'
                        }
                    }
                } else {
                    query = {
                        multi_match: {
                            query: `${e.value}`,
                            type: 'cross_fields',
                            fields: ['onePortalId', 'firstName', 'middleName', 'lastName', 'phoneNumber', 'secondaryPhoneNumber'],
                            operator: 'or'
                        }
                    }
                }
                subQuery.push(query)
                break
            case 'address':
                subQuery.push({
                    'query_string': {
                        'query': `*${e.value}*`,
                        'fields': [
                            'fullAddress'
                        ]
                    }
                    // 'multi_match': {
                    //     'query': e.value,
                    //     'type': 'cross_fields',
                    //     'fields': ['address.line1', 'address.line2', 'address.zipcode', 'address.city', 'address.state', 'address.country'],
                    //     'minimum_should_match': 1
                    //     // 'operator': 'and'
                    //     // 'fuzziness': 'AUTO'  // it will search for duplicate spellings like if we want to search 'kalm' and actual word is 'calm' then with this option we will get result as 'calm'
                    // }
                })
                break
            case 'phone':
                if (e.condition === 'contains') {
                    subQuery.push({
                        'wildcard': {
                            'phoneNumber': {
                                'value': `*${e.value}*`,
                                'boost': 1.0
                            }
                        }
                    })
                } else {
                    subQuery.push({
                        'match': {
                            'phoneNumber': e.value
                        }
                    })
                }
                break
            case 'birthDate':
                subQuery.push({
                    'range': {
                        'dateOfBirth':
                            {
                                'gte': e.value.startDate,
                                'lte': e.value.endDate ? e.value.endDate : e.value.startDate
                            }
                    }
                })
                break
            case 'deathDate':
                subQuery.push({
                    'range': {
                        'dateOfDeath':
                            {
                                'gte': e.value.startDate,
                                'lte': e.value.endDate ? e.value.endDate : e.value.startDate
                            }
                    }
                })
                break
            case 'callDate':
                subQuery.push({
                    'range': {
                        'createdAt':
                            {
                                'gte': e.value.startDate,
                                'lte': e.value.endDate ? e.value.endDate : e.value.startDate
                            }
                    }
                })
                break
            case 'serviceDate':
                // TODO: after services module update elastic index w.r.to.. serviceDate
                subQuery.push({
                    'range': {
                        'serviceDate':
                            {
                                'gte': e.value.startDate,
                                'lte': e.value.endDate ? e.value.endDate : e.value.startDate
                            }
                    }
                })
                break
            default:
                break
            }
        })

        let query = {
            'bool': {
                [mainCondition]: subQuery
            }
        }

        query.bool.filter = []
        if (data.isVerified === true || data.isVerified === false) {
            query.bool.filter.push({ term: { isVerified: data.isVerified } })
        }
        if (data.apiType && data.apiType === 'app') {
            query.bool.filter.push({ term: { createdAtapp: 'true' } })
        }
        if (mainCondition === 'should') {
            query.bool.minimum_should_match = 1
        }

        const searchResults = await esPerson.client.search({
            index: esPerson.indexName,
            body: {
                from: data.page ? (data.page - 1) * limit : 0,
                size: limit,
                query: query
            }
        })
        const personSearchData = await Promise.all(searchResults.hits.hits.map(async eachPerson => {
            let personAndContractData = await this.getPersonAndContractDetails(eachPerson)
            return personAndContractData
        }))
        return {
            totalResults: searchResults.hits.total.value !== undefined ? searchResults.hits.total.value : searchResults.hits.total,
            results: personSearchData.filter(Boolean)
        }
    }

    /**
     * add address of the person (residential)
     */
    addAddress () {

    }

    /**
     * update person details
     * @param {Person} personDetails represents details of a person that has to be updated
     * @param {*} transaction
     */
    async updatePersonDetails (personDetails, transaction) {
        // finding the person details
        await this._loadPerson(transaction)
        // setting the updated values to the found person
        this.person.set(personDetails)
        // checking if any detail of the person is changed
        if (!this.person.changed()) {
            // updating the updated person details in elastic search
            await esPerson.save(this.person, { transaction })
        }
        // saving the updated details of the person
        await this.person.save({ transaction })
        return this.person
    }

    /**
     * To Delete Person
     * @param {number} personId is id of a person that has to be deleted
     * @param {number} currentUserId is the id of a current user who is logged in
     * @param {*} transaction
     */
    async deletePerson (currentUserId, transaction) {
        /* Soft delete person */
        let personDetails = {
            id: this.id,
            deletedBy: currentUserId,
            deletedAt: moment().format('MM/DD/YYYY HH:mm:ss')
        }

        let context = {
            afterUpdate: esPerson.delete
        }
        const deletedPerson = await upsert('Person', personDetails, transaction, context)
        return deletedPerson
    }

    /**
     * @param {string} searchTerm - name / licenseNumber of the certifier to be searched
     */
    static searchCertifier (searchTerm) {
        let whereObject = {}
        if (searchTerm) {
            let words = searchTerm.split(' ')
            whereObject = {
                [Op.or]: [
                    { licenseNumber: { [Op.like]: `%${searchTerm}%` } },
                    {
                        '$certifierPerson.firstName$': { [Op.like]: `%${searchTerm}%` }
                    },
                    {
                        '$certifierPerson.middleName$': { [Op.like]: `%${searchTerm}%` }
                    },
                    { '$certifierPerson.lastName$': { [Op.like]: `%${searchTerm}%` } },
                    {
                        '$certifierPerson.firstName$': { [Op.in]: words }
                    },
                    {
                        '$certifierPerson.middleName$': { [Op.in]: words }
                    },
                    {
                        '$certifierPerson.lastName$': { [Op.in]: words }
                    },
                    Sequelize.where(
                        Sequelize.fn('CONCAT', Sequelize.col('certifierPerson.firstName'), ' ',
                            Sequelize.col('certifierPerson.middleName'), ' ',
                            Sequelize.col('certifierPerson.lastName')),
                        { [Op.like]: `%${searchTerm}%` }
                    ),
                    Sequelize.where(
                        Sequelize.fn('CONCAT', Sequelize.col('certifierPerson.firstName'), ' ',
                            Sequelize.col('certifierPerson.lastName')),
                        { [Op.like]: `%${searchTerm}%` }
                    )
                ]
            }
        }
        whereObject.deletedAt = null
        whereObject.deletedBy = null

        return models.Certifier.findAll({
            where: whereObject,
            include: [
                {
                    model: models.Person.scope('withPlace'),
                    as: 'certifierPerson',
                    where: {
                        deletedAt: null,
                        deletedBy: null
                    }
                }
            ]
        })
    }

    /**
     * Get Person Call notes only, not all the notes of a person
     */
    async getPersonRelatedNotes () {
        const notesQuery = `SELECT id,
            content,
            resourceType,
            resourceId,
            level,
            createdAt,
            updatedAt,
            createdByUserName,
            updatedByUserName,
            noteCategoryName,
            noteCategoryId as categoryId,
            noteLevelName as noteLevel
        from Note
        INNER JOIN 
        (
            SELECT id as personResourceId, 'call' as personResourceType from [Call] WHERE callerId = ${this.id}
            UNION
            SELECT callId as personResourceId, 'call' as personResourceType from SomeOnePassed WHERE decedentId = ${this.id}
            UNION
            SELECT callId as personResourceId, 'call' as personResourceType from PreArrangement WHERE beneficiaryId = ${this.id}
            UNION
            SELECT callId as personResourceId, 'call' as personResourceType from GenealogySearchReason WHERE decedentId = ${this.id}
            UNION
            (
                SELECT agreement.id as personResourceId, 'Agreement' as personResourceType from Agreement as agreement
                    INNER JOIN AgreementPerson as agreementPerson ON agreementPerson.agreementId = agreement.id
                WHERE agreementPerson.personId =  ${this.id}
            )
            UNION
            SELECT id as personResourceId, 'Person' as personResourceType from Person where id = ${this.id}
        ) as personResource ON personResource.personResourceId = Note.resourceId AND personResource.personResourceType = Note.resourceType
        INNER JOIN(
            SELECT 
                id as noteCategoryId,
                name as noteCategoryName
            from [NoteCategory]
        ) as noteCategory ON noteCategory.noteCategoryId = Note.categoryId
        INNER JOIN(
            SELECT 
                id as createdByUserId,
                name as createdByUserName,
                email as createdByUserEmail
            from [User]
        ) as createdByUser ON createdByUser.createdByUserId = Note.createdBy
        INNER JOIN(
            SELECT 
                id as updatedByUserId,
                name as updatedByUserName,
                email as updatedByUserEmail
            from [User]
        ) as updatedByUser ON updatedByUser.updatedByUserId = Note.createdBy
        LEFT JOIN(
            SELECT
                id as noteLevelId,
                noteId,
                name as noteLevelName
            from [NoteLevel]
        ) as noteLevel ON noteLevel.noteId = Note.id
        ORDER BY Note.updatedAt DESC`
        const notesList = await models.sequelize.query(notesQuery,
            {
                type: models.sequelize.QueryTypes.SELECT
            })
        return notesList
    }

    // search notifier
    /**
     * @param {string} searchText - name of the notifier to be searched
     * @param {number} addressPlaceId - id of the addressPlace based on which the notifier should be searched
     */

    static async searchNotifiers (searchText, addressPlaceId) {
        let query = {
            deletedAt: null,
            deletedBy: null
        }
        if (addressPlaceId) {
            query.addressPlaceId = addressPlaceId
        } if (searchText) {
            query[Op.or] = [
                {
                    firstName: {
                        [Op.like]: `%${searchText}%`
                    }
                },
                {
                    middleName: {
                        [Op.like]: `%${searchText}%`
                    }
                },
                {
                    lastName: {
                        [Op.like]: `%${searchText}%`
                    }
                }
            ]
        }
        const notifiers = await models.Person.findAll({
            where: query,
            attributes: ['id', 'prefix', 'firstName', 'middleName', 'lastName', 'aka', 'email']
        })
        return notifiers
    }

    /**
     * @param {Person} person
     * @param {number} person.updatedBy - id of the currently logged in user
     */
    async pnTurnAn (person) {
        this.id = person.id
        const result = await models.sequelize.transaction(async (transaction) => {
            let p = await this._loadPerson(transaction)
            if (p.isAlive) {
                let updatedPerson = await upsert('Person', person, transaction, { userId: person.updatedBy })
                const deathDetails = await this.getDeathDetails(transaction)
                if (!deathDetails) {
                    await upsert('DeathDetails', { personId: this.id }, transaction, { userId: person.updatedBy })
                }
                // Sync this person to FAA
                const cremationSyncToFAAController = new CremationSyncToFAAController(updatedPerson.id)
                await cremationSyncToFAAController.updatePersonToFAA(transaction)
                return updatedPerson
            } else {
                throw new Error('PERSON_IS_NOT_ALIVE')
            }
        })
        return result
    }

    static async fetchSSNDetails (OPIids) {
        try {
            const persons = await models.PersonVerificationDetails.scope('withFullSSN').findAll({
                where: {
                    onePortalId: { [Op.in]: OPIids }
                }
            })
            const result = persons.map(p => {
                let value = p.ssn.match(/\d{3}-\d{2}-\d{4}/gmi)
                return { onePortalId: p.onePortalId, ssn: value ? value[0] : null }
            })
            return result
        } catch (err) {
            throw err
        }
    }
    static getssnData (ssn) {
        let data = ''
        let value = ssn.match(/\d{3}-\d{2}-\d{4}/gmi)
        if (value && value.length) {
            data = value[0]
        }
        return data
    }

    static async fetchSSN (detailsArray) {
        try {
            if (!detailsArray.length) {
                return []
            }
            let OPIids = _.get(detailsArray, 'length', 0) ? detailsArray.map(item => item.onePortalId) : []
            const persons = await models.PersonVerificationDetails.scope('withFullSSN').findAll({
                where: {
                    onePortalId: { [Op.in]: OPIids },
                    ssnEncrypted: { [Op.not]: null },
                    ssnSalt: { [Op.not]: null }
                }
            })

            let ssnDetails = await Promise.all(persons.map(async (item) => {
                if (item.ssn) {
                    let ssn = this.getssnData(item.ssn)
                    return {
                        onePortalId: item.onePortalId,
                        ssn: ssn
                    }
                }
            }))
            return _.compact(ssnDetails)
        } catch (err) {
            throw err
        }
    }
}
module.exports = PersonController
