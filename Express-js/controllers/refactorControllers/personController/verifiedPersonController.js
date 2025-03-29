const {
    convertToJson
} = require('../utils')
const models = require('../../../models')
const PersonController = require('./personController')
const AddressController = require('../addressController/addressController')
const { upsert, getContactRoles, getRelations } = require('../utils')
const moment = require('moment')
const _ = require('lodash')
const SchedulingController = require('./../schedulingController/schedulingController')
const logger = require('../../../lib/logger')
const ANRemainsController = require('./anRemainsController')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
class VerifiedPersonController {
    constructor (personId) {
        this.personId = personId
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

    /**
     * @param {Object} personDetails to be changed during verification
     * @param {date} personDetails.dateOfDeath
     * @param {string} personDetails.ssn
     * @param {String} personType is the type of the person being verified(caller/decedent/beneficiary)
     * @param {*} transaction
     */
    async verifyPerson (personDetails = {}, personType = 'caller', transaction) {
        const personToBeVerified = new PersonController(this.personId)
        const isPersonAlreadyVerified = await personToBeVerified.isVerifiedPerson(transaction)
        if (isPersonAlreadyVerified) {
            throw new Error('PERSON_ALREADY_VERIFIED')
        }
        const data = {
            ssn: personDetails.ssn,
            personId: this.personId,
            onePortalId: PersonController.generateOnePortalId(),
            createdBy: personDetails.userId,
            updatedBy: personDetails.userId,
            verifiedBy: personDetails.userId
        }
        personDetails.id = this.personId
        if (personDetails.apiType === 'quotation') {
            personDetails.isVerified = false
            const personData = await PersonController.createOrUpdate(personDetails, personDetails.addressPlace, personDetails.birthPlace, transaction)
            return personData
        }
        personDetails.isVerified = true
        const upsertedVerificationDetails = await models.PersonVerificationDetails.create(data, { transaction })
        // Person createOrUpdate is called after verification details
        // because, person afterhook is to be called for storing OPI
        // present in the person verification details
        await PersonController.createOrUpdate(personDetails, personDetails.addressPlace, personDetails.birthPlace, transaction)
        if (personType === 'decedent' && (_.get(personDetails, 'dateOfDeath') || _.get(personDetails, 'partnerRefNumber'))) {
            const deathDetails = { dateOfDeath: personDetails.dateOfDeath, partnerRefNumber: personDetails.partnerRefNumber }
            await personToBeVerified.createOrUpdateDeathDetails(deathDetails, transaction)
        }
        return upsertedVerificationDetails
    }

    /**
     *
     * @param {*} transaction
     * @param {Boolean} findDeadPerson
     */
    async getVerifiedPerson (transaction, findDeadPerson) {
        const whereObj = {
            id: this.personId,
            isVerified: true
        }
        if (findDeadPerson) {
            whereObj.isAlive = false
        }
        const person = await models.Person.scope('withBirthPlace', 'withPlace', 'withMaritalStatus').findOne({
            where: whereObj,
            include: [
                {
                    model: models.PersonVerificationDetails,
                    as: 'personVerificationDetails',
                    required: true
                }

            ],
            transaction
        })
        if (!person) {
            throw new Error('PERSON_NOT_FOUND')
        }
        this.person = person
        return person
    }

    /**
     * generate onePortalId when the person is verified
     */
    generateOPI () {

    }

    /**
    * get list of ongoing cases
    * @param {Object<{page: Number, limit: Number, opiOrName: String}>} queryObj
    */
    static async getOngoingCases (queryObj = {}) {
        try {
            const page = Number(queryObj.page) || 1
            const limit = Number(queryObj.limit) || 10
            const beneficiaryRole = await models.AgreementRole.findOne({ where: { name: 'Beneficiary' } })
            const requiredRolesIds = `${beneficiaryRole.id}`
            const limiter = process.env.NODE_ENV === 'refactoring' ? 'minutes' : 'days'
            const dayLimit = moment().subtract(15, limiter).toISOString()

            let whereCondition = `WHERE p.isVerified = 1 `
            // let personNameWhere = ''

            if (queryObj.opiOrName) {
                const personName = queryObj.opiOrName.trim('')
                const personNameTemplate = this.getNameTemplate(personName)
                whereCondition += `AND 
                    ([p].[firstName] LIKE '%${personName}%' 
                    OR [p].[middleName] LIKE '%${personName}%' 
                    OR [p].[lastName] LIKE '%${personName}%' 
                    OR [p].[firstName] IN ${personNameTemplate} 
                    OR [p].[middleName] IN ${personNameTemplate} 
                    OR [p].[lastName] IN ${personNameTemplate} 
                    OR [pvd].[onePortalId] LIKE '%${personName}%')`
            }

            let personAppQuery = ''
            let selectField = ''
            const statusAppQuery = `SELECT 
                personId,
                [1] as 'funeralContractsCount',  -- 1 is the type (funeral)
                [2] as 'cemetryContractsCount' -- 2 is the type (cemetery)
                FROM (
                    SELECT 
                    count(ap.personId) as counts, ap.personId, aggrmt.[type]
                    FROM [Agreement] as aggrmt
                    INNER JOIN AgreementPerson as ap on ap.agreementId = aggrmt.id
                    WHERE 
                    aggrmt.status NOT IN ('Voided') 
                    AND ap.deletedAt IS NULL 
                    AND ap.deletedBy IS NULL 
                    AND ap.roleId = ${beneficiaryRole.id} -- beneficiary role id
                    GROUP BY ap.personId, aggrmt.type
                )
                AS stepOne PIVOT(AVG(counts) FOR type IN ([1], [2])) AS agreementCounts -- 1, 2 is the type (funeral, cemetery)`
            selectField = `ac.cemetryContractsCount, ac.funeralContractsCount,`
            const primaryQuery = `
            Person as p
            INNER JOIN (
                (
                    SELECT p.id AS personId, p.isAlive
                    FROM SomeOnePassed as sp
                    INNER JOIN Person as p ON sp.decedentId = p.id
                    INNER JOIN PersonVerificationDetails as pvd ON p.id = pvd.personId
                    WHERE 
                        p.isVerified = 1 -- IS VERIFIED
                        AND pvd.lastTouchedAt > '${dayLimit}' -- LAST TOUCHED BEFORE 15 DAYS
                )
                UNION 
                (
                    SELECT p.id AS personId, p.isAlive
                    FROM
                    PreArrangement as pa
                    INNER JOIN Person as p ON pa.beneficiaryId = p.id
                    INNER JOIN PersonVerificationDetails as pvd ON p.id = pvd.personId
                    WHERE 
                        p.isVerified = 1 -- IS VERIFIED
                        AND pvd.lastTouchedAt > '${dayLimit}' -- LAST TOUCHED BEFORE 15 DAYS
                )
                UNION
                (
                    SELECT p.id AS personId, p.isAlive
                    FROM
                    [Agreement] as aggrmt
                    INNER JOIN AgreementPerson as ap on ap.agreementId = aggrmt.id
                    INNER JOIN Person as p on ap.personId = p.id
                    INNER JOIN PersonVerificationDetails as pvd ON p.id = pvd.personId
                    WHERE 
                        aggrmt.[status] = 'In Progress' -- in progress agreements
                        AND ap.roleId in (${requiredRolesIds}) -- role ids of ben
                )
            ) AS timeRangePeople ON timeRangePeople.personId = p.id
            INNER JOIN PersonVerificationDetails as pvd ON timeRangePeople.personId = pvd.personId
            LEFT OUTER JOIN Arrangement as argmt on argmt.personId = p.id
            LEFT OUTER JOIN (
                ${statusAppQuery}
            ) AS ac on ac.personId = p.id
            ${whereCondition}
            ${personAppQuery}`

            let countQuery = `SELECT count(p.id) as personCount FROM ${primaryQuery}`

            const personsQuery = `SELECT 
            p.id,
            p.isAlive,
            p.firstName,
            p.lastName,
            p.middleName,
            p.prefix,
            pvd.onePortalId,
            pvd.lastTouchedAt,
            ${selectField}
            argmt.id as arrangementId,
            p.dateOfBirth,
            DATEDIFF(year, p.dateOfBirth, GETDATE()) as age
            FROM
            ${primaryQuery}
            order by pvd.lastTouchedAt DESC
            offset ${(page - 1) * (limit)} ROWS
            fetch next ${limit} rows only
            `
            const personsList = await models.sequelize.query(personsQuery,
                { type: models.sequelize.QueryTypes.SELECT })

            const personCountResult = await models.sequelize.query(countQuery,
                { type: models.sequelize.QueryTypes.SELECT })

            const result = {
                onGoingCases: personsList,
                totalResults: personCountResult[0].personCount
            }
            return result
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    static async getOngoingCasesForApp (queryObj = {}) {
        try {
            const page = Number(queryObj.page) || 1
            const limit = Number(queryObj.limit) || 10
            const typeContract = Number(queryObj.type) || null
            const employeeId = Number(queryObj.employeeId) || null
            const purchaserRole = await models.AgreementRole.findOne({ where: { name: 'Purchaser' } })

            let primaryQuery = `
            Agreement as a
            LEFT JOIN AgreementPerson as ap on ap.agreementId = a.id
            LEFT OUTER JOIN Person as p on p.id = ap.personId
            LEFT OUTER JOIN [User] as u on u.id = p.createdBy
            LEFT OUTER JOIN AgreementType as at on at.id = a.type
            WHERE 
                ap.roleId = ${purchaserRole.id}
            AND
                p.createdAtApp = 1`

            if (typeContract) {
                primaryQuery += ` AND a.type = ${typeContract}`
            }
            if (employeeId) {
                const employeeDetails = await models.Employee.findOne({ where: { id: employeeId } })
                if (employeeDetails) {
                    const salesCounselor = await models.User.findOne({ where: { email: employeeDetails.email } })
                    if (salesCounselor && salesCounselor.id) {
                        primaryQuery += ` AND p.createdBy = ${salesCounselor.id}`
                    }
                }
            }

            let countQuery = `SELECT count(a.id) as personCount FROM ${primaryQuery}`

            const personsQuery = `
            SELECT 
                p.id,
                p.firstName,
                p.lastName,
                p.email,
                p.phoneNumber,
                a.contractNumber,
                at.agreementType as typeOfAgreement,
                a.totalCashPrice as costOfAgreement,
                u.name as salesCounselor
            FROM 
            ${primaryQuery}
            ORDER BY a.id DESC 
            offset ${(page - 1) * (limit)} ROWS
            fetch next ${limit} rows only
            `
            const personsList = await models.sequelize.query(personsQuery,
                { type: models.sequelize.QueryTypes.SELECT })

            const personCountResult = await models.sequelize.query(countQuery,
                { type: models.sequelize.QueryTypes.SELECT })

            const result = {
                onGoingCases: personsList,
                totalResults: personCountResult[0].personCount
            }
            return result
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     *
    * @param {*} queryObj is the object of all the queries done for fetching the Duplicate Cases List
    * @param {Number} limit number of records to fetch
    * @param {Number} page the page number to fetch data
    * @param {Date} createdFrom to filter calls based on date
    * @param {Date} createdToDate to filter calls based on the date
    * @param {string} opiOrName search the call through onePortal ID or Person
    * @param {Number} assignedTo get the calls list based on the staffId.
    * @param {string} sortOrder get the calls list based on the first modified or last modified
    */
    static async getListOfCallDuplicates (queryObj) {
        try {
            let sql = `duplicate.details IS NOT NULL `
            Object.keys(queryObj).map((e) => {
                switch (e) {
                case 'caseIds':
                    sql += ` AND [p].[id] IN (select value from STRING_SPLIT('${queryObj.caseIds.join(',')}', ','))`
                    break
                case 'opiOrName':
                    const personName = queryObj.opiOrName.trim('')
                    const personNameTemplate = this.getNameTemplate(personName)
                    sql += ` AND 
                        ([p].[firstName] LIKE '%${personName}%' 
                        OR [p].[middleName] LIKE '%${personName}%' 
                        OR [p].[lastName] LIKE '%${personName}%' 
                        OR [p].[firstName] IN ${personNameTemplate} 
                        OR [p].[middleName] IN ${personNameTemplate} 
                        OR [p].[lastName] IN ${personNameTemplate}
                        OR [p].[onePortalId] LIKE '%${personName}%')`
                    break
                case 'createdFrom':
                case 'createdTo':
                    let startDate = moment(queryObj.createdFrom).tz(queryObj.timezone).startOf('day').format('YYYY/MM/DD')
                    let endDate = moment(queryObj.createdTo).tz(queryObj.timezone).endOf('day').format('YYYY/MM/DD')
                    sql += ` AND [p].[createdAt] between '${startDate}' AND '${endDate}'`
                    break
                case 'arrangerId':
                    sql += ` AND [p].[arrangerId] = ${queryObj.arrangerId}`
                    break
                default:
                    break
                }
            })
            const offset = (queryObj.page - 1) * queryObj.limit
            const sortOrder = queryObj.sortOrder || 'desc'
            const orderByQuery = `ORDER BY [p].[updatedAt] ${sortOrder}`
            let Query = ` 
            DECLARE @DuplicateCallTemp TABLE(
                id int,
                isAlive int,
                firstName VARCHAR(200),
                middleName VARCHAR(200),
                lastName VARCHAR(200),
                onePortalId VARCHAR(200),
                dateOfBirth Date,
                dateofDeath Date,
                createdAt datetime,
                updatedAt datetime,
                arrangerId int,
                arranger VARCHAR(200)
            );
            Insert @DuplicateCallTemp
            SELECT p.id, p.isAlive, p.firstName, p.middleName, p.lastName, pvd.onePortalId, p.dateOfBirth, dds.dateofDeath, p.createdAt, p.updatedAt, emp.id as arrangerId, emp.name as arranger
                FROM
                Person as p
                INNER JOIN (
                    (
                        SELECT p.id AS personId, p.isAlive
                        FROM SomeOnePassed as sp
                        INNER JOIN Person as p ON sp.decedentId = p.id
                        INNER JOIN PersonVerificationDetails as pvd ON p.id = pvd.personId
                        WHERE 
                            p.isVerified = 1
                    )
                    UNION 
                    (
                        SELECT p.id AS personId, p.isAlive
                        FROM
                        PreArrangement as pa
                        INNER JOIN Person as p ON pa.beneficiaryId = p.id
                        INNER JOIN PersonVerificationDetails as pvd ON p.id = pvd.personId
                        WHERE 
                            p.isVerified = 1
                    )
                    UNION
                    (
                        SELECT p.id AS personId, p.isAlive
                        FROM
                        [Agreement] as aggrmt
                        INNER JOIN AgreementPerson as ap on ap.agreementId = aggrmt.id
                        INNER JOIN Person as p on ap.personId = p.id
                        INNER JOIN PersonVerificationDetails as pvd ON p.id = pvd.personId
                        WHERE 
                            ap.roleId in (3) -- role ids of ben
                    )
                ) AS timeRangePeople ON timeRangePeople.personId = p.id
                INNER JOIN AgreementPerson ap ON ap.personId = p.id
                INNER JOIN Agreement a ON ap.agreementId = a.id
                INNER JOIN Employee emp ON emp.id = a.arrangerId
                INNER JOIN PersonVerificationDetails as pvd ON timeRangePeople.personId = pvd.personId
                LEFT JOIN DeathDetails AS dds ON dds.personId = pvd.personId
                WHERE p.isVerified = 1
            
            SELECT p.id, p.isAlive, p.firstName, p.middleName, p.lastName, p.onePortalId, p.createdAt, p.arrangerId, p.arranger, duplicate.details AS duplicateCases from
            @DuplicateCallTemp p
                OUTER APPLY (
                    SELECT (
                        SELECT pp.id, pp.isAlive, pp.onePortalId, pp.firstName, p.middleName, pp.lastName, pp.arrangerId, pp.arranger
                        from @DuplicateCallTemp pp
                        WHERE p.id != pp.id AND p.isAlive = pp.isAlive AND ( pp.onePortalId = p.onePortalId 
                            OR  CAST(p.dateOfBirth AS date) = CAST(pp.dateOfBirth AS date)
                            OR CAST(p.dateofDeath AS date) = CAST(pp.dateofDeath AS date)) 
                            AND (
                                dbo.RemoveSpecialChars(CONCAT(pp.firstName,  ' ', pp.lastName)) LIKE  '%'+  dbo.RemoveSpecialChars(CONCAT(p.firstName,  ' ', p.lastName)) +'%' 
                                OR dbo.RemoveSpecialChars(CONCAT(pp.firstName,  ' ', pp.lastName)) LIKE  '%'+  dbo.RemoveSpecialChars(CONCAT(p.lastName,  ' ', p.firstName)) +'%' 
                                OR dbo.RemoveSpecialChars(CONCAT(pp.lastName,  ' ', pp.firstName)) LIKE '%'+  dbo.RemoveSpecialChars(CONCAT(p.lastName,  ' ', p.firstName)) +'%'
                                OR dbo.RemoveSpecialChars(CONCAT(pp.lastName,  ' ', pp.firstName)) LIKE '%'+  dbo.RemoveSpecialChars(CONCAT(p.firstName,  ' ', p.lastName)) +'%'
                                OR dbo.RemoveSpecialChars(CONCAT(p.firstName,  ' ', p.lastName)) LIKE  '%'+  dbo.RemoveSpecialChars(CONCAT(pp.firstName,  ' ', pp.lastName)) +'%' 
                                OR dbo.RemoveSpecialChars(CONCAT(p.firstName,  ' ', p.lastName)) LIKE  '%'+  dbo.RemoveSpecialChars(CONCAT(pp.lastName,  ' ', pp.firstName)) +'%' 
                                OR dbo.RemoveSpecialChars(CONCAT(p.lastName,  ' ', p.firstName)) LIKE '%'+  dbo.RemoveSpecialChars(CONCAT(pp.lastName,  ' ', pp.firstName)) +'%'
                                OR dbo.RemoveSpecialChars(CONCAT(p.lastName,  ' ', p.firstName)) LIKE '%'+  dbo.RemoveSpecialChars(CONCAT(pp.firstName,  ' ', pp.lastName)) +'%'
                            )
                         FOR JSON PATH
                    ) AS details 
                ) as duplicate
                WHERE ${sql} ${orderByQuery} `
            if (queryObj.page) {
                Query += `OFFSET ${offset} ROWS FETCH NEXT ${queryObj.limit} ROWS ONLY
                            DELETE FROM @DuplicateCallTemp`
            }
            const list = await models.sequelize.query(Query, { type: models.sequelize.QueryTypes.SELECT })
            list.map(e => convertToJson(e))
            await Promise.all(list.map(async lis => {
                lis.arranger = await this.fetchArrangers(lis.id)
            }))
            return { list }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
    static async fetchArrangers (personId) {
        const query = `Select emp.name as arranger from AgreementPerson ap 
        INNER JOIN Agreement a ON ap.agreementId = a.id
        INNER JOIN Employee emp ON emp.id = a.arrangerId where ap.personId = ${personId} AND ap.deletedAt IS NULL`
        const arrangers = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
        const arrangerName = await this.getCommaSeperatedValues(arrangers, 'arranger')
        return arrangerName
    }
    static async getCommaSeperatedValues (values, attribute) {
        var result = values ? values.reduce((unique, o) => {
            if (!unique.some(obj => obj.arranger === o.arranger)) {
                unique.push(o)
            }
            return unique
        }, []) : ''
        const assignedNames = result ? result.reduce((acc, val, index) => {
            const seperator = index < result.length - 1 ? ',  ' : ''
            return acc + val[attribute] + seperator
        }, '') : ''
        return assignedNames
    };

    /**
     * update lastTouchedAt when the person is attached to a call
     */
    async updateLastTouchedAt (transaction) {
        await this.getVerifiedPerson(transaction)
        if (this.person) {
            this.person.personVerificationDetails.lastTouchedAt = Date.now()
            await this.person.personVerificationDetails.save({ transaction })
        }
    }

    /**
     * get list of verified persons of the call (on going cases)
     * @param {String} name
     */

    static getNameTemplate (name) {
        let names = name.split(' ') // caller1 name -> ['caller1', 'name']
        let nameTemplate = "('" + names.join("', '") + "')" // ['a1', 'a2'] -> '('a1', 'a2')'
        return nameTemplate
    }

    /**
     * adding note for the person
     */
    addNote () {

    }

    /**
     * create arrangement(AN - decedent, PN -  beneficiary)
     */
    setActiveArrangement () {

    }

    /**
     * add funeral statement. statement can be added only if arrangement is created
     */
    addFuneralStatement () {

    }

    /**
     * add cemetry contract. contract can be added only if the arrangement is created
     */
    addCemeteryContract () {

    }

    /**
     * get primaryDetails of the person along with the address
     */
    getPrimaryDetails () {
        /**
         * use this method for fetching residential details of a person
         */
        return this.getVerifiedPerson()
    }

    /**
     * save primary details of the person
     * @param {Person} reqBody has primary details of the person
     * @param {Address} reqBody.birthPlace.address birthplace details of the person
     * @param {Place} reqBody.addressPlace
     * @param {number} reqBody.personVerificationDetails.yearsAtResidentialAddress
     * @param {string} reqBody.personVerificationDetails.ssn
     */
    async setPrimaryDetails (reqBody, userId) {
        /**
         * use this method to set the basic details of a person
         */
        if (!this.person) { await this.getVerifiedPerson() }

        let transaction
        try {
            transaction = await models.sequelize.transaction()
            const primaryDetails = await PersonController.createOrUpdate(reqBody, reqBody.addressPlace, reqBody.birthPlace, transaction)
            if (_.get(reqBody, 'personVerificationDetails')) {
                await models.PersonVerificationDetails.update({
                    yearsAtResidentialAddress: reqBody.personVerificationDetails.yearsAtResidentialAddress,
                    ssn: reqBody.personVerificationDetails.ssn
                }, {
                    where: {
                        personId: this.personId
                    },
                    transaction
                })
            }
            await transaction.commit()
            await this._addWebCemJobInTheQueue(userId)
            return primaryDetails
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * get ethnicity details of the person
     */
    async getEthnicityDetails () {
        if (!this.person) { await this.getVerifiedPerson() }

        return models.PersonEthnicity.findOne({
            where: {
                personId: this.personId
            },
            include: [
                {
                    model: models.Race,
                    as: 'raceOne'
                },
                {
                    model: models.Race,
                    as: 'raceTwo'
                },
                {
                    model: models.Race,
                    as: 'raceThree'
                },
                {
                    model: models.Ethnicity,
                    as: 'hispanic'
                },
                {
                    model: models.Ethnicity,
                    as: 'ethnicityOne'
                },
                {
                    model: models.Ethnicity,
                    as: 'ethnicityTwo'
                },
                {
                    model: models.Ethnicity,
                    as: 'ethnicityThree'
                }
            ]

        })
    }

    /**
     * save ethnicity details of the person
     * @param {Object<{id: Number, hispanicId: Number, isHispanic: Boolean, ethnicityOneId: Number, raceOneId: Number, ethnicityTwoId: Number, raceTwoId: Number, ethnicityThreeId: Number, raceThreeId: Number}>} reqBody
     */
    async setEthnicityDetails (reqBody) {
        let transaction
        reqBody.personId = this.personId
        if (!this.person) { await this.getVerifiedPerson() }
        const userId = reqBody.userId
        try {
            transaction = await models.sequelize.transaction()
            const ethnicityDetails = await upsert('PersonEthnicity', reqBody, transaction, { userId })
            await transaction.commit()
            await this._addWebCemJobInTheQueue(userId)
            return ethnicityDetails
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * get education details of the person
     */
    async getEducationDetails () {
        if (!this.person) { await this.getVerifiedPerson() }

        return models.EducationDetails.scope('commonIncludes').findOne({
            where: {
                personId: this.personId
            }
        })
    }

    /**
     * save education details of the person
     * @param {Object<{id: Number, qualificationId: Number, yearsOfOccupation: Number, occupation: String, industry: String}>} reqBody
     */
    async setEducationDetails (reqBody) {
        let transaction
        reqBody.personId = this.personId

        if (!this.person) { await this.getVerifiedPerson() }
        const userId = reqBody.userId

        try {
            transaction = await models.sequelize.transaction()
            const educationDetails = await upsert('EducationDetails', reqBody, transaction, { userId })
            await transaction.commit()
            return educationDetails
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * get veteran details of the person
     */
    async getVeteranDetails () {
        if (!this.person) { await this.getVerifiedPerson() }

        return models.Veteran.scope('commonIncludes').findOne({
            where: {
                personId: this.personId
            }
        })
    }

    /**
     * save veteran details of the person
     * @param {Object<{id: Number, serviceBranchId: Number, isUnknown: Boolean, serviceEra: String}>} reqBody
     */
    async setVeteranDetails (reqBody) {
        if (!this.person) { await this.getVerifiedPerson() }
        reqBody.personId = this.personId
        const userId = reqBody.userId

        let transaction
        try {
            transaction = await models.sequelize.transaction()
            const veteranDetails = await upsert('Veteran', reqBody, transaction, { userId })
            await transaction.commit()
            await this._addWebCemJobInTheQueue(userId)

            return veteranDetails
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * get parent details of the person. use contacts list api for this
     */
    async getParentsDetails () {
        if (!this.person) { await this.getVerifiedPerson() }

        const parentsRelations = await getRelations('map')
        const parentsRelationIds = ['Father', 'Mother'].map(x => parentsRelations[x])
        const parentsdetails = await this.getListOfContacts({ relationId: parentsRelationIds })
        return parentsdetails
    }

    /**
     * adding/updating the parent details of the person
     * @param {Object<{id: Number, relationId: Number, person: Person}>} reqBody
     */
    async setParentsDetails (reqBody) {
        reqBody.personId = this.personId
        let transaction
        if (!this.person) { await this.getVerifiedPerson() }

        try {
            transaction = await models.sequelize.transaction()
            const formatedReqBody = {
                ...reqBody,
                contactType: 1
            }

            if (!formatedReqBody.id) {
                await this._validateUniqueRelationForContacts(reqBody.relationId, transaction)
            }
            let roles = []
            if (formatedReqBody.id) {
                roles = await this._fetchRolesOfContact(formatedReqBody.id, transaction)
            }
            const createdContact = await this.addOrUpdateContactsWithRole(formatedReqBody, roles, transaction)
            const contactDetails = await this.getContactDetails(createdContact.id, transaction)
            await transaction.commit()
            await this._addWebCemJobInTheQueue(reqBody.userId)
            return contactDetails
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * get death details of the person
     */
    async getDeathDetails () {
        if (!this.person) { await this.getVerifiedPerson(null, true) }

        return models.DeathDetails.scope('commonIncludes').findOne({
            where: {
                personId: this.personId
            }
        })
    }

    /**
     * save death details of the person
     * @param {Object<{id: Number, dateOfDeath: Date, hospitalDeathStatus: String, deathPlace: Place, lor: Place, lorSameAsPlaceOfDeath: Boolean}>} reqBody
     * @param {Place} reqBody.deathPlace
     * @param {Place} reqBody.lor
     */
    async setDeathDetails (reqBody) {
        if (!this.person) { await this.getVerifiedPerson(null, true) }
        reqBody.personId = this.personId
        const userId = reqBody.userId

        let transaction, deathDetailsObj, deathPlace, lor
        try {
            transaction = await models.sequelize.transaction()
            deathDetailsObj = {
                ...reqBody
            }
            if (!_.isEmpty(reqBody.deathPlace)) {
                deathPlace = await AddressController.managePlace(reqBody.deathPlace, transaction)
                deathDetailsObj.deathPlaceId = _.get(deathPlace, 'id')
            } else {
                deathDetailsObj.deathPlaceId = null
            }
            if (reqBody.lorSameAsPlaceOfDeath) {
                deathDetailsObj.locationOfRemainId = deathDetailsObj.deathPlaceId
            } else {
                switch (_.isEmpty(reqBody.lor)) {
                case true:
                    deathDetailsObj.locationOfRemainId = null
                    break
                case false:
                    lor = await AddressController.managePlace(reqBody.lor, transaction)
                    deathDetailsObj.locationOfRemainId = _.get(lor, 'id')
                    break
                default:
                    break
                }
            }

            const deathDetails = await upsert('DeathDetails', deathDetailsObj, transaction, { userId })
            await transaction.commit()
            await this._addWebCemJobInTheQueue(userId)
            return deathDetails
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * get certifier details of the person
     */
    async getCerifierDetails (transaction) {
        if (!this.person) { await this.getVerifiedPerson(transaction, true) }

        return models.DeathDetails.findOne({
            where: {
                personId: this.personId
            },
            attributes: ['id', 'personId', 'certifierId'],
            include: [
                {
                    model: models.Certifier,
                    as: 'certifier',
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
                }
            ],
            transaction
        })
    }

    /**
     * save the certifier details
     * @param {Object<{id: Number, licenseNumber: String, faxNumber: String, certifierPerson: Person}>} reqBody
     * @param {Object<{address: Object}>} reqBody.certifierPerson.addressPlace
     */
    async setCertfierDetails (reqBody) {
        if (!this.person) { await this.getVerifiedPerson(null, true) }

        let transaction, certifierPerson, certifierObj
        const userId = reqBody.userId

        try {
            transaction = await models.sequelize.transaction()
            certifierPerson = await PersonController.createOrUpdate(reqBody.certifier.certifierPerson, reqBody.certifier.certifierPerson.addressPlace, {}, transaction)
            certifierObj = {
                id: reqBody.certifier.id,
                personId: certifierPerson.id,
                licenseNumber: reqBody.certifier.licenseNumber.toUpperCase(),
                faxNumber: reqBody.certifier.faxNumber
            }
            const certifier = await upsert('Certifier', certifierObj, transaction, { userId })
            reqBody.certifierId = certifier.id
            reqBody.personId = this.personId
            delete reqBody['certifier']
            await upsert('DeathDetails', reqBody, transaction, { userId })
            const certifierDetails = await this.getCerifierDetails(transaction)
            await transaction.commit()
            return certifierDetails
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * get notifier details
     */
    async getNotifierDetails () {
        if (!this.person) { await this.getVerifiedPerson() }

        const notifierId = await getContactRoles(1, ['Notifier'], 'array')
        const personContact = await models.PersonContact.scope('defaultScope', 'commonIncludes', { method: ['withRoles', notifierId] }).findOne({
            where: {
                personId: this.personId
            }
        })
        return personContact
    }

    /**
     * get nok details. use contacts list API for this
     */
    async getNokDetails () {
        if (!this.person) { await this.getVerifiedPerson() }

        const nokId = await getContactRoles(1, ['Next of Kin', 'Funeral Authorizer'], 'array')
        const contacts = await this.getListOfContacts({ contactRoles: nokId })
        const nokDetails = contacts.map(contact => {
            if (contact.contactRoles.includes('Next of Kin')) {
                return contact
            }
        })
        const filteredNokDetails = nokDetails.filter(nokDetail => {
            return nokDetail !== undefined
        })
        return filteredNokDetails
    }

    async _fetchRolesOfContact (contactId, transaction) {
        const roles = await models.PersonContactRole.findAll({
            where: {
                personContactId: contactId
            },
            transaction
        })
        return roles.map(role => role.roleId)
    }
    /**
     *
     * @param {Object<{relationId: Number, person: Person}>} reqBody
     * @param {Address} reqBody.person.addressPlace
     * @param {*} transaction
     */
    async addOrUpdateNok (reqBody, transaction) {
        if (!this.person) { await this.getVerifiedPerson(transaction) }
        reqBody.contactType = 1
        const nokRoleId = await getContactRoles(1, ['Next of Kin'], 'array', transaction)
        let roleIds = []
        let roles = []
        if (reqBody.id) {
            roles = await this._fetchRolesOfContact(reqBody.id, transaction)
        }
        roleIds = _.union(roles, nokRoleId)
        const createdContact = await this.addOrUpdateContactsWithRole(reqBody, roleIds, transaction)
        const contactDetails = await this.getContactDetails(createdContact.id, transaction)
        return contactDetails
    }
    /**
     *
     * @param {Object<{relationId: Number, person: Person}>} reqBody
     * @param {Place} reqBody.person.addressPlace
     * @param {*} transaction
     */
    async addOrUpdateNotifer (reqBody, transaction) {
        if (!this.person) { await this.getVerifiedPerson(transaction) }
        reqBody.contactType = 1
        let notifierRoleId = await getContactRoles(1, ['Notifier'], 'array', transaction)
        let roleIds = []
        let roles = []
        if (reqBody.id) {
            roles = await this._fetchRolesOfContact(reqBody.id, transaction)
        }
        roleIds = _.union(roles, notifierRoleId)
        const createdContact = await this.addOrUpdateContactsWithRole(reqBody, roleIds, transaction)
        const contactDetails = await this.getContactDetails(createdContact.id, transaction)
        return contactDetails
    }

    /**
     *
     * @param {Object<{relationId: Number, person: Person}>} reqBody
     * @param {*} transaction
     */
    async addOrUpdateInformant (reqBody, transaction) {
        if (!this.person) { await this.getVerifiedPerson(transaction) }
        const informantRoleId = await getContactRoles(1, ['Informant'], 'array', transaction)
        let roleIds = []
        let roles = []
        if (reqBody.id) {
            roles = await this._fetchRolesOfContact(reqBody.id, transaction)
        }
        roleIds = _.union(roles, informantRoleId)
        reqBody.contactType = 1
        const createdContact = await this.addOrUpdateContactsWithRole(reqBody, roleIds, transaction)
        const contactDetails = await this.getContactDetails(createdContact.id, transaction)
        return contactDetails
    }

    _returnApprovedContactIds (anRemainsOfPerson) {
        let remainsApprovedContactIds = []
        if (anRemainsOfPerson.cremationApprovedBy.length) {
            const contactIds = anRemainsOfPerson.cremationApprovedBy.map(approval => approval.contactId)
            remainsApprovedContactIds.push(...contactIds)
        }
        if (anRemainsOfPerson.embalmingApprovedBy.length) {
            const contactIds = anRemainsOfPerson.embalmingApprovedBy.map(approval => approval.contactId)
            remainsApprovedContactIds.push(...contactIds)
        }
        return remainsApprovedContactIds
    }

    /**
     *
     * @param {Object<{id: Number, person: Person, contactType: Number, relationId: Number}>} personContactReqBody
     * @param {Array<{Number}>} roleId
     * @param {*} transaction
     */
    async addOrUpdateContactsWithRole (
        personContactReqBody,
        roleId,
        transaction
    ) {
        // Find a PersonContact (PC) where PC.personId = person.id
        // Role validation
        // Relation validation
        // If exists, add a role
        // If not, create a PersonContact and add role
        const userId = personContactReqBody.userId
        personContactReqBody.personId = this.personId
        let contactDetails = {}
        let rolesTovalidate = roleId
        let toCreateRoleIds = roleId
        if (personContactReqBody.id) {
            contactDetails = await this.getContactDetails(personContactReqBody.id, transaction)
            const existingRoleIds = contactDetails.contactRoles.map(role => role.roleId)
            rolesTovalidate = _.difference(roleId, existingRoleIds)
            const contactRole = await models.ContactRole.findOne({ where: { name: 'Pallbearer' } })
            if (existingRoleIds.includes(contactRole.id) && !roleId.includes(contactRole.id)) {
                await SchedulingController.deleteResourcePallbearers(personContactReqBody.id)
            }
            toCreateRoleIds = rolesTovalidate
            const toDeleteRoleIds = _.difference(existingRoleIds, roleId)
            const remainsApprovingRoles = await getContactRoles([1], ['Funeral Authorizer', 'Next of Kin', 'Power of Attorney'], 'array', transaction)
            if (!this.person.isAlive) {
                const anRemains = new ANRemainsController(this.personId)
                const anRemainsOfPerson = await anRemains.getANRemainsInfo(transaction)
                let remainsApprovedContactIds = []
                if (anRemainsOfPerson) {
                    remainsApprovedContactIds = await this._returnApprovedContactIds(anRemainsOfPerson)
                }
                if (remainsApprovedContactIds.length && remainsApprovedContactIds.includes(Number(personContactReqBody.id)) && _.intersection(remainsApprovingRoles, toDeleteRoleIds).length) {
                    throw new Error('REMAINS_APPROVED_CONTACT')
                }
            }
            if (toDeleteRoleIds.length > 0) {
                await models.PersonContactRole.destroy({
                    where: {
                        roleId: toDeleteRoleIds,
                        personContactId: personContactReqBody.id
                    },
                    transaction
                })
            }
        }
        if (rolesTovalidate.length) {
            await this._validateUniqueRoleForContacts(rolesTovalidate, personContactReqBody, transaction)
        }
        switch (personContactReqBody.contactType) {
        case 1:
        case 3:
            if (_.get(personContactReqBody, 'person.id') && !_.get(personContactReqBody, 'person.birthPlace')) {
                const personController = new PersonController(personContactReqBody.person.id)
                const personDetails = await personController.getDetails(transaction)
                if (_.get(personDetails, 'birthPlace.address')) {
                    personContactReqBody.person.birthPlace = {
                        id: _.get(personDetails, 'birthPlaceId'),
                        address: {
                            ..._.get(personDetails, 'birthPlace.address').toJSON()
                        }
                    }
                }
            }
            personContactReqBody.person.userId = userId
            const createdPerson = await PersonController.createOrUpdate(personContactReqBody.person, personContactReqBody.person.addressPlace, personContactReqBody.person.birthPlace, transaction)
            personContactReqBody.resourceId = createdPerson.id
            personContactReqBody.resourceType = 'Person'
            break
        case 2:
            personContactReqBody.resourceType = 'Employee'
            break

        default:
            break
        }
        const personContact = await upsert('PersonContact', personContactReqBody, transaction, { userId })
        let contactRoles = toCreateRoleIds.map(e => {
            return {
                roleId: e,
                personContactId: personContact.id
            }
        })
        await models.PersonContactRole.bulkCreate(contactRoles, { transaction })

        return personContact
    }

    /**
     *
     * @param {Object<{id: Number, relationId: Number, contactRoleIds: Array, person: Person, contactType: Number, id: Number}>} reqBody
     * @param {Address} reqBody.person.addressPlace
     */
    async addOrUpdateContactsWithRoles (reqBody) {
        // Connect with contacts route handler
        // Find a PersonContact (PC) where PC.personId = person.id
        // Remove existing roles
        // Call addOrUpdateContactsWithRole
        let transaction, createdContact
        if (!this.person) { await this.getVerifiedPerson() }
        transaction = await models.sequelize.transaction()
        try {
            if (_.get(reqBody, 'person.email', false)) {
                const FormsController = require('./../formsController/formsController')
                const formsCtrl = new FormsController()
                await formsCtrl.validateEmail(_.get(reqBody, 'person.email'))
            }
            let formatedReqBody = {
                ...reqBody
            }
            switch (reqBody.contactType) {
            case 1:
            case 3:
                if (reqBody.relationId && reqBody.relationId !== 0) {
                    if (reqBody.id) {
                        const contactDetails = await this.getContactDetails(reqBody.id, transaction)
                        if (contactDetails.relationId !== reqBody.relationId) {
                            await this._validateUniqueRelationForContacts(reqBody.relationId, transaction)
                        }
                    } else {
                        await this._validateUniqueRelationForContacts(reqBody.relationId, transaction)
                    }
                }
                formatedReqBody.person = {
                    ...reqBody.person
                }
                break
            case 2:
                break
            default:
                break
            }
            createdContact = await this.addOrUpdateContactsWithRole(formatedReqBody, reqBody.contactRoleIds, transaction)
            const contactDetails = await this.getContactDetails(createdContact.id, transaction)
            await transaction.commit()
            await this._addWebCemJobInTheQueue(reqBody.userId)
            return contactDetails
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * list contacts of the person
     * @param {Object<{contactType: Array/Number, relationId: Array/Number}, contactRoles: Array/Number>} reqQuery
     */
    async getListOfContacts (reqQuery, transaction) {
        if (!this.person) { await this.getVerifiedPerson(transaction) }

        const queryObj = await this.formQueryObjForContacts(reqQuery || {})
        const whereObj = {
            personId: this.personId,
            ...queryObj,
            '$person.addressPlace.organizationId$': null
        }
        let relationName
        if (reqQuery && reqQuery.contactRoles) {
            whereObj['$contactRoles.role.id$'] = reqQuery.contactRoles
        }
        const contactsOfPerson = await models.PersonContact.scope('defaultScope', 'commonIncludes').findAll({
            where: whereObj,
            transaction,
            include: [
                {
                    model: models.PersonContactRole,
                    as: 'contactRoles',
                    include: [
                        {
                            model: models.ContactRole,
                            as: 'role'
                        }
                    ]
                }
            ]
        })
        const contacts = Promise.all(contactsOfPerson.map(async contact => {
            if (_.get(contact, 'contactRoles[0].role.name') === 'Informant') {
                const relation = await models.SomeOnePassed.findOne({
                    where: {
                        decedentId: this.personId
                    },
                    attributes: ['decedentId'],
                    include: [
                        {
                            model: models.Relation,
                            as: 'informantDecedentRelation'
                        }
                    ]
                })
                relationName = _.get(relation, 'informantDecedentRelation')
            } else if (_.get(contact, 'contactRoles[0].role.name') === 'Notifier') {
                const relation = await models.SomeOnePassed.findOne({
                    where: {
                        decedentId: this.personId
                    },
                    attributes: ['decedentId'],
                    include: [
                        {
                            model: models.Relation,
                            as: 'callerDecedentRelation'
                        }
                    ]
                })
                relationName = _.get(relation, 'callerDecedentRelation')
            }
            return {
                ...this.getResponseForContactsList(contact, relationName),
                contactRoles: contact.contactRoles.map(e => e.role.name),
                contactType: contact.contactType,
                id: contact.id,
                isVerified: _.get(contact, 'person.isVerified'),
                isAlive: _.get(contact, 'person.isAlive'),
                personId: _.get(contact, 'person.id'),
                dateOfBirth: _.get(contact, 'person.dateOfBirth'),
                personVerificationDetails: _.get(contact, 'person.personVerificationDetails')
            }
        }))
        return contacts
    }
    /**
 *
 * @param {Object} data
 * @param {Person} data.person
 * @param {Address} data.person.addressPlace
 * @param {Object} data.employee
 * @param {string} data.employee.name
 * @param {string} data.employee.phoneNumber
 * @param {string} data.employee.email
 */
    getResponseForContactsList (data, relation) {
        let name
        if (data.person) {
            let personProperties = []
            personProperties.push(_.get(data.person, 'prefix'))
            personProperties.push(_.get(data.person, 'firstName'))
            personProperties.push(_.get(data.person, 'middleName'))
            personProperties.push(_.get(data.person, 'lastName'))
            name = personProperties.join(' ')
            return {
                name,
                phoneNumber: _.get(data.person, 'phoneNumber'),
                email: _.get(data.person, 'email'),
                // place: _.get(data.person, 'place'),
                prefix: _.get(data.person, 'prefix'),
                secondaryPhoneNumber: _.get(data.person, 'secondaryPhoneNumber'),
                addressPlace: _.get(data.person, 'addressPlace'),
                relation: _.get(data, 'relation') || relation,
                firstName: _.get(data.person, 'firstName'),
                middleName: _.get(data.person, 'middleName'),
                lastName: _.get(data.person, 'lastName'),
                maidenName: _.get(data.person, 'maidenName'),
                personContactId: _.get(data.person, 'id'),
                birthPlace: _.get(data.person, 'birthPlace')
            }
        }
        return {
            name: _.get(data.employee, 'name'),
            phoneNumber: _.get(data.employee, 'phoneNumber'),
            email: _.get(data.employee, 'email')
        }
    }

    /**
     *
     * @param {Object<{contactType: Array/Number, relationId: Array/Number}, contactRoles: Array/Number>} reqQuery
     */
    formQueryObjForContacts (reqQuery) {
        const contactsQuery = {
            contactType: [1, 3]
        }
        Object.keys(reqQuery).forEach(ele => {
            switch (ele) {
            case 'contactType':
                contactsQuery.contactType = reqQuery.contactType
                break
            case 'relationId':
                contactsQuery.relationId = reqQuery.relationId
                break
            default:
                break
            }
        })
        return contactsQuery
    }

    /**
     * delete contact of a person
     * @param {Number} contactId id of the contact to be deleted
     * @param {Number} userId id of the currently loggedIn user
     */
    async deleteContact (contactId, userId) {
        if (!this.person) { await this.getVerifiedPerson() }
        if (!this.person.isAlive) {
            const anRemains = new ANRemainsController(this.personId)
            const anRemainsOfPerson = await anRemains.getANRemainsInfo()
            let remainsApprovedContactIds = []
            if (anRemainsOfPerson) {
                remainsApprovedContactIds = await this._returnApprovedContactIds(anRemainsOfPerson)
                if (remainsApprovedContactIds.length && remainsApprovedContactIds.includes(Number(contactId))) {
                    throw new Error('CONTACT_CAN_NOT_BE_DELETED')
                }
            }
        }
        const contactDetails = await models.PersonContact.update({
            deletedBy: userId,
            deletedAt: moment().format('MM/DD/YYYY HH:mm:ss')
        }, {
            where: {
                id: contactId
            }
        })
        // when pallbearers is added in scheduling we need to it delete in scheduling also
        if (contactDetails[0] !== 0) {
            const contactRole = await models.ContactRole.findAll({ where: { [Op.or]: [{ name: 'Pallbearer' }, { name: 'Honorary Pallbearer', contactType: 2 }] } })
            for (let index in contactRole) {
                const pallbearersData = await models.PersonContact.scope({
                    method: ['withRoles', contactRole[index].id]
                }).findOne({ where: { id: contactId } })
                if (pallbearersData) {
                    await SchedulingController.deleteResourcePallbearers(contactId)
                }
            }
        }
        // const contactDetails = await this.getContactDetails(contactId)
        // contactDetails.deletedBy = userId
        // contactDetails.deletedAt = moment().format('MM/DD/YYYY HH:mm:ss')
        // const deletedContact = await contactDetails.save()
        return contactDetails
    }

    /**
     * get details of a contact of the person
     * @param {Number} contactId id of the contact to fetch the details
     */
    async getContactDetails (contactId, transaction) {
        const personContact = await models.PersonContact.scope('defaultScope', 'commonIncludes').findOne({
            where: {
                personId: this.personId,
                id: contactId
            },
            include: [
                {
                    model: models.PersonContactRole,
                    as: 'contactRoles',
                    include: [
                        {
                            model: models.ContactRole,
                            as: 'role'
                        }
                    ]
                }
            ],
            transaction
        })
        if (!personContact) {
            throw new Error('CONTACT_NOT_FOUND')
        }
        let contactDetails = {
            ...personContact.toJSON()
        }
        // contactDetails.person = await personContact.getPerson({ transaction })
        // contactDetails.employee = await personContact.getEmployee({ transaction })
        return contactDetails
    }

    /**
     *
     * @param {Array<{Number}>} roleId
     * @param {Object<{contactType: Number, resourceId: Number, person: Object}>} reqBody
     * @param {*} transaction
     */
    async _validateUniqueRoleForContacts (roleId, reqBody, transaction) {
        let contactRoles, uniqueRoles, validateRoles
        let dataToValidate = {
            personId: this.personId
        }
        switch (reqBody.contactType) {
        case 1:
            contactRoles = await getContactRoles(reqBody.contactType, [], 'map', transaction)
            uniqueRoles = [contactRoles['Notifier'], contactRoles['Informant'], contactRoles['Power of Attorney'], contactRoles['Funeral Authorizer']]
            validateRoles = _.intersection(roleId, uniqueRoles)
            dataToValidate.contactRoleIds = validateRoles
            if (validateRoles.length) {
                const existingContact = await this._validationForContactRolesAndRelation(dataToValidate, 'ContactRoles', transaction)
                let existingContactRoles = []
                if (existingContact.length) {
                    existingContact.map((contact) => {
                        contact.contactRoles.map((role) => existingContactRoles.push(role.roleId))
                    })
                    existingContactRoles = _.uniq(existingContactRoles)
                }
                const duplicateRole = _.intersection(uniqueRoles, existingContactRoles)
                if (existingContactRoles.length && duplicateRole.length) {
                    let dupRoles = duplicateRole.map(e => {
                        return Object.keys(contactRoles).find((key, value) => contactRoles[key] === e)
                    })
                    throw new Error(`There is already one contact with roles ${dupRoles.join(', ')}`)
                    /* const existingRole = Object.keys(contactRoles).find((key, value) =>
                        contactRoles[key] === duplicateRole[0]
                    )
                    throw new Error(`DUPLICATE_${existingRole.toUpperCase()}`) */
                } else {
                    return true
                }
            }
            break
        case 2:
            dataToValidate.resourceId = reqBody.resourceId
            const existingContact = await this._validationForContactRolesAndRelation(dataToValidate, 'employee', transaction)
            if (existingContact.length) {
                let existingContactRoles = []
                if (existingContact.length) {
                    existingContact.map((contact) => {
                        contact.contactRoles.map((role) => existingContactRoles.push(role.roleId))
                    })
                    existingContactRoles = _.uniq(existingContactRoles)
                }
                if (_.intersection(existingContactRoles, roleId).length) {
                    // Role already exists
                    throw new Error('DUPLICATE_ROLE_FOR_STAFF')
                }
            }
            break
        default:
            break
        }
    }

    /**
     *
     * @param {Number} relationId
     * @param {*} transaction
     */
    async _validateUniqueRelationForContacts (relationId, transaction) {
        const relations = await getRelations('map')
        const relationIds = Object.values(relations)
        let dataToValidate = {
            personId: this.personId,
            relationId: relationId
        }
        if (!relationIds.includes(relationId)) {
            throw new Error('INVALID_RELATION')
        }
        let isExists = await this._validationForContactRolesAndRelation(dataToValidate, 'Relation', transaction)

        if (isExists.length) {
            const duplicateRelation = ['Father', 'Mother', 'Spouse'].find(x => relations[x] === relationId)
            if (duplicateRelation) {
                throw new Error(`DUPLICATE_${duplicateRelation.toUpperCase()}`)
            }
            return true
        }
        return true
    }

    /**
     *
     * @param {Object<{personId: Number, relationId: Number, contactRoleIds: Array/Number}>} dataToValidate
     * @param {String} fieldTovalidate  like (Relation, ContactRoles, employee)
     * @param {*} transaction
     */
    async _validationForContactRolesAndRelation (dataToValidate, fieldTovalidate, transaction) {
        let whereObj = { personId: dataToValidate.personId }

        // const withRolesScope = {
        //     method: [
        //         'withRoles', undefined
        //     ]
        // }
        let includeArr = []

        let scopes = ['defaultScope']
        switch (fieldTovalidate) {
        case 'Relation':
            whereObj.relationId = dataToValidate.relationId
            break
        case 'ContactRoles':
            includeArr = [
                {
                    model: models.PersonContactRole,
                    as: 'contactRoles',
                    include: [
                        {
                            model: models.ContactRole,
                            as: 'role',
                            where: {
                                id: dataToValidate.contactRoleIds
                            }
                        }
                    ]
                }
            ]
            break
        case 'employee':
            whereObj.resourceId = dataToValidate.resourceId
            scopes.push('withRoles')
            break
        default:
            break
        }
        // scopes.push(withRolesScope)
        const contact = await models.PersonContact.scope(scopes).findAll({
            where: whereObj,
            transaction,
            include: includeArr
        })
        if (contact.length) {
            return contact
        }
        return false
    }

    /**
     *
     * @param {Number} userId id of the currently loggedIn user
     */
    async createArrangement (userId) {
        if (!this.person) {
            await this.getVerifiedPerson()
        }
        return models.Arrangement.create({
            personId: this.personId,
            createdBy: userId,
            updatedBy: userId
        })
    }

    async getArrangement (transaction) {
        if (!this.person) {
            await this.getVerifiedPerson(transaction)
        }
        const arrangement = await models.Arrangement.findOne({
            where: {
                personId: this.personId
            },
            transaction
        })
        return arrangement
    }

    /**
     *
     * @param {Number} agreementType is the type of the agreement (Funeral/Cemetry)
     * @param {Number} needType is the arrangement type which would be one of AN/PN
     * @param {*} transaction
     */
    async getSaleTypeOnArrangement (agreementType, needType, transaction) {
        let result = await models.SaleType.findAll({
            where: {
                agreementType: Number(agreementType),
                arrangementType: needType,
                isActive: 1
            },
            transaction
        })
        result = JSON.parse(JSON.stringify(result))
        return result
    }

    async _addWebCemJobInTheQueue (userId) {
        const person = await models.Person.findOne({
            where: {
                id: this.personId
            },
            attributes: ['isAlive']
        })
        if (!person.isAlive) {
            const { queueNames, queues } = require('../../../appQueues')
            const webCemQueue = queues[queueNames.webCemQueue]
            const dataToSend = {
                event: 'decedent.save',
                payload: {
                    personId: this.personId,
                    userId: userId,
                    triggerPoint: 'CaseInfo'
                }
            }
            webCemQueue.add('webCemQueue', dataToSend)
        }
    }
}

module.exports = VerifiedPersonController
