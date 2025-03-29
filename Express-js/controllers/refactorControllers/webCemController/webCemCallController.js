const models = require('../../../models')
// const logger = require('../../../lib/logger')
const seedValues = require('../../../config/seed')
const CallController = require('../callController/callController')
const AgreementController = require('../agreementController/agreementController')
const AddendumController = require('../agreementController/addendum')
const _ = require('lodash')
let reasons = seedValues.seed.CallReasons
const { convertToJson } = require('../utils')
const logger = require('../../../lib/logger')
const moment = require('moment')
const {
    returnAgreementIncludes
} = require('./helpers')
const AnController = require('../callController/anController')
class WebCemCallController {
    constructor (id) {
        this.personId = id
    }
    /**
     * @param {*} queryParams is the params to fetch  call Details
     * @param {String} firstName is the firstName the caller
     * @param {String} phoneNumber is the phoneNumber the caller
     */
    static async getCallerDetails (queryParams) {
        let whereConditions = ''
        if (queryParams.lastName) {
            whereConditions += `AND person.lastName LIKE '%${queryParams.lastName}%'`
        }
        if (queryParams.receivedLocationId) {
            whereConditions += `AND call.receivedLocationId = ${queryParams.receivedLocationId}`
        }
        const query = `SELECT
        (
            SELECT [pvd].[onePortalId] as onePortalId, [person].[firstName] as first_name, [person].[lastName] as last_name, [person].[middleName] as middle_name, [person].[phoneNumber] as phone_number, [person].[dateOfBirth] as dateOfBirth
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) as caller,
        (
            SELECT call.identifier as identifier, call.reasonId as reasonId, call.receivedLocationId as receivedLocationId FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) as callDetail
        FROM Call call 
        INNER JOIN Person person ON [person].[id] = [call].[callerId]
        INNER JOIN PersonVerificationDetails pvd ON [pvd].[personId] = [person].[id]
        WHERE Call.deletedAt IS NULL AND person.firstName LIKE '%${queryParams.firstName}%' AND person.phoneNumber = '${queryParams.phoneNumber}' ${whereConditions}`
        let callerList = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
        callerList.map(e => convertToJson(e))
        callerList.map(callerList => {
            if (callerList.callDetail.reasonId) {
                callerList.callDetail.call_reason = reasons[callerList.callDetail.reasonId]
            }
            callerList.caller.dateOfBirth = _.get(callerList, 'caller.dateOfBirth') ? moment(_.get(callerList, 'caller.dateOfBirth')).format('MM/DD/YYYY') : ''
        })
        logger.error('Caller details are fetched along with call details')
        return callerList
    }
    static async callLocations () {
        const locations = [
            { value: 1, label: 'Cremation Society', code: 'CCS' },
            { value: 2, label: 'Product Name', code: 'CFS' },
            { value: 3, label: 'All County Cremation Service', code: 'ACC' },
            { value: 4, label: 'Crosby-N. Gray & Co. Funeral Home', code: 'CNG' },
            {
                value: 5,
                label: 'Miller-Dutra Coastside Chapel & Funeral Home',
                code: 'MDC'
            },
            {
                value: 6,
                label: 'Sneider & Sullivan & O’Connell’s Funeral Home',
                code: 'SSO'
            }
        ]
        return locations
    }
    static async getPersonId (onePortalId) {
        const personId = await models.Person.findOne({
            attributes: ['id'],
            include: [{
                model: models.PersonVerificationDetails,
                as: 'personVerificationDetails',
                attributes: ['onePortalId'],
                where: { onePortalId },
                required: true
            }]
        })
        return personId ? personId.id : null
    }
    static async getCallId (identifier) {
        const call = await models.Call.findOne({
            where: {
                identifier
            },
            attributes: ['id']
        }
        )
        return call ? call.id : ''
    }
    /**
     * @param {*} data is the reqBody for the call
     * @param {Object} caller is the object of the basic details of the person added as the caller
     * @param {Object} decedent.beneficary is the object of the basic details of the person added as the decedent/beneficiary
     * @param {Number} receivedLocationId is the integer which defines the location where the call is received
     * @param {Number} reasonId is the integer which defines the reason for which the call is made
     * @param {Object} user is the object of user who is looged currently
     */

