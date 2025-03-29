const models = require('../../../models')
const PersonController = require('../personController/personController')
const VerifiedPersonController = require('../personController/verifiedPersonController')
const AnController = require('./anController')
const PnController = require('./pnController')
const GenealogyController = require('./genealogyController')
const MaintenanceRequestController = require('./maintenanceRequestController')
const OtherRequestController = require('./otherRequestController')
const TicketController = require('../ticketController/ticketController')
const InvitaionController = require('../familyPortalController/invitationController')
const CremationSyncToFAAController = require('../familyPortalController/cremationSyncController')
const SyncToFAAController = require('../familyPortalController/syncToFAAController')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const seedValues = require('../../../config/seed')
const type = seedValues.seed.Type
let reasons = seedValues.seed.CallReasons
let status = seedValues.seed.CallStatus
let callType = seedValues.seed.Type
const moment = require('moment')
const logger = require('../../../lib/logger')
const { upsert, getFullNameOfPerson, fetchAssignedToIds, convertToJson, commonDownloadFileWithSignature } = require('../utils')
const _ = require('lodash')
const ResourceDocumentsController = require('../resourceDocuments/resourceDocumentsController')

class CallController {
    constructor (identifier) {
        this.identifier = identifier
    }
    /**
     * @param {*} data is the reqBody for the call along with the currentUserId
     * @param {Object} caller is the object of the basic details of the person added as the caller
     * @param {Oject} caller.addressPlace is the address object of the caller
     * @param {Object} caller.addressPlace.organization is the object of the organization details of the caller
     * @param {Object} caller.addressPlace.address is the object of the address details of the caller
     * @param {Number} type is the integer which defines if the call is a Walk-in or Call-in
     * @param {Number} status is the integer which defines the status of the call
     * @param {Number} receivedLocationId is the integer which defines the location where the call is received
     * @param {Number} languageId is the integer which defines the language of the caller
     * @param {Number} reasonId is the integer which defines the reason for which the call is made
     * @param {Array} notes is an array of notes added for the call and the reason which are objects
     * @param {Array} reasons if the reason for the call is someOneHasPassed/Pre-Arrangement/Genealogy then it is an array of objects of the reason details
     * @param {Object} reasons if the reason for the call is Maintenance/otherEnquiry then it is an object of the reason details
     */

    static async createOrUpdate (data) {
        let transaction, oldAssignedToIds, callAssignmentPayload
        try {
            const { id, type, active, status, receivedLocationId, locationCode, assignedToId = [], languageId, appointmentDate, reasonId, userId, caseArranger } = data
            let callObj = {
                id,
                type,
                active,
                status,
                reasonId,
                createdBy: userId,
                languageId,
                assignedToId,
                appointmentDate,
                receivedLocationId
            }

            let decedentOrBeneficiaryName = ''
            let callReason = reasons[reasonId]
            let callerName = await getFullNameOfPerson(data.caller)
            transaction = await models.sequelize.transaction()
            // add the caller and the caller address
            data.caller.userId = userId
            const caller = await PersonController.createOrUpdate(
                data.caller, data.caller.addressPlace, data.caller.birthPlace, transaction
            )
            callObj.callerId = caller.id
            // storing old assigned to ids before update.
            if (id) {
                oldAssignedToIds = await fetchAssignedToIds(id, transaction)
            }

            // create the call
            let createdCall = await upsert('Call', callObj, transaction, { userId })

            // adding the call notes
            if (!_.isEmpty(data.notes)) {
                await this.addNotes(data.notes, createdCall.id, transaction, { userId })
            }
            // adding callAssignment
            if (assignedToId) {
                callAssignmentPayload = assignedToId.map(e => { return { 'callId': createdCall.id, 'assignedToId': e } })
            }
            const assignedCalls = await models.CallAssignment.findAll({
                where: { callId: createdCall.id },
                transaction
            })
            if (assignedCalls) {
                // delete the already CallAssigned
                const deleteIds = assignedCalls.map(e => e.id)
                await models.CallAssignment.destroy({ where: { id: deleteIds }, transaction })
            }

            if (!_.isEmpty(data.assignedToId)) {
                await models.CallAssignment.bulkCreate(callAssignmentPayload, { transaction })
            }
            let sendMailAssignedToId = assignedToId
            if (id && assignedToId) {
                // update call : that we need to find the difference of assignedToIds
                let newAssignedToIds = assignedToId.filter(x => !oldAssignedToIds.includes(x))
                sendMailAssignedToId = newAssignedToIds
            }
            switch (reasonId) {
            case 1:
                // create someOneHasPassed reason
                await AnController.createOrUpdate(data, createdCall, caller, transaction)
                // send invitaions if familyArranger details are present
                for (let reason of data.reasons) {
                    if (_.get(reason, 'familyArranger.email')) {
                        reason.familyArranger.locationCode = locationCode
                        await InvitaionController.sendInvitationPreVerification(reason.decedentId, reason.familyArranger, caseArranger, transaction)
                    }
                }
                break
            case 2:
                await PnController.createOrUpdate(data, createdCall, transaction)
                break
            case 3:
                await MaintenanceRequestController.createOrUpdate(data, createdCall, transaction)
                // adding the documents given in the call
                if (_.get(data, 'documents')) {
                    await ResourceDocumentsController.createOrEditDocuments(createdCall.id, 'Call', _.get(data, 'documents', []), transaction)
                }
                break
            case 4:
                break
            case 5:
                await GenealogyController.createOrUpdate(data, createdCall, transaction)
                // adding the documents given in the call
                if (_.get(data, 'documents')) {
                    await ResourceDocumentsController.createOrEditDocuments(createdCall.id, 'Call', _.get(data, 'documents', []), transaction)
                }
                break
            case 6:
                await OtherRequestController.createOrUpdate(data, createdCall, transaction)
                break

            default:
                break
            }

            // mark the call as verified if all the persons in the call(caller, decedent, informant, beneficiary) are verified
            const callController = new CallController(createdCall.identifier)
            const callDetails = await callController.markCallAsVerified(transaction, 'create/verify')
            decedentOrBeneficiaryName = await this.getDecedentsOrBeneficiariesOfCall(callDetails, reasonId)
            await transaction.commit()
            const { queueNames, queues } = require('../../../appQueues')
            const callAssignedWorker = queues[queueNames.callAssignedWorker]
            const jobData = {
                assignedToIds: sendMailAssignedToId,
                callId: createdCall.identifier,
                callReason,
                decedentOrBeneficiaryName,
                callerName
            }
            callAssignedWorker.add('callAssignedWorker', jobData)
            return callDetails
        } catch (error) {
            logger.error(error)
            await transaction.rollback()
            throw error
        }
    }

