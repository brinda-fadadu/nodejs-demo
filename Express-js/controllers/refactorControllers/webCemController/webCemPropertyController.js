/* eslint-disable no-unused-expressions */
const models = require('../../../models')
const Op = require('sequelize').Op
const { returnPropertyIncludes } = require('./helpers')
const logger = require('../../../lib/logger')
const moment = require('moment')
const WebcemController = require('./webCemController')
const hmisDB = require('../../../services/hmis/hmisConnection')
// const SchedulingController = require('../schedulingController/schedulingController')
const VerifiedPersonController = require('../personController/verifiedPersonController')
const WebCemController = require('./webCemController')
// const getPersonOverview = require('../personController/personContr')
const _ = require('lodash')
class webCemPropertyController {
    constructor (id) {
        this.personId = id
    }

    /**
     * Fetch PROPERTY DETAILS when new property data is added to DataBase
     */
    static async syncProperties () {
        try {
            let result = []
            let property = await models.Property.findAll({
                where: {
                    updatedAt: {
                        [Op.between]: [moment().subtract(30, 'minutes').toDate(), new Date()]
                    }
                },
                include: [
                    {
                        model: models.PropertyTypeCode,
                        as: 'propertyTypeCode',
                        required: true
                    },
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
                    },
                    {
                        model: models.AgreementProperty,
                        as: 'agreementProperties',
                        where: {
                            deletedAt: null,
                            deletedBy: null
                        },
                        required: false
                    }
                ]
            })
            let intermentRights
            if (property && property.length) {
                await Promise.all(property.map(async prop => {
                    intermentRights = await models.IntermentRights.findOne({
                        where: {
                            propertyTypeId: prop.propertyTypeCode.propertyTypeId,
                            propertyCampusId: prop.propertyGardens.propertyCampus.id
                        }
                    })
                    let [agmntProperty] = prop.agreementProperties
                    let agmntPropStatus = agmntProperty ? agmntProperty.reservationStatus : null
                    let reservationStatus = agmntPropStatus && !agmntProperty.deletedAt && !agmntProperty.deletedBy && agmntPropStatus === 'reserved' ? 'Reserved' : 'For Sale'
                    let userId = agmntProperty && agmntProperty.updatedBy ? agmntProperty.updatedBy : null
                    let user = {}
                    if (userId) {
                        user = await WebcemController.returnUserData(userId)
                    }
                    let payload = {
                        property: {
                            cl_ref: prop.lotSellUnitId,
                            lot_section_panel: null,
                            row_tier_division: null,
                            niche_grave_crypt: null,
                            grave_status: reservationStatus,
                            max_rights: intermentRights ? intermentRights.maxRights : 0,
                            no_of_graves: intermentRights ? intermentRights.graves : 0,
                            price: prop.price,
                            discount: null,
                            endowment_care: prop.ecfAmount
                        },
                        ...user,
                        decedent_properties: []
                    }
                    result.push(payload)
                }))
            }
            return result
        } catch (error) {
            return [{
                error: 'Some error has occured',
                error_message: error.message
            }]
        }
    }
    static async triggerPropertySyncEvent (reqBody) {
        const { queueNames, queues } = require('../../../appQueues')
        const webCemQueue = queues[queueNames.webCemQueue]
        let user = await models.User.findOne({
            where: {
                email: reqBody.user.email
            }
        })
        const query = `SELECT agreement.id as agreementId, iu.*, prop.id as propertyId
                FROM ItemUsage as iu 
                    INNER JOIN AgreementProperty as apr ON apr.id = iu.resourceId
                    INNER JOIN Agreement as agreement ON agreement.id = apr.agreementId
                    INNER JOIN Property as prop ON prop.id = apr.propertyId
               WHERE apr.deletedAt IS NULL AND apr.deletedBy IS NULL AND iu.deletedAt IS NULL AND prop.lotSellUnitId = ${reqBody.lotSellUnitId}`
        let list = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
        let agreementProperty = await WebCemController.contractCommonIncludes(reqBody.lotSellUnitId, { deletedAt: null, deletedBy: null })
        agreementProperty = agreementProperty[0]
        if (!agreementProperty) {
            const property = await models.Property.findOne({
                where: { lotSellUnitId: reqBody.lotSellUnitId }
            })
            if (property) {
                const webCemData = {
                    event: 'property.save',
                    propertyId: property.id,
                    userId: user.id,
                    status: property.status.trim() === 'H' ? 'Admin Hold' : property.status === 'NONEXIST' ? 'Non Exist' : null
                }
                webCemQueue.add('webCemQueue', webCemData)
                const webCemOwnerData = {
                    event: 'property.owners.add',
                    payload: {
                        propertyId: property.id,
                        agreementPropertyOwners: [],
                        userId: user.id,
                        triggerPoint: 'propertySync'
                    }
                }
                webCemQueue.add('webCemQueue', webCemOwnerData)
            } else {
                let query = `SELECT ls.Lot_Space_ID, ls.Sequence, ls.Lot_Depth, lsu.Lot_Sell_Unit_ID, lsu.Prpty_Price_1, lsu.[ECF_Amount], lsu.LSU_Status_Cd FROM Lot_Space as ls
                INNER JOIN Lot_Sell_Unit as lsu ON lsu.Lot_Sell_Unit_ID = ls.Lot_Sell_Unit_ID
                WHERE lsu.LSU_Status_Cd IN ('TB', 'TI') AND ls.Sequence = 1 AND lsu.Lot_Sell_Unit_ID = ${reqBody.lotSellUnitId}`
                let [tempProperty] = await hmisDB.sequelize.query(query, {
                    type: hmisDB.sequelize.QueryTypes.SELECT
                })
                if (tempProperty) {
                    const webCemData = {
                        event: 'property.save',
                        payload: {
                            lotSellUnitId: reqBody.lotSellUnitId,
                            userId: user.id
                        }
                    }
                    webCemQueue.add('webCemQueue', webCemData)
                }
            }
        } else {
            const ownerDetails = await models.AgreementPropertyOwner.findAll({
                where: {
                    agreementPropertyId: agreementProperty.id,
                    deletedAt: null,
                    deletedBy: null
                }
            })
            const property = _.get(agreementProperty, 'property')
            let hmisData
            if (agreementProperty.addendumId) {
                hmisData = await models.HMISAddendumDataSync.findOne({
                    where: {
                        addendumId: agreementProperty.addendumId,
                        statusId: 3
                    }
                })
            } else {
                hmisData = await models.HMISDataSync.findOne({
                    where: {
                        agreementId: agreementProperty.agreementId,
                        statusId: 3
                    }
                })
            }
            let [itemUsage] = await models.ItemUsage.findAll({
                where: {
                    resourceType: 'AgreementProperty',
                    resourceId: agreementProperty.id,
                    deletedAt: null,
                    deletedBy: null,
                    usageStatus: 2
                }
            })
            const webCemData = {
                event: 'property.save',
                propertyId: property.id,
                status: itemUsage ? 'Occupied' : hmisData ? 'Sold' : '',
                userId: user.id
            }
            webCemQueue.add('webCemQueue', webCemData)
            const webCemOwnerData = {
                event: 'property.owners.add',
                payload: {
                    propertyId: property.id,
                    agreementPropertyId: agreementProperty.id,
                    agreementPropertyOwners: ownerDetails,
                    userId: user.id,
                    agreementId: _.get(agreementProperty, 'agreementId'),
                    triggerPoint: 'propertySync'
                }
            }
            webCemQueue.add('webCemQueue', webCemOwnerData)
        }
        list.map(lis => {
            const webCemPayload = {
                event: 'property.decedents.add',
                payload: {
                    personId: lis.personId,
                    propertyId: lis.propertyId,
                    lotSellUnitId: reqBody.lotSellUnitId,
                    lotSpaceId: lis.lotSpaceId,
                    userId: user.id
                }
            }
            webCemQueue.add('webCemQueue', webCemPayload)
        })
        return 'Property related events are triggered'
    }
    /**
     * Fetch PROPERTY DETAILS when property is Reserved, Confirmed or Released
     * @param {*} propertyId is the id of Property
     * @param {*} tempPropData is the Temporary Property Data
     */
    static async saveProperty (propertyId, agreementId, status, tempPropData, userId, contractObj) {
        try {
            let user = {}
            if (userId) {
                user = await WebcemController.returnUserData(userId)
            }
            let contractObjResult = {}
            if (contractObj) {
                let contractNumber
                if (contractObj.addendumId) {
                    let contract = await models.Addendum.findOne({
                        where: {
                            id: contractObj.addendumId
                        }
                    })
                    contractNumber = contract.addendumNumber
                } else {
                    let contract = await models.Agreement.findOne({
                        where: {
                            id: contractObj.agreementId
                        }
                    })
                    contractNumber = contract.contractNumber
                }
                contractObjResult = {
                    contract_number: contractNumber,
                    purchased_date: contractObj.purchaseDate
                }
            }
            if (propertyId) {
                let property = await models.Property.findOne({
                    where: {
                        id: propertyId
                    },
                    include: [
                        {
                            model: models.PropertyTypeCode,
                            as: 'propertyTypeCode',
                            required: true
                        },
                        {
                            model: models.PropertyGarden,
                            as: 'propertyGardens',
                            require: true,
                            include: [
                                {
                                    model: models.PropertyCampus,
                                    as: 'propertyCampus',
                                    require: true
                                }
                            ]
                        },
                        {
                            model: models.AgreementProperty,
                            as: 'agreementProperties',
                            where: {
                                deletedAt: null,
                                deletedBy: null
                            },
                            required: false
                        }
                    ]
                })
                if (property) {
                    let intermentRights = await models.IntermentRights.findOne({
                        where: {
                            propertyTypeId: property.propertyTypeCode.propertyTypeId,
                            propertyCampusId: property.propertyGardens.propertyCampus.id
                        }
                    })
                    let [agmntProperty] = property.agreementProperties
                    let agmntPropStatus = agmntProperty ? agmntProperty.reservationStatus : null
                    let reservationStatus = status || (agmntPropStatus && !agmntProperty.deletedAt && !agmntProperty.deletedBy && (agmntPropStatus === 'reserved' || agmntPropStatus === 'confirmed') ? 'Reserved' : 'For Sale')
                    let discount = 0
                    if (agreementId || agmntProperty) {
                        let adjustments = await models.Adjustment.findAll({
                            where: { title: { [Op.in]: ['PN Discount', 'Predeveloped Discount', 'Pn Property Discount'] } },
                            include: [
                                {
                                    model: models.AdjustmentType,
                                    as: 'adjustmentType',
                                    where: { adjustmentType: 'OtherDiscount' }
                                }
                            ]
                        })
                        const pnAdj = adjustments.find(e => e.title === 'PN Discount')
                        const preDevAdj = adjustments.find(e => e.title === 'Predeveloped Discount')
                        // eslint-disable-next-line no-return-assign
                        const propertyAdj = adjustments.find(e => e.title = 'Pn Property Discount')
                        if (pnAdj && preDevAdj && propertyAdj && reservationStatus !== 'For Sale') {
                            let adjustments = await models.AgreementAdjustment.findAll({
                                where: {
                                    adjustmentId: { [Op.in]: [pnAdj.id, preDevAdj.id, propertyAdj.id] },
                                    agreementId: agreementId || agmntProperty.agreementId,
                                    propertyId,
                                    deletedAt: null,
                                    deletedBy: null
                                }
                            })
                            if (adjustments.length) {
                                adjustments.forEach(e => {
                                    discount = discount + e.amount
                                })
                            }
                        }
                    }
                    let query = `SELECT ls.Lot_Space_ID, ls.Sequence, ls.Lot_Depth, lsu.Lot_Sell_Unit_ID, ls.Section_Cd, lsu.LSU_Status_Cd , s.Sectn_Cod_Desc FROM Lot_Space as ls
                INNER JOIN Lot_Sell_Unit as lsu ON lsu.Lot_Sell_Unit_ID = ls.Lot_Sell_Unit_ID
                INNER JOIN Section as s ON s.Section_Cd = ls.Section_Cd
                WHERE lsu.Lot_Sell_Unit_ID = ${property.lotSellUnitId}`
                    let [propertyGarden] = await hmisDB.sequelize.query(query, {
                        type: hmisDB.sequelize.QueryTypes.SELECT
                    })
                    const propertyCampus = await models.PropertyGarden.findOne({
                        where: {
                            code: propertyGarden.Section_Cd
                        },
                        attributes: ['name'],
                        include: [{
                            model: models.PropertyCampus,
                            as: 'propertyCampus',
                            attributes: ['name', 'code']
                        }]
                    })
                    return {
                        property: {
                            cl_ref: property.lotSellUnitId,
                            garden: {
                                name: propertyGarden.Section_Cd.trim(),
                                description: propertyGarden.Sectn_Cod_Desc.trim(),
                                campus_type: _.get(propertyCampus, 'propertyCampus.code')
                            },
                            lot_section_panel: null,
                            row_tier_division: null,
                            niche_grave_crypt: null,
                            grave_status: reservationStatus,
                            max_rights: intermentRights ? intermentRights.maxRights : 0,
                            no_of_graves: intermentRights ? intermentRights.graves : 0,
                            price: property.price,
                            discount: discount,
                            endowment_care: property.ecfAmount,
                            ...contractObjResult
                        },
                        ...user,
                        decedent_properties: []
                    }
                } else {
                    logger.error(`Cannot get the property details of propertyId - ${propertyId} on ${moment().format('LLLL')}`)
                }
            } else {
                // For now fetching lot space by Sequence is 1
                let query = `SELECT ls.Lot_Space_ID, ls.Sequence, ls.Lot_Depth, lsu.Lot_Sell_Unit_ID, lsu.Prpty_Price_1, lsu.[ECF_Amount], lsu.LSU_Status_Cd FROM Lot_Space as ls
                INNER JOIN Lot_Sell_Unit as lsu ON lsu.Lot_Sell_Unit_ID = ls.Lot_Sell_Unit_ID
                WHERE lsu.LSU_Status_Cd IN ('TB', 'TI') AND ls.Sequence = 1 AND lsu.Lot_Sell_Unit_ID = ${tempPropData.lotSellUnitId}`
                let [tempProperty] = await hmisDB.sequelize.query(query, {
                    type: hmisDB.sequelize.QueryTypes.SELECT
                })
                if (tempProperty) {
                    let decedent
                    if (tempPropData.personId) {
                        decedent = await this.fetchDecedentDetails(tempPropData.personId, tempProperty.Lot_Space_ID, userId)
                        decedent.burial_status = 'Buried'
                        return {
                            property: {
                                cl_ref: tempProperty.Lot_Sell_Unit_ID,
                                lot_section_panel: null,
                                row_tier_division: null,
                                niche_grave_crypt: null,
                                grave_status: tempProperty.LSU_Status_Cd.trim(),
                                max_rights: null,
                                no_of_graves: null,
                                price: tempProperty.Prpty_Price_1,
                                discount: null,
                                endowment_care: tempProperty.ECF_Amount,
                                ...contractObjResult
                            },
                            decedent_properties: [
                                {
                                    decedent: decedent,
                                    lot_space_id: tempProperty.Lot_Space_ID,
                                    lot_space: {
                                        lot_space_id: tempProperty.Lot_Space_ID,
                                        lot_sell_unit_id: tempProperty.Lot_Sell_Unit_ID,
                                        sequence_number: tempProperty.Sequence,
                                        lot_depth: tempProperty.Lot_Depth.trim()
                                    }
                                }
                            ],
                            ...user
                        }
                    } else {
                        return {
                            property: {
                                cl_ref: tempProperty.Lot_Sell_Unit_ID,
                                lot_section_panel: null,
                                row_tier_division: null,
                                niche_grave_crypt: null,
                                grave_status: tempProperty.LSU_Status_Cd.trim(),
                                max_rights: null,
                                no_of_graves: null,
                                price: tempProperty.Prpty_Price_1,
                                discount: null,
                                endowment_care: tempProperty.ECF_Amount,
                                ...contractObjResult
                            },
                            ...user,
                            decedent_properties: []
                        }
                    }
                } else {
                    logger.error(`Cannot get the property details of propertyId - ${tempProperty.Lot_Sell_Unit_ID} on ${moment().format('LLLL')}`)
                }
            }
        } catch (error) {
            logger.error(error)
            logger.error(`Cannot get the property details of propertyId - ${propertyId} on ${moment().format('LLLL')}`)
            return {
                error: 'Some error has occured',
                error_message: error.message
            }
        }
    }

    /**
     * Fetch DECEDENT DETAILS of property when Decedent is added to Property
     * @param {*} personId is the id of Person
     * @param {*} propertyId is the id of Property
     * @param {*} lotSellUnitId is the lotSellUnitId of a Property
     * @param {*} lotSpaceId is the lotSpaceId of a Property
     */
    static async saveDecedentForProperty (personId, propertyId, lotSellUnitId, lotSpaceId, userId) {
        try {
            let decedent = await this.fetchDecedentDetails(personId, propertyId, userId)
            decedent.burial_status = 'Buried'
            let disintermentService = await WebCemController._getDisintermentService(personId)
            if (disintermentService) {
                if (disintermentService.disintermentService && disintermentService.disintermentService.intermentInformationDetails && !disintermentService.disintermentService.intermentInformationDetails.temporaryBurialLocation) {
                    decedent.burial_status = 'Reinterred'
                }
            }
            let query = `SELECT Lot_Space_ID, Sequence, Lot_Depth FROM Lot_Space 
                WHERE Lot_Space_ID = ${lotSpaceId}`
            let [lotSpace] = await hmisDB.sequelize.query(query, {
                type: hmisDB.sequelize.QueryTypes.SELECT
            })
            const user = await WebcemController.returnUserData(userId)
            return {
                property: {
                    cl_ref: lotSellUnitId
                },
                decedent_properties: [
                    {
                        decedent,
                        lot_space_id: lotSpaceId,
                        lot_space: {
                            lot_space_id: lotSpaceId,
                            lot_sell_unit_id: lotSellUnitId,
                            sequence_number: lotSpace.Sequence,
                            lot_depth: lotSpace.Lot_Depth.trim()
                        }
                    }
                ],
                ...user
            }
        } catch (error) {
            logger.error(error)
            logger.error(`Cannot get the property decedent details of decedentId - ${personId} and propertyId - ${propertyId} on ${moment().format('LLLL')}`)
            return {
                error: 'Some error has occured',
                error_message: error.message
            }
        }
    }

    /**
     * Fetch DECEDENT DETAILS
     * @param {*} personId is the id of Person
     * @param {*} propertyId is the id of Property
     */
    static async fetchDecedentDetails (personId, propertyId, userId) {
        try {
            let decedentData = await WebcemController.returnDecedentSavePayload(personId, userId)
            return {
                cl_ref: _.get(decedentData, 'cl_ref', ''),
                title: _.get(decedentData, 'title', ''),
                first_name: _.get(decedentData, 'first_name', ''),
                middle_name: _.get(decedentData, 'middle_name', ''),
                nee: _.get(decedentData, 'nee', ''),
                last_name: _.get(decedentData, 'last_name', ''),
                suffix: _.get(decedentData, 'suffix', ''),
                aka: _.get(decedentData, 'aka', ''),
                date_of_birth: _.get(decedentData, 'date_of_birth', ''),
                date_of_death: _.get(decedentData, 'date_of_death', ''),
                date_of_service: _.get(decedentData, 'date_of_service', ''),
                gender: _.get(decedentData, 'gender', ''),
                age: _.get(decedentData, 'age', ''),
                burial_status: _.get(decedentData, 'burial_status', ''),
                cremation_place: _.get(decedentData, 'cremation_place'),
                service_branch: _.get(decedentData, 'service_branch', ''),
                service_era: _.get(decedentData, 'service_era', '')
            }
        } catch (error) {
            logger.error(error)
            logger.error(`Cannot get the property decedent details of decedentId - ${personId} and propertyId - ${propertyId} on ${moment().format('LLLL')}`)
            return {
                error: 'Some error has occured',
                error_message: error.message
            }
        }
    }
    static async removePropertyOwner (data) {
        try {
            const property = await models.AgreementProperty.findOne({
                where: {
                    id: data.agreementPropertyId
                },
                include: [
                    {
                        model: models.Property,
                        as: 'property'
                    }
                ]
            })
            const person = await models.PersonVerificationDetails.findOne({
                where: {
                    personId: data.personId
                }
            })
            const user = await WebcemController.returnUserData(data.userId)
            logger.info('Removed owners associated to property are fetched')
            return {
                property: {
                    cl_ref: property.property.lotSellUnitId
                },
                owners: [person.onePortalId],
                user: user.user
            }
        } catch (error) {
            logger.error('Cannot fetch the removed owners for the property')
            return {
                error: 'Error has occured',
                error_message: error.message
            }
        }
    }
    static async getownerPayload (owner) {
        let person = await models.Person.scope('withMaritalStatus').findOne({
            where: {
                id: owner.ownerId
            },
            attributes: ['phoneNumber', 'secondaryPhoneNumber', 'email', 'isAlive'],
            include: [
                {
                    model: models.PersonVerificationDetails,
                    as: 'personVerificationDetails',
                    attributes: ['yearsAtResidentialAddress', 'onePortalId']
                }
            ]
        })
        let otherEthinicity = []
        let personalDetails = await WebcemController._fetchPersonalDetails(owner.ownerId, person.isAlive)
        const verifiedPerson = new VerifiedPersonController(owner.ownerId)
        const ethnicityDetails = await verifiedPerson.getEthnicityDetails()
        if (ethnicityDetails) {
            ethnicityDetails.ethnicityOne ? otherEthinicity.push(ethnicityDetails.ethnicityOne.name) : ''
            ethnicityDetails.ethnicityTwo ? otherEthinicity.push(ethnicityDetails.ethnicityTwo.name) : ''
            ethnicityDetails.ethnicityThree ? otherEthinicity.push(ethnicityDetails.ethnicityThree.name) : ''
        }
        let obj = {
            ethinicity: ethnicityDetails ? ethnicityDetails.hispanic ? ethnicityDetails.hispanic.name : '' : '',
            other_ethnicities: otherEthinicity || '',
            marital_status: person.maritalStatus ? person.maritalStatus.name : '',
            email: person.email ? person.email : '',
            phone: person.phoneNumber,
            phone2: person.secondaryPhoneNumber ? person.secondaryPhoneNumber : '',
            years_stayed_in_country: person.personVerificationDetails.yearsAtResidentialAddress
        }
        personalDetails.gender = personalDetails.gender || ''
        personalDetails.cl_ref = person.personVerificationDetails.onePortalId
        delete personalDetails.property
        delete personalDetails.date_of_service
        delete personalDetails.race
        delete personalDetails.burial_status
        delete personalDetails.cause_of_death
        delete personalDetails.yahrzeit_month
        delete personalDetails.yahrzeit_day
        delete personalDetails.church
        delete personalDetails.age
        delete personalDetails.picture_url
        delete personalDetails.date_of_death
        delete personalDetails.place_of_death
        personalDetails.cremation_place ? delete personalDetails.cremation_place : ''
        let result = {
            ...personalDetails,
            ...personalDetails.address,
            ...obj
        }
        delete result.address
        return result
    }
    static async addPropertyOwner (data) {
        try {
            const property = await models.Property.findOne({
                where: {
                    id: data.propertyId
                }
            })
            let addendum
            let contractNumber
            const user = await WebcemController.returnUserData(data.userId)
            if (data.addedInAddendumId) {
                addendum = await models.Addendum.findOne({
                    where: {
                        id: data.addedInAddendumId
                    }
                })
                contractNumber = addendum.addendumNumber
            }
            let propertyOwners = []
            if (data.triggerPoint === 'propertySync') {
                await Promise.all(data.agreementPropertyOwners.map(async agreementProperty => {
                    if (agreementProperty.addedInAddendumId) {
                        addendum = await models.Addendum.findOne({
                            where: {
                                id: agreementProperty.addedInAddendumId
                            }
                        })
                        contractNumber = addendum.addendumNumber
                    } else {
                        const agreement = await models.Agreement.findOne({
                            where: {
                                id: data.agreementId
                            }
                        })
                        contractNumber = agreement.contractNumber
                    }
                    const result = await this.getownerPayload(agreementProperty)
                    let ownerDetail = {
                        owner: {
                            ...result
                        },
                        contract_number: contractNumber
                    }
                    propertyOwners.push(ownerDetail)
                }))
            } else {
                await Promise.all(data.agreementPropertyOwners.map(async agreementProperty => {
                    if (agreementProperty.propertyId === data.propertyId) {
                        await Promise.all(agreementProperty.ownerDetails.map(async owner => {
                            if (data.personId === owner.ownerId) {
                                const result = await this.getownerPayload(owner)
                                let ownerDetail = {
                                    owner: {
                                        ...result
                                    },
                                    contract_number: data.addedInAddendumId ? contractNumber : agreementProperty.contractNumber
                                }
                                propertyOwners.push(ownerDetail)
                            }
                        }))
                    }
                }))
            }
            logger.info('Owner details associated to the property has been fetched')
            return {
                property: {
                    cl_ref: property.lotSellUnitId
                },
                property_owners: propertyOwners,
                user: user.user
            }
        } catch (error) {
            logger.error('Cannot fetch the owner associated to the property')
            return {
                error: 'Error has occured',
                error_message: error.message
            }
        }
    }
    /**
     * Fetch the lists of Persons associated to property when property is unselected
     * @param {*} data contains the list of propertyDetails, personDetails
    */
    static async removePropertyForDecedents (data) {
        try {
            let payload = {}
            payload.property = {}
            let decedentsArray = []
            payload.property.cl_ref = data.cl_ref
            const user = await WebcemController.returnUserData(data.userId)
            data.propertyDetails.map(async item => {
                let obj = {
                    decedent: { cl_ref: data.person.onePortalId, burial_status: 'Disinterred' },
                    lot_space_id: item.lotSpaceId
                }
                decedentsArray.push(obj)
            })
            payload.decedent_properties = decedentsArray
            payload.user = user.user
            logger.info('Persons associated to the particular property are fetched')
            return payload
        } catch (error) {
            logger.error('Cannot get the list of persons associated to the property')
            return {
                error: 'Some error has occured',
                error_message: error
            }
        }
    }

    /**
     * Fetch the lists of Persons associated to property when property is released
     * @param {*} resourceIds id of the agreement property
    */
    async removePropertyForDecedentsOnRelease (resourceIds) {
        try {
            let payload = {}
            payload.property = {}
            let decedentsArray = []
            const result = await models.AgreementProperty.scope('propertyScope').findOne({
                where: {
                    id: { [Op.in]: resourceIds }
                },
                include: returnPropertyIncludes()
            })
            payload.property.cl_ref = result.property.lotSellUnitId
            result.agreement.beneficiary.map((item) => {
                decedentsArray.push(item.personId)
            })
            payload.decedents = decedentsArray
            logger.info('Persons associated to the particular property are fetched')
            return payload
        } catch (error) {
            logger.error('Cannot get the list of persons associated to the property')
            return {
                error: 'Some error has occured',
                error_message: error
            }
        }
    }
}
module.exports = webCemPropertyController