    static async createOrUpdateCall (reqBody) {
        try {
            let reasonPayload
            let callId = ''
            let reasonsId = ''
            let verifiedCaller
            let informant
            let decedentDeatils
            const user = await models.User.findOne({
                where: {
                    email: reqBody.user.email
                }
            })
            if (reqBody.callId) {
                callId = await this.getCallId(reqBody.callId)
                if (!callId) {
                    throw new Error('CALL_NOT_FOUND')
                }
                let reason
                if (reqBody.reasonId === 1) {
                    reason = await models.SomeOnePassed.findOne({
                        where: {
                            callId
                        },
                        attributes: ['id']
                    })
                } else {
                    reason = await models.PreArrangement.findOne({
                        where: {
                            callId
                        },
                        attributes: ['id']
                    })
                }
                reasonsId = reason ? reason.id : ''
                const informantPayload = await AnController.getAnReasonOfCall(callId)
                informant = _.get(informantPayload, '[0].informant')
            }
            if (reqBody.reasonId === 1) {
                if (_.get(reqBody, 'decedent.onePortalId')) {
                    const personId = await this.getPersonId(reqBody.decedent.onePortalId)
                    decedentDeatils = await models.Person.scope(['withDeathDetails', 'withPlace']).findOne({
                        where: {
                            id: personId
                        }
                    })
                }
                reasonPayload = [
                    {
                        'id': reasonsId,
                        'isCallerNok': false,
                        'callerDecedentRelation': {},
                        'decedent': {
                            'id': _.get(reqBody, 'decedent.onePortalId', '') ? await this.getPersonId(reqBody.decedent.onePortalId) : null,
                            'prefix': _.get(decedentDeatils, 'prefix', ''),
                            'aka': _.get(decedentDeatils, 'aka', ''),
                            'firstName': _.get(reqBody, 'decedent.firstName', ''),
                            'middleName': _.get(decedentDeatils, 'middleName', ''),
                            'lastName': _.get(reqBody, 'decedent.lastName') ? _.get(reqBody, 'decedent.lastName') : _.get(decedentDeatils, 'lastName', ''),
                            'phoneNumber': _.get(reqBody, 'decedent.phoneNumber', '')
                        },
                        'haveFuneralPN': false,
                        'haveCemeteryPN': false,
                        'isReadyForPickup': false,
                        'isInformantSameAsCaller': true,
                        'informantDecedentRelation': {},
                        'informant': {
                            'id': informant && _.get(informant, 'personVerificationDetails.onePortalId') ? await this.getPersonId(informant.personVerificationDetails.onePortalId) : _.get(reqBody, 'caller.onePortalId') ? await this.getPersonId(reqBody.caller.onePortalId) : null,
                            'prefix': null,
                            'aka': '',
                            'firstName': _.get(reqBody, 'caller.firstName'),
                            'middleName': _.get(reqBody, 'caller.middleName'),
                            'lastName': _.get(reqBody, 'caller.lastName'),
                            'phoneNumber': _.get(reqBody, 'caller.phoneNumber')
                        },
                        'familyArranger': {
                            'email': '',
                            'firstName': '',
                            'lastName': '',
                            'secondaryEmail': ''
                        }
                    }
                ]
            } else {
                reasonPayload = [
                    {
                        'id': reasonsId,
                        'beneficiary':
                        {
                            'id': _.get(reqBody, 'beneficiary.onePortalId') ? await this.getPersonId(reqBody.beneficiary.onePortalId) : null,
                            'firstName': _.get(reqBody, 'beneficiary.firstName', ''),
                            'middleName': _.get(reqBody, 'beneficiary.middleName', ''),
                            'lastName': _.get(reqBody, 'beneficiary.lastName', ''),
                            'phoneNumber': _.get(reqBody, 'beneficiary.phoneNumber', ''),
                            'prefix': _.get(reqBody, 'beneficiary.prefix', '')
                        },
                        'isBeneficiarySameAsCaller': false,
                        'needFuneralService': false,
                        'needCemeteryService': false,
                        'isExistingPreneed': false
                    }
                ]
            }
            const payload = {
                'type': 1,
                'status': 1,
                'id': callId,
                'receivedLocationId': reqBody.recievedLocationId,
                'locationCode': reqBody.locationCode,
                'assignedToId': [],
                'languageId': 1,
                'caller': {
                    'id': _.get(reqBody, 'caller.onePortalId') ? await this.getPersonId(reqBody.caller.onePortalId) : null,
                    'firstName': _.get(reqBody, 'caller.firstName'),
                    'middleName': _.get(reqBody, 'caller.middleName'),
                    'lastName': _.get(reqBody, 'caller.lastName'),
                    'phoneNumber': _.get(reqBody, 'caller.phoneNumber')
                },
                'reasonId': _.get(reqBody, 'reasonId'),
                'notes': [],
                'reasons': reasonPayload,
                'userId': user ? user.id : ''
            }
            let verifiedDecedents = []
            // creating or updating the call
            const createdCall = await CallController.createOrUpdate(payload)
            // listing decedents/ beneficiry of the call
            const decedentsOfCall = await CallController.getDecedentsOrBeneficiariesOfCall(createdCall, reqBody.reasonId, true)
            // verifying the caller if ot verified
            if (!_.get(createdCall, 'caller.isVerified')) {
                const callController = new CallController(createdCall.identifier)
                const payload = {
                    unverifiedPersonId: _.get(createdCall, 'caller.id'),
                    personType: 'caller',
                    personInformation: createdCall.caller,
                    currentUserId: user ? user.id : ''
                }
                verifiedCaller = await callController.verifyCall(payload)
            }
            // verifying all the decedents
            await Promise.all(decedentsOfCall.map(async decedent => {
                const personType = !decedent.isAlive ? 'decedent' : 'beneficiary'
                if (!decedent.isVerified) {
                    const callController = new CallController(createdCall.identifier)
                    const payload = {
                        unverifiedPersonId: decedent.id,
                        personType: personType,
                        personInformation: decedent,
                        currentUserId: user ? user.id : ''
                    }
                    const verifiedPerson = await callController.verifyCall(payload)
                    verifiedDecedents.push(verifiedPerson)
                }
            }))
            let callerId = verifiedCaller ? _.get(verifiedCaller, 'onePortalId') : _.get(createdCall, 'caller.personVerificationDetails.onePortalId')
            let informantOnePortalId = _.get(informant, 'personVerificationDetails.onePortalId')
            const resultPayload = {
                callId: createdCall.identifier,
                callerId: callerId,
                informantId: callerId === informantOnePortalId ? null : informantOnePortalId || null,
                decedentOrBeneficiaryId: verifiedDecedents.length ? verifiedDecedents.map(decedent => {
                    return _.get(decedent, 'onePortalId')
                }) : decedentsOfCall.map(decedent => {
                    return _.get(decedent, 'personVerificationDetails.onePortalId')
                }),
                needType: createdCall.reasonId
            }
            logger.info('Call is successfuly created from the RDMS')
            return resultPayload
        } catch (error) {
            logger.error(`Unable to create the call from RDMS...${error}`)
            throw error
        }
    }
    /**
     * @param {String} onePortalId is the onePortalId tof decedents
     */
    static async getContractsForDecedents (onePortalId) {
        try {
            const saleTypes = require('../../../seeders/sale-type.json')
            const person = await models.PersonVerificationDetails.findOne({
                where: {
                    onePortalId
                },
                attributes: ['personId']
            })
            if (!person) {
                throw new Error('PERSON_NOT_FOUND')
            }
            const types = [
                AgreementController.TYPES['Cemetry'],
                AgreementController.TYPES['Funeral']
            ]
            const needTypes = AgreementController.NEED_TYPES
            const agreements = await models.Agreement.findAll({
                where: {
                    type: types
                },
                attributes: ['id', 'type', 'needType', 'contractNumber', 'totalPrice', 'arrangerId', 'totalPurchasePrice', 'due', 'createdAt', 'status', 'saleTypeId'],
                include: returnAgreementIncludes(person.personId)
            })
            let result = []
            if (agreements && agreements.length) {
                let agreementDetails
                await Promise.all(agreements.map(async agreement => {
                    if (agreement.type === 2) {
                        if (agreement.status === 'Submitted') {
                            const addendumController = new AddendumController(agreement.id)
                            const addendum = await addendumController.getAllAddendum()
                            if (addendum && addendum.addendumList && addendum.addendumList.length > 0) {
                                const addendumList = addendum.addendumList
                                agreementDetails = addendumList[addendumList.length - 1]
                                agreementDetails.key = 'Addendum'
                            } else if (addendum && addendum.agreementDetails) {
                                agreementDetails = addendum.agreementDetails
                                agreementDetails.key = 'Agreement'
                            }
                        } else {
                            agreementDetails = agreement
                            agreementDetails.key = 'Agreement'
                        }
                        const [filteredSaleType] = saleTypes.filter(function (e) {
                            return e.id === agreementDetails.saleTypeId
                        })
                        const obj = {
                            id: _.get(agreementDetails, 'agreementId') || _.get(agreementDetails, 'id'),
                            contract_number: _.get(agreementDetails, 'addendumNumber') || _.get(agreementDetails, 'contractNumber'),
                            agreement:
                                AgreementController.TYPES['Funeral'] === _.get(agreementDetails, 'type')
                                    ? 'Funeral'
                                    : 'Cemetery',
                            agreement_type:
                                needTypes['AN'] === _.get(agreementDetails, 'needType')
                                    ? 'At-Need'
                                    : 'Pre_Need',
                            counsellor: _.get(agreementDetails, 'arranger.name'),
                            cart_value: agreementDetails.totalPrice || 0,
                            createdDate: moment(agreementDetails.createdAt).format('MM/DD/YYYY HH:mm:ss'),
                            status: agreementDetails.status,
                            key: agreementDetails.key,
                            needType: agreementDetails.needType,
                            saleTypeId: {
                                id: agreementDetails.saleTypeId,
                                code: filteredSaleType.code,
                                description: filteredSaleType.description
                            }
                        }
                        result.push(obj)
                    }
                }))
            }
            logger.info('All contracts for decedents are fetched')
            return result
        } catch (err) {
            logger.error('Unable to fetch the contracts')
            throw err
        }
    }
    /**
     * @param {*} queryParams is the params to fetch  decedent Details
     * @param {String} firstName is the firstName the decedent
     * @param {String} phoneNumber is the phoneNumber the decedent
     */