    /**
     * @description This method returns decedent/beneficiary name based on the reason with which the call is created
     * @param {Object} callDetails
     * @param {Number} reasonId
     */
    static async getDecedentsOrBeneficiariesOfCall (callDetails, reasonId, isWebCemPayload) {
        let persons = []
        switch (reasonId) {
        case 1:
            persons = callDetails.someOnePassed.map(reason => reason.decedent)
            break
        case 5:
            persons = callDetails.genealogySearchReason.map(reason => reason.decedent)
            break
        case 2:
            persons = callDetails.preNeedReason.map(reason => reason.beneficiary)
            break
        default:
            break
        }
        if (isWebCemPayload) {
            const personDetails = persons.map(person => {
                return person
            })
            return personDetails
        }
        const personNames = persons.map(person => {
            return getFullNameOfPerson(person)
        })
        return personNames.join(', ').trim()
    }

    /**
     *
     * @param {integer} callId is the id of the call whose notes is to be fetched
     * @param {*} transaction
     */
    static _getNotes (callId, transaction) {
        return models.Note.scope('withUpdatedBy', 'withCreatedBy').findAll({
            where: {
                resourceId: callId,
                resourceType: 'call'
            },
            order: [
                ['updatedAt', 'DESC']
            ],
            transaction
        })
    }

    /**
     *
     * @param {array} notes is the array of notes to be added for the reason
     * @param {integer} createdBy is the id of the current user who is loggedIn
     * @param {integer} resourceId is the id of the reason against which the notes is being added
     * @param {*} transaction
     */
    static async addNotes (notes, resourceId, transaction, context = {}) {
        const noteArray = notes.map((singleNote, index) => {
            return {
                level: singleNote.level,
                content: singleNote.content,
                createdAt: new Date(),
                createdBy: context.userId,
                updatedAt: new Date(),
                updatedBy: context.userId,
                categoryId: singleNote.categoryId || 1,
                resourceId,
                resourceType: singleNote.resourceType || 'call'
            }
        })
        let res = await models.Note.bulkCreate(noteArray, {
            transaction,
            returning: true
        })
        return res
    }

    /**
     *
     * @param {*} callIdentifier is the identifier to get the callDetails
     * @param {string} from its value is either create/verify | list. it is used to check if the lastTouchedAt should be updated or not. it will be updated only when verifyCall method or createOrEdit call method calls this method
     * @param {*} transaction
     */
    async markCallAsVerified (transaction, from) {
        // get the call details(call info)
        let callDetails = await this.getCallDetails(transaction, 'model')
        let isCallerVerified = callDetails.caller.isVerified || (callDetails.caller.addressPlace && callDetails.caller.addressPlace.organizationId)
        let allPersonVerified = true
        switch (callDetails.reasonId) {
        case 1:
            // checking if all of the person in some one has passed are verified
            for (const eachAn of callDetails.someOnePassed) {
                // Updating the last touched at for the decedent
                if (eachAn.decedent.isVerified && from === 'create/verify') {
                    const decedent = new VerifiedPersonController(eachAn.decedentId)
                    await decedent.updateLastTouchedAt(transaction)
                }
                allPersonVerified = allPersonVerified && _.get(eachAn, 'decedent.isVerified', false) &&
                    _.get(eachAn, 'informant.isVerified', false)
            }
            break
        case 2:
            // checking if all of the person in the pre arrangement are verified
            for (const eachPn of callDetails.preNeedReason) {
                // Updating the last touched at for the decedent
                if (eachPn.beneficiary.isVerified && from === 'create/verify') {
                    const beneficiary = new VerifiedPersonController(eachPn.beneficiaryId)
                    await beneficiary.updateLastTouchedAt(transaction)
                }
                allPersonVerified = allPersonVerified && _.get(eachPn, 'beneficiary.isVerified', false)
            }
            break
        default:
            break
        }
        callDetails.isVerified = isCallerVerified && allPersonVerified
        // callDetails.isVerified = isCallerVerified && allPersonVerified
        // callDetails = await callDetails.save({ transaction })
        if (from === 'list') {
            return isCallerVerified && allPersonVerified
        }
        return callDetails
    }

    /**
     *
     * @param {*} queryObj is the object of all the queries done for fetching the calls List
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
     */
    static async getListOfCalls (queryObj) {
        try {
            /**
             * forming the query to fetch the calls
             */
            let listQuery = await this._queryObjForCall(queryObj)
            const offset = (queryObj.page - 1) * queryObj.limit || 0
            const sortOrder = queryObj.sortOrder || 'desc'
            const { timezone } = queryObj
            let Query = `EXEC [dbo].[getCallsList] 0, '${listQuery}', '${sortOrder}', 'OFFSET ${offset} ROWS FETCH NEXT ${queryObj.limit} ROWS ONLY'`
            let countQuery = `EXEC [dbo].[getCallsList] 1, '${listQuery}', '${sortOrder}', ''`

            let callsCount = await models.sequelize.query(countQuery, { type: models.sequelize.QueryTypes.SELECT })
            let listOfCalls = await models.sequelize.query(Query, { type: models.sequelize.QueryTypes.SELECT })
            let callListRes = []
            if (listOfCalls.length) {
                callListRes = await Promise.all(
                    listOfCalls.map(async (e, index) => {
                        e = await convertToJson(e)
                        /**
                         * formating the response for the list of calls
                         */
                        let callObj = {
                            id: _.get(e, 'id'),
                            callId: _.get(e, 'identifier'),
                            callType: {
                                id: _.get(e, 'type'),
                                value: callType[_.get(e, 'type')]
                            }.value,
                            status: {
                                id: _.get(e, 'status'),
                                value: status[_.get(e, 'status')]
                            }.value,
                            callerName: _.get(e, 'caller') ? getFullNameOfPerson(_.get(e, 'caller')) : null,
                            reason: {
                                id: _.get(e, 'reasonId'),
                                value: reasons[_.get(e, 'reasonId')]
                            }.value,
                            decedents: _.get(e, 'decedent', []),
                            beneficiaries: _.get(e, 'beneficiary', []),
                            contactNo: _.get(e, 'caller.phoneNumber', null),
                            contactEmail: _.get(e, 'caller.email', null),
                            assignedTo: _.get(e, 'callsAssigned') ? e.callsAssigned.map(assignedTo => assignedTo.name) : [],
                            appointmentDate: _.get(e, 'appointmentDate'),
                            isVerified: await this.checkVerify(e),
                            createdAt: moment(e.createdAt).tz(timezone),
                            updatedAt: moment(e.updatedAt).tz(timezone),
                            tickets: _.get(e, 'callTickets.length'),
                            informantId: _.get(e, 'someOneHasPassed.informantId', 0),
                            informantName: getFullNameOfPerson(_.get(e, 'someOneHasPassed')) || null,
                            informantEmail: _.get(e, 'someOneHasPassed.email', null),
                            informantContactNo: _.get(e, 'someOneHasPassed.phoneNumber', null)
                        }
                        if (callObj.reason === 'Maintenance Request') {
                            callObj.totalNoOfTickets = e.maintenanceRequestReason.maintenanceRequestReasonType.length
                        }
                        return callObj
                    })
                )
            }
            callListRes = _.filter(callListRes, ele => ele)
            let data = {
                list: callListRes,
                totalResults: callsCount[0].count
            }
            return data
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
    /**
     * To Verify Call
     * @param {*} callIdentifier is the identifier of a call that has to be verified
     * @param {*} data is the request body required to verify call
     * @param {Number} currentUserId is the id of the user who is currently logged in
     * @param {Object} personInformation is the object of the basic details of the person and the address to be added/updated to the person being verified
     * @param {Object<{address: Object}>} personInformation.addressPlace is the obejct of the addres of the person
     * @param {String} personType is the type of the person being verified. for ex: decedent. informant, beneficiary, caller
     * @param {Number} unverifiedPersonId is the id of the person being verified
     */
    async verifyCall (data) {
        let transaction
        const { queueNames, queues } = require('../../../appQueues')
        try {
            transaction = await models.sequelize.transaction()
            const currentUserId = data.currentUserId
            const isVerifiedPersonId = !!data.verifiedPersonId
            let updatePersonId = isVerifiedPersonId
                ? data.verifiedPersonId
                : data.unverifiedPersonId
            const personDetails = {
                id: updatePersonId,
                ...data.personInformation
            }
            personDetails.userId = currentUserId
            let onePortalId
            if (isVerifiedPersonId) {
                // Replace unverifiedPerson with verifiedPerson
                await this._replacePerson(data.personType, data.verifiedPersonId, data.unverifiedPersonId, transaction)
                // Soft delete unverified person
                const personToDeleteController = new PersonController(data.unverifiedPersonId)
                await personToDeleteController.deletePerson(currentUserId, transaction)
                // Fetch the OPI of the verified person
                await PersonController.createOrUpdate(personDetails, personDetails.addressPlace, personDetails.birthPlace, transaction)
                const verifiedPersonController = new VerifiedPersonController(data.verifiedPersonId)
                const verifiedPerson = await verifiedPersonController.getVerifiedPerson(transaction)
                onePortalId = verifiedPerson.personVerificationDetails.onePortalId
                if (data.personType === 'decedent') {
                    const deathDetails = { dateOfDeath: personDetails.dateOfDeath }
                    const personToUpdateController = new PersonController(data.verifiedPersonId)
                    await personToUpdateController.createOrUpdateDeathDetails(deathDetails, transaction)
                }
            } else {
                // Create an OPI and verification person detail
                let personToVerify
                if (data.unverifiedPersonId) {
                    personToVerify = new VerifiedPersonController(data.unverifiedPersonId)
                } else {
                    delete personDetails.id
                    const createdPerson = await PersonController.createOrUpdate(personDetails, personDetails.addressPlace, {}, transaction)
                    await this._replacePerson(data.personType, createdPerson.id, data.unverifiedPersonId, transaction)
                    personToVerify = new VerifiedPersonController(createdPerson.id)
                    personDetails.id = createdPerson.id
                    updatePersonId = createdPerson.id
                }
                const verifiedPersonDetails = await personToVerify.verifyPerson(personDetails, data.personType, transaction)
                onePortalId = verifiedPersonDetails.onePortalId
            }
            // Check for the call verification
            const call = await this.markCallAsVerified(transaction, 'create/verify')
            // Create contacts
            if (data.personType === 'decedent' && !isVerifiedPersonId) {
                const index = call.someOnePassed.findIndex((eachAn) => eachAn.decedent.id === updatePersonId)
                const decedentPerson = new PersonController(updatePersonId)
                await decedentPerson.createContactsForDecedent(call, index, transaction)
            }

            // Sync verified data to FamilyPortal
            if (data.personType === 'informant' || data.personType === 'decedent') {
                _.forEach(call.someOnePassed, async (eachAn) => {
                    await SyncToFAAController.pullFromFAA(eachAn.decedentId)
                    if (updatePersonId === eachAn.decedentId) {
                        const cremationSyncToFAAController = new CremationSyncToFAAController(eachAn.decedentId)
                        await cremationSyncToFAAController.updatePersonToFAA(transaction)
                    }
                })
            }

            await transaction.commit()
            if (data.personType === 'decedent') {
                // sending data to webcem in decedent.save event when decedent is verified
                const webCemQueue = queues[queueNames.webCemQueue]
                const dataToSend = {
                    event: 'decedent.save',
                    payload: {
                        personId: updatePersonId,
                        userId: currentUserId
                    }
                }
                webCemQueue.add('webCemQueue', dataToSend)
            }
            return {
                onePortalId,
                isCallVerified: call.isVerified,
                verifiedPersonId: updatePersonId
            }
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     * @param {String} personType is the type of the person being verified
     * @param {Number} verifiedPersonId is the id of the person added as verified person
     * @param {Number} unverifiedPersonId is the id of the person verified
     * @param {*} transaction
     */
    async _replacePerson (personType, verifiedPersonId, unverifiedPersonId, transaction) {
        try {
            const call = await this.getCallDetails(transaction, 'model')
            let index
            switch (personType) {
            case 'caller':
                call.callerId = verifiedPersonId
                await call.save({ transaction })
                return call
            case 'beneficiary':
                index = call.preNeedReason.findIndex((eachPn) => eachPn.beneficiary.id === unverifiedPersonId)
                call.preNeedReason[index].beneficiaryId = verifiedPersonId
                await call.preNeedReason[index].save({ transaction })
                return call
            case 'decedent':
                index = call.someOnePassed.findIndex((eachAn) => eachAn.decedent.id === unverifiedPersonId)
                call.someOnePassed[index].decedentId = verifiedPersonId
                await call.someOnePassed[index].save({ transaction })
                return call
            case 'informant':
                index = call.someOnePassed.findIndex((eachAn) => _.get(eachAn, 'informant.id') === unverifiedPersonId)
                call.someOnePassed[index].informantId = verifiedPersonId
                await call.someOnePassed[index].save({ transaction })
                return call
            default:
                return call
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * forming the where query obj
     * @param {Object} queryObj is the object of queries based on which the where query is formed for the person(caller)
     */
    static _whereObjForCallerQuerying (queryObj) {
        let sql = ''
        if (queryObj.callerName) {
            let words = '\'' + queryObj.callerName.split(' ').join('\',\'') + '\''
            sql += ` AND [Call].[callerId] IN (SELECT caller.id FROM Person AS caller
                WHERE [caller].[firstName] LIKE ''%${queryObj.callerName}%'' OR [caller].[middleName] LIKE ''%${queryObj.callerName}%'' OR [caller].[firstName] IN ('${words}') OR [caller].[middleName] IN ('${words}') OR [caller].[lastName] IN ('${words}'))`
        }
        if (queryObj.contactNoOrEmail) {
            sql += ` AND [Call].[callerId] IN (SELECT caller.id FROM Person AS caller
                WHERE [caller].[email] LIKE ''%${queryObj.contactNoOrEmail}%'' OR [caller].[phoneNumber] LIKE ''%${queryObj.contactNoOrEmail}%'')`
        }
        return sql
    }

    /**
     * forming the query based on the requested queries
     * @param {Object} queryObj is the object of queries made for fetching the calls
     */
    static async _queryObjForCall (queryObj) {
        let sql = `[Call].[active] = 1`
        Object.keys(queryObj).map((e) => {
            switch (e) {
            case 'callIds':
                let ids = queryObj.callIds.map(id => `''${id}''`)
                sql += ` AND [Call].[identifier] IN (${ids})`
                break
            case 'callId':
                sql += ` AND [Call].[identifier] LIKE ''%${queryObj.callId}%''`
                break
            case 'status':
                sql += ` AND [Call].[status] IN (${queryObj.status.toString()})`
                break
            case 'callType':
                let callType = Object.keys(type).find(key => type[key] === queryObj.callType)
                sql += ` AND [Call].[Type] = ${callType}`
                break
            case 'reason':
                sql += ` AND [Call].[reasonId] IN (${queryObj.reason.toString()})`
                break
            case 'locationIds':
                sql += ` AND [Call].[receivedLocationId] IN (${queryObj.locationIds.toString()})`
                break
            default:
                break
            }
        })
        if (queryObj.createdFromDate && queryObj.createdToDate) {
            let startDate = moment(queryObj.createdFromDate).tz(queryObj.timezone).startOf('day').format('YYYY/MM/DD')
            let endDate = moment(queryObj.createdToDate).tz(queryObj.timezone).endOf('day').format('YYYY/MM/DD')
            sql += ` AND [Call].[createdAt] between ''${startDate}'' AND ''${endDate}''`
        }
        if (queryObj.assignedTo) {
            sql += ` AND [Call].[id] IN (SELECT callsAssigned.callId
                FROM CallAssignment AS callsAssigned
                WHERE Call.id = callsAssigned.callId AND assignedToId = ${queryObj.assignedTo}) `
        }
        if (queryObj.benficiaryName) {
            let words = '\'' + queryObj.benficiaryName.split(' ').join('\',\'') + '\''
            sql += `AND ( (decedent.firstName LIKE ''%${queryObj.benficiaryName}%'' OR decedent.middleName LIKE ''%${queryObj.benficiaryName}%'' OR decedent.lastName LIKE ''%${queryObj.benficiaryName}%'' OR decedent.firstName IN ('${words}') OR decedent.middleName IN ('${words}') OR decedent.lastName IN ('${words}')) 
                 OR 
                (beneficiary.firstName LIKE ''%${queryObj.benficiaryName}%'' OR beneficiary.middleName LIKE ''%${queryObj.benficiaryName}%'' OR beneficiary.lastName LIKE ''%${queryObj.benficiaryName}%'' OR beneficiary.firstName IN ('${words}') OR beneficiary.middleName IN ('${words}') OR beneficiary.lastName IN ('${words}')) )`
        }
        if (queryObj.callerName || queryObj.contactNoOrEmail) sql += await this._whereObjForCallerQuerying(queryObj)

        sql += ` AND Call.deletedAt IS NULL AND Call.archivedAt IS NULL`

        return sql
    }

    /**
     *To Check Given call is varified or not
     * @param {Object} callDetails its a object of callDetails
     */
    static async checkVerify (callDetails) {
        try {
            let isCallerVerified = callDetails.caller.isVerified || callDetails.caller.organizationId
            if (isCallerVerified && callDetails.reasonId === 1) {
                isCallerVerified = callDetails.decedent.filter(d => _.get(d, 'personVerificationDetails', false)).length === callDetails.decedent.length && _.has(callDetails, 'someOneHasPassed.personVerificationDetails')
            } else if (isCallerVerified && callDetails.reasonId === 2) {
                isCallerVerified = callDetails.beneficiary.filter(b => _.get(b, 'personVerificationDetails', false)).length === callDetails.beneficiary.length
            }
            return isCallerVerified
        } catch (e) {
            console.log(e)
        }
    }

    /**
     * this function returns the the models to include to fetch the call related data
     */
    static includesForCall () {
        return [
            {
                // including user as assignedTo for call
                model: models.CallAssignment,
                as: 'callsAssigned',
                include: {
                    model: models.Employee,
                    as: 'assignedTo'
                }
            },
            {
                // including person as caller for call
                model: models.Person.scope('withVerificationDetails', 'withPlace'),
                as: 'caller'
            }
        ]
    }

    /**
    *
    * @param {*} transaction is the transaction required for the query
    * @param {String} format is the format of returning the call details
    * @param {Array} scope is the scope for querying the DB tables with specified scopes
    */
    async getCallDetails (transaction, format = 'json', scope = { personScope: null }) {
        // Scope is added as null for person,
        // because the project flow was even showing the deleted persons till now
        // and we have a default scope in models that does not allow deleted persons
        // So, to override the default scope, null scope has been added
        try {
            let reason
            // finding the call of the given identifier
            let call = await models.Call.scope('withCallDocuments').findOne({
                where: {
                    identifier: this.identifier,
                    active: true,
                    archivedAt: null,
                    deletedAt: null
                },
                include: CallController.includesForCall(),
                transaction
            })
            if (call) {
                if (format === 'json') {
                    call = call.toJSON()
                }
                if (_.get(call, 'callDocuments', []).length) {
                    let signedUrls = []
                    await Promise.all(call.callDocuments.map(async doc => {
                        if ((doc.resourceDocumentImageUrl && doc.resourceDocumentImageUrl.originalFileName) || doc.imageUrl) {
                            let url = await commonDownloadFileWithSignature(doc.resourceDocumentImageUrl, doc.imageUrl)
                            doc.imageUrl = url
                            signedUrls.push(url)
                            return doc
                        }
                    }))
                    call.storedCallDocuments = call.callDocuments
                    call.callDocuments = signedUrls
                }
                switch (call.reasonId) {
                // finding the reason of the call based on the reason the call was created
                case 1:
                    reason = await AnController.getAnReasonOfCall(call.id, transaction, scope)
                    call.someOnePassed = reason
                    break
                case 2:
                    scope.personScope = ['withPlace', 'withVerificationDetails']
                    reason = await PnController.getPnReasonOfCall(call.id, transaction, scope)
                    call.preNeedReason = reason
                    break
                case 3:
                    reason = await MaintenanceRequestController.getMaintenanceReasonOfCall(call.id, transaction)
                    call.maintenanceRequestReason = reason
                    break
                case 4:
                    break
                case 5:
                    scope.personScope = ['withPlace', 'withVerificationDetails']
                    reason = await GenealogyController.getGenealogyOfCall(call.id, transaction, scope)
                    call.genealogySearchReason = reason
                    break
                case 6:
                    reason = await OtherRequestController.getOtherRequestOfCall(call.id, transaction)
                    call.otherRequest = reason
                    break
                default:
                    break
                }
                const notes = await CallController._getNotes(call.id, transaction)
                call.notes = notes
                return call
            }
            throw new Error('call not found')
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
    * bulk delete calls with reason to delete the calls
    * @param {Array} reqBody it is array of objects with callId and the reason to delete the call
    */

    static async bulkDeleteCalls (reqBody) {
        try {
            let k = 0
            const notFoundCalls = []
            const notFoundActionReasons = []
            const deletedCalls = []
            const errorObj = []
            for (const x of reqBody) {
                var callId = x.callId
                var reasonId = x.reasonId
                const callData = await models.Call.findOne(
                    { where: { identifier: callId, deletedAt: { [Op.eq]: null } } }
                )
                if (callData) {
                    const actionReasonsData = await models.ActionReason.findOne({ where: { id: reasonId } })
                    if (actionReasonsData) {
                        const updateRes = callData ? await callData.update({
                            deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                            deletedBy: reqBody.userId,
                            deleteReasonId: reasonId
                        }) : null
                        if (!updateRes.error) {
                            deletedCalls.push(callId)
                            k++
                        } else errorObj.push({ 'callId': callId, error: updateRes })
                    } else notFoundActionReasons.push(reasonId)
                } else notFoundCalls.push(callId)
            }
            if (reqBody.length === k) {
                return this._deleteCallsResponse(true, deletedCalls, 'deleted')
            } else {
                let notFoundObj = { success: false }
                Object.assign(notFoundObj, deletedCalls.length > 0 ? this._deleteCallsResponse(false, deletedCalls, 'deleted') : null,
                    notFoundCalls.length > 0 ? this._deleteCallsResponse(false, notFoundCalls, 'not found') : null,
                    notFoundActionReasons.length > 0 ? { notFoundActionReasons: notFoundActionReasons } : null)
                throw notFoundObj
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     *
     * @param {Boolean} isSuccess
     * @param {Array} calls
     * @param {String} msg
     */
    static _deleteCallsResponse (isSuccess, calls, msg) {
        let callKey = msg === 'deleted' ? 'deletedCalls' : 'notFoundCalls'
        return {
            success: isSuccess,
            [callKey]: calls,
            message: calls.length + ' call(s) are ' + msg
        }
    }

    /**
     *
     * @param {Object<{ticket: Object}>} ticketData
     * @param {Object} ticket is the object of the details of the ticket
     * @param {Object<{createdBy: Number, assignedTo: Number, dueDate: Date, status: Number, description: String, priority: Number}>} ticketHistoryData
     */
    static async createTicket (ticketData, ticketHistoryData) {
        let ticketController = new TicketController()
        const ticket = await ticketController.createTicket(ticketData, ticketHistoryData)
        return ticket
    }
    /**
 *
 * @param {Number} ticketId
  * @param {Object<{ticket: Object}>} ticketData
     * @param {Object} ticket is the object of the details of the ticket
     * @param {Object<{createdBy: Number, assignedTo: Number, dueDate: Date, status: Number, description: String, priority: Number}>} ticketHistoryData

 */
    static async updateTicket (ticketId, ticketData, ticketHistoryData) {
        let ticketController = new TicketController()
        const ticketDetails = await ticketController.getTicket(ticketId)
        const ticketStatus = TicketController.TicketStatus
        if (ticketDetails && ticketStatus[_.get(ticketDetails, 'status')] === 'Declined') {
            // changing the status of the ticket to open when the ticket being updated is in declined status
            const openStatus = Number(_.findKey(ticketStatus, e => e === 'Open'))
            ticketData.status = openStatus
            ticketHistoryData.status = openStatus
        }
        await models.sequelize.transaction(async (t) => {
            let updatedTicket = await ticketController.updateTicket(ticketId, ticketData, ticketHistoryData, t)
            // adding the documents given in the ticket updation
            if (_.get(ticketData, 'documents')) {
                await ResourceDocumentsController.createOrEditDocuments(ticketDetails.id, 'Ticket', _.get(ticketData, 'documents', []), t)
            }
            return updatedTicket
        })
        const updatedTicketData = await ticketController.getTicket(ticketId)
        return updatedTicketData
    }
    /**
 *
 * @param {Array<{ticketId: String, comment: String}>} ticketIdsToDelete
 * @param {Number} userId
 */
    static async archiveTicket (ticketIdsToDelete, userId) {
        let deletedCount = 0
        const notFoundTickets = []
        const deletedTickets = []
        for (const x of ticketIdsToDelete) {
            await models.sequelize.transaction(async (t) => {
                // step 1
                let ticketId = x.ticketId
                let ticketController = new TicketController()
                let ticketData = { archived: true, updatedBy: userId }
                const ticketHistoryData = { archivedAt: moment().format('MM/DD/YYYY HH:mm:ss'), createdBy: userId, comment: x.comment || `Archived on ${new Date()}` }
                const updatedTicket = await ticketController.updateTicket(ticketId, ticketData, ticketHistoryData, t)
                // step 2
                if (updatedTicket[0] === 1) {
                    deletedTickets.push(ticketId)
                    deletedCount++
                } else {
                    notFoundTickets.push(ticketId)
                }
            })
        }
        if (Object.keys(ticketIdsToDelete).length === deletedCount) {
            return { success: true, deletedTickets: deletedTickets }
        } else {
            return { success: false, notFoundTickets: notFoundTickets }
        }
    }
    /**
 * @param {Number} ticketId
 */
    static async getTicketDetails (ticketId) {
        let ticketController = new TicketController()
        let ticket = await ticketController.getTicket(ticketId)
        return ticket
    }
    /**
 *
 * @param {Number} priority
 * @param {Number} assignedTo
 * @param {String} callId
 * @param {String} searchkey
 * @param {Number} reason
 * @param {Number} page
 * @param {Number} limit
 * @param {String} sort
 * @param {Number} status
 * @param {Array<{Number}>} locationIds
 */
    static async getListOfTickets (priority, assignedTo, callId, searchkey, reason, page, limit, sort, status, locationIds) {
        let ticketController = new TicketController()
        let result = await ticketController.getListOfTickets(priority, assignedTo, callId, searchkey, reason, page, limit, sort, status, locationIds)
        return result
    }
    /**
 *
 * @param {Number} ticketStatusType
 * @param {Number} type
 * @param {Number} status
 * @param {String} callId
 * @param {Array<{Number}>} locationIds
 */
    static async getTicketsCount (ticketStatusType, type, status, callId, locationIds) {
        /**
         * Ambiguous coluom name fix
         * https://stackoverflow.com/questions/38942739/the-ambiguous-error-occurs-while-using-the-models-sequelize-col-in-the-includ
         */
        let attributesAndGroupFieldsInput = ['deceded.reasonId', models.sequelize.col('Ticket.status')]
        // let whereQueryInput = { Status: [1, 2, 3, 4], Archived: false }
        let whereQueryInput = { Status: [1, 2, 3, 4] }
        switch (ticketStatusType) {
        case 'overDueCount':
            whereQueryInput = {
                [Op.and]: [{ Status: [1, 2, 4] }, { dueDate: { [Op.lt]: new Date() } }]
                // Archived: false
            }
            type = null
            break

        case 'archivedCount':
            whereQueryInput = { Archived: true }
            type = null
            break

        case 'priorityCount':
            attributesAndGroupFieldsInput = ['deceded.reasonId', 'status', 'priority']
            if (Number(status) < 5) {
                whereQueryInput = { Status: Number(status), Archived: false }
            } else if (Number(status) === 5) { // overdue counts
                whereQueryInput = {
                    [Op.and]: [{ Status: [1, 2, 4] }, { dueDate: { [Op.lt]: new Date() } }]
                    // Archived: false
                }
            } else if (Number(status) === 6) {
                whereQueryInput = {
                    // Archived: true
                }
            } else if (Number(status) === 7) {
                if (callId) {
                    // whereQueryInput = { CallId: callId, Archived: false }
                    whereQueryInput = { CallId: callId }
                } else {
                    // whereQueryInput = { Archived: false }
                }
            }
            break

        default:
            type = null
            break
        }
        let ticketController = new TicketController()
        const getCountResult = await ticketController.getTicketsCount(whereQueryInput, attributesAndGroupFieldsInput, type, locationIds)
        return getCountResult
    }

    /**
     *
    * @param {*} queryObj is the object of all the queries done for fetching the Duplicate calls List
    * @param {Number} limit number of records to fetch
    * @param {Number} page the page number to fetch data
    * @param {Date} createdFrom to filter calls based on date
    * @param {Date} createdToDate to filter calls based on the date
    * @param {Number} reason get the calls list based on the callReason. call reason is an Number[] of Numbers
    * @param {string} callId search the call through callId (which is identifier in table)
    * @param {Number} assignedTo get the calls list based on the staffId.
    * @param {string} sortOrder get the calls list based on the first modified or last modified
    */
    static async getListOfCallDuplicates (queryObj) {
        try {
            let sql = `AND [C].[active] = 1 AND C.deletedAt IS NULL AND C.archivedAt IS NULL `
            Object.keys(queryObj).map((e) => {
                switch (e) {
                case 'callIds':
                    sql += ` AND [C].[identifier] IN (select value from STRING_SPLIT('${queryObj.callIds.join(',')}', ','))`
                    break
                case 'callId':
                    sql += ` AND [C].[identifier] LIKE '%${queryObj.callId}%'`
                    break
                case 'callType':
                    sql += ` AND [C].[reasonId] = ${queryObj.callType}`
                    break
                case 'createdFrom':
                case 'createdTo':
                    let startDate = moment(queryObj.createdFrom).tz(queryObj.timezone).startOf('day').format('YYYY/MM/DD')
                    let endDate = moment(queryObj.createdTo).tz(queryObj.timezone).endOf('day').format('YYYY/MM/DD')
                    sql += ` AND [C].[createdAt] between '${startDate}' AND '${endDate}'`
                    break
                case 'assigned':
                    sql += ` AND [C].[id] IN (SELECT callsAssigned.callId
                        FROM CallAssignment AS callsAssigned
                        WHERE C.id = callsAssigned.callId AND assignedToId = ${queryObj.assigned}) `
                    break
                default:
                    break
                }
            })
            const offset = (queryObj.page - 1) * queryObj.limit
            const sortOrder = queryObj.sortOrder || 'desc'
            const orderByQuery = `ORDER BY [C].[updatedAt] ${sortOrder}`
            let Query = ` DECLARE @DuplicateTemp TABLE(
                    id int,
                    identifier VARCHAR(200),
                    reasonId int,
                    isAlive int,
                    perId int,
                    dateOfBirth Date,
                    dateofDeath Date,
                    firstName VARCHAR(200),
                    middleName VARCHAR(200),
                    lastName VARCHAR(200),
                    onePortalId VARCHAR(200)
                );
                Insert @DuplicateTemp
                SELECT [Calls].[id] AS [id], [Calls].[identifier] AS [identifier], [Calls].[reasonId] AS [reasonId], pers.isAlive as isAlive,pers.id as perId, 
                pers.dateOfBirth AS dateOfBirth, dds.dateofDeath AS dateofDeath, pers.firstName AS firstName, pers.middleName AS middleName, pers.lastName AS lastName, pvd.onePortalId
                    FROM [Call] AS Calls
                    LEFT JOIN SomeOnePassed AS someOneHasPasseds ON someOneHasPasseds.callId = Calls.id AND Calls.reasonId = 1
                    LEFT JOIN PreArrangement  AS preNeedReasons ON preNeedReasons.callId = Calls.id  AND Calls.reasonId = 2
                    LEFT JOIN GenealogySearchReason  AS genealogy ON genealogy.callId = Calls.id  AND Calls.reasonId = 5
                    LEFT JOIN Person AS pers ON pers.id  in (someOneHasPasseds.decedentId, preNeedReasons.beneficiaryId, genealogy.decedentId)
                    LEFT JOIN DeathDetails AS dds ON dds.personId = pers.id
                    LEFT JOIN PersonVerificationDetails as pvd ON pvd.personId = pers.id
                    WHERE Calls.reasonId in (1, 2, 5) AND Calls.active = 1 AND Calls.deletedAt IS NULL AND Calls.archivedAt IS NULL

                SELECT [C].[id] AS [id], [C].[identifier] AS [callId], C.createdAt, C.reasonId, 
                (
                    SELECT assignedTo.name FROM CallAssignment AS callsAssigned
                    JOIN Employee AS assignedTo ON callsAssigned.assignedToId =assignedTo.id
                    WHERE C.id = callsAssigned.callId FOR JSON AUTO
                ) AS assigned,  
                (
                    SELECT ben.perId as id, ben.firstName as firstName, ben.middleName as middleName, ben.lastName as lastName, ben.isAlive, ben.onePortalId
                    FROM @DuplicateTemp ben
                    WHERE ben.id = C.id AND c.reasonId != 5 FOR JSON AUTO
                ) AS decedentOrBeneficary,  
                COALESCE((
                    SELECT id, firstName, middleName, lastName  FROM Person AS caller
                    WHERE C.callerId = caller.id FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
                ), '{}') AS caller, 
                duplicates.details as duplicateCalls FROM Call C
                OUTER APPLY( 
                    SELECT (
                        SELECT [Calls].[id], [Calls].[identifier] AS [identifier]
                        FROM @DuplicateTemp AS Call
                        JOIN @DuplicateTemp AS Calls ON Call.id != Calls.id AND Call.isAlive = calls.isAlive AND Call.reasonId = calls.reasonId
                        WHERE Call.id = C.id AND ( Call.perId = calls.perId 
                                OR CAST(Call.dateOfBirth AS date) = CAST(calls.dateOfBirth AS date)
                                OR CAST(Call.dateofDeath AS date) = CAST(calls.dateofDeath AS date)) 
                            AND (
                                dbo.RemoveSpecialChars(CONCAT(calls.firstName,  ' ', calls.lastName)) LIKE  '%'+  dbo.RemoveSpecialChars(CONCAT(Call.firstName,  ' ', Call.lastName)) +'%' 
                                OR dbo.RemoveSpecialChars(CONCAT(calls.firstName,  ' ', calls.lastName)) LIKE  '%'+  dbo.RemoveSpecialChars(CONCAT(Call.lastName,  ' ', Call.firstName)) +'%' 
                                OR dbo.RemoveSpecialChars(CONCAT(calls.lastName,  ' ', calls.firstName)) LIKE '%'+  dbo.RemoveSpecialChars(CONCAT(Call.lastName,  ' ', Call.firstName)) +'%'
                                OR dbo.RemoveSpecialChars(CONCAT(calls.lastName,  ' ', calls.firstName)) LIKE '%'+  dbo.RemoveSpecialChars(CONCAT(Call.firstName,  ' ', Call.lastName)) +'%'
                                OR dbo.RemoveSpecialChars(CONCAT(call.firstName,  ' ', call.lastName)) LIKE  '%'+  dbo.RemoveSpecialChars(CONCAT(Calls.firstName,  ' ', Calls.lastName)) +'%' 
                                OR dbo.RemoveSpecialChars(CONCAT(call.firstName,  ' ', call.lastName)) LIKE  '%'+  dbo.RemoveSpecialChars(CONCAT(Calls.lastName,  ' ', Calls.firstName)) +'%' 
                                OR dbo.RemoveSpecialChars(CONCAT(call.lastName,  ' ', call.firstName)) LIKE '%'+  dbo.RemoveSpecialChars(CONCAT(Calls.lastName,  ' ', Calls.firstName)) +'%'
                                OR dbo.RemoveSpecialChars(CONCAT(call.lastName,  ' ', call.firstName)) LIKE '%'+  dbo.RemoveSpecialChars(CONCAT(Calls.firstName,  ' ', Calls.lastName)) +'%'
                            )
                        FOR JSON PATH
                        ) AS 'details'
                    ) AS duplicates WHERE duplicates.details IS NOT NULL AND C.reasonId in (1, 2, 5) ${sql} `
            if (queryObj.page) {
                Query += ` ${orderByQuery} OFFSET ${offset} ROWS FETCH NEXT ${queryObj.limit} ROWS ONLY
                            DELETE FROM @DuplicateTemp`
            }
            const lists = await models.sequelize.query(Query, { type: models.sequelize.QueryTypes.SELECT })
            const list = await Promise.all(
                lists.map(async e => {
                    e = await convertToJson(e)
                    e.reason = {
                        id: e.reasonId,
                        value: reasons[e.reasonId]
                    }.value
                    e.duplicateCalls = _.uniqBy(e.duplicateCalls, 'id')
                    delete e.reasonId
                    return e
                })
            )
            return { list }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
 *
 * @param {Array<{content: String, level: String}} notesArr
 * @param {Number} callId
 * @param {Number} userId
 */
    static async createNotes (notesArr, callId, userId) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            let call = await models.Call.findOne({
                where: {
                    id: callId,
                    active: true,
                    archivedAt: null,
                    deletedAt: null
                },
                transaction
            })
            if (!call) {
                throw new Error('CALL_NOT_FOUND')
            }
            let res = await this.addNotes(notesArr, call.id, transaction, { userId })
            await transaction.commit()
            return res
        } catch (error) {
            logger.error(error)
            if (transaction) await transaction.rollback()
            throw error
        }
    }
}
module.exports = CallController