    static async decedentSearch (queryParams) {
        let whereConditions = ''
        if (queryParams.lastName) {
            whereConditions += `AND person.lastName LIKE '%${queryParams.lastName}%'`
        }
        const query = `select person.id as id, person.firstName as firstName, person.lastName as lastName,
             person.phoneNumber as phoneNumber, person.isAlive as isAlive, person.isVerified as isVerified, pvd.onePortalId as onePortalId, person.dateOfBirth as dob, deathDetails.dateOfDeath as dod,
        (
            select addr.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) as addressPlace
        FROM Person person
        INNER JOIN PersonVerificationDetails pvd ON pvd.personId = person.id
        LEFT JOIN DeathDetails deathDetails ON deathDetails.personId = person.id
        LEFT JOIN Place plc ON plc.id = person.addressPlaceId
        LEFT JOIN Address addr ON addr.id = plc.addressId where person.firstName LIKE '%${queryParams.firstName}%' AND person.phoneNumber = '${queryParams.phoneNumber}' ${whereConditions}`
        let decedentList = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
        decedentList.map(e => convertToJson(e))
        await Promise.all(decedentList.map(async list => {
            list.address = _.get(list, 'addressPlace') ? [list.addressPlace.line1, list.addressPlace.line2, list.addressPlace.city, list.addressPlace.state, list.addressPlace.country, list.addressPlace.zipcode].join(' ').trim() : null
            list.contracts = list.isVerified ? await this.getContractsForDecedents(_.get(list, 'onePortalId')) : []
            delete list.addressPlace
        }))
        return decedentList
    }
    static async getDecedentsOrBeneficiaries (callIdentifier, reasonId) {
        let transaction = await models.sequelize.transaction()
        try {
            const callController = new CallController(callIdentifier)
            const callDetails = await callController.getCallDetails(transaction)
            const decedentsOrBeneficiary = await CallController.getDecedentsOrBeneficiariesOfCall(callDetails, Number(reasonId), true)
            const formattedDecedentPayload = await Promise.all(decedentsOrBeneficiary.map(async decedent => {
                if (decedent.isVerified) {
                    let dodForAnTurnPnCase = ''
                    if (Number(reasonId) === 2 && !decedent.isAlive) {
                        dodForAnTurnPnCase = await models.Person.scope('withDeathDetails').findOne({
                            where: {
                                id: decedent.id
                            }
                        })
                    }
                    return {
                        onePortalId: _.get(decedent, 'personVerificationDetails.onePortalId'),
                        firstName: _.get(decedent, 'firstName'),
                        lastName: _.get(decedent, 'lastName'),
                        middleName: _.get(decedent, 'middleName'),
                        dob: _.get(decedent, 'dateOfBirth'),
                        dod: _.get(decedent, 'deathDetails.dateOfDeath') || _.get(dodForAnTurnPnCase, 'deathDetails.dateOfDeath') || null,
                        phoneNumber: _.get(decedent, 'phoneNumber'),
                        isAlive: _.get(decedent, 'isAlive'),
                        address: _.get(decedent, 'addressPlace.address') ? [decedent.addressPlace.address.line1, decedent.addressPlace.address.line2, decedent.addressPlace.address.city, decedent.addressPlace.address.state, decedent.addressPlace.address.country, decedent.addressPlace.address.zipcode].join(' ').trim() : null,
                        reasonId: reasonId,
                        contracts: await this.getContractsForDecedents(_.get(decedent, 'personVerificationDetails.onePortalId'))

                    }
                }
            }))
            await transaction.commit()
            return _.compact(formattedDecedentPayload)
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }
}
module.exports = WebCemCallController
