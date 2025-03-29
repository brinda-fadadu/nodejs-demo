/* eslint-disable camelcase */
/* eslint-disable no-unused-expressions */
const Op = require('sequelize').Op
const models = require('../../../models')
const AgreementController = require('../agreementController/agreementController')
const WebCemController = require('./webCemController')
const AddendumController = require('../agreementController/addendum')
const AgreementPropertyAdditionalRights = require('../agreementController/agreementPropertyAdditionalRights')
const _ = require('lodash')
const PropertyController = require('../agreementController/agreementPropertiesController')
class WebCemPropertyReservationController {
    constructor (id) {
        this.personId = id
    }
    static async contractInformationPayload (agreementDetails) {
        let purchaserDetails = null
        if (agreementDetails.purchaser) {
            purchaserDetails = {
                purchaser: {
                    cl_ref: _.get(agreementDetails, 'purchaser.person.personVerificationDetails.onePortalId', ''),
                    first_name: _.get(agreementDetails, 'purchaser.person.firstName', ''),
                    middle_name: _.get(agreementDetails, 'purchaser.person.middleName', ''),
                    last_name: _.get(agreementDetails, 'purchaser.person.lastName', '')
                }
            }
        }
        const result = {
            id: agreementDetails.addendumNumber || agreementDetails.contractNumber,
            agreementId: agreementDetails.addendumNumber ? agreementDetails.agreementId : agreementDetails.id,
            created_at: agreementDetails.createdAt,
            cart_value: agreementDetails.totalPrice || 0,
            reservation_type: agreementDetails.reservationType || _.get(agreementDetails, 'dataValues.reservationType', ''),
            max_rights: agreementDetails.maxRights || _.get(agreementDetails, 'dataValues.maxRights', 0),
            total_rights: agreementDetails.totalRights || _.get(agreementDetails, 'dataValues.totalRights', 0),
            default_rights: agreementDetails.defaultRights || _.get(agreementDetails, 'dataValues.defaultRights', 0),
            graves: agreementDetails.graves || _.get(agreementDetails, 'dataValues.graves', 0),
            available_rights: agreementDetails.availableRights || _.get(agreementDetails, 'dataValues.availableRights', 0),
            sales_type:
            {
                id: agreementDetails.saleType ? agreementDetails.saleType.id : '',
                description: agreementDetails.saleType ? agreementDetails.saleType.description : ''
            },
            counsellor:
            {
                id: agreementDetails.arranger ? agreementDetails.arranger.id : '',
                name: agreementDetails.arranger ? agreementDetails.arranger.name : ''
            },
            status: agreementDetails.status,
            cemetery_authority:
            {
                id: _.get(agreementDetails, 'location.id'),
                name: _.get(agreementDetails, 'location.name')
            },
            needType: _.get(agreementDetails, 'needType'),
            ...purchaserDetails
        }
        return result
    }
    static async getPropertiesForContract (contractNumber, id) {
        let whereConditions
        if (contractNumber) {
            whereConditions = {
                contractNumber: contractNumber
            }
        } else {
            whereConditions = {
                id: id
            }
        }
        const properties = await models.Agreement.findOne({
            where: whereConditions,
            attributes: ['id', 'contractNumber', 'status'],
            include: [{
                model: models.AgreementProperty,
                as: 'agreementProperties',
                where: {
                    deletedAt: null,
                    deletedBy: null
                },
                attributes: ['id', 'agreementId', 'propertyId'],
                include: [{
                    model: models.Property,
                    as: 'property',
                    attributes: ['id', 'name', 'lotSellUnitId'],
                    include: [{
                        model: models.PropertyGarden,
                        as: 'propertyGardens'
                    }]
                }]
            }]
        })
        let propertiesOfContract = []
        if (properties) {
            await Promise.all(properties.agreementProperties.map(async agreementProperty => {
                propertiesOfContract.push(_.get(agreementProperty, 'property.lotSellUnitId'))
            }))
        }
        return propertiesOfContract
    }
    static async getContractInformationByContractNumber (contractNumber, lotSellUnitId, transaction) {
        let agreementDetails, key, no_of_burials
        const agreement = await models.Agreement.findOne({
            where: { contractNumber: contractNumber }
        })
        const lotSellUnitIds = [lotSellUnitId]
        const propertyDataFromHmis = await models.Property.getDataFromHmis(lotSellUnitIds)
        const lotSpaceIds = propertyDataFromHmis.map(property => property.lot_space)
        const itemUsage = await models.ItemUsage.findAll({
            where: {
                lotSpaceId: { [Op.in]: lotSpaceIds },
                usageStatus: 2,
                deletedAt: null,
                deletedBy: null
            }
        })
        if (agreement) {
            if (agreement.status === 'Submitted') {
                const addendumController = new AddendumController(agreement.id)
                const addendum = await addendumController.getAllAddendum(transaction, true, lotSellUnitId)
                if (addendum && addendum.addendumList && addendum.addendumList.length > 0) {
                    const addendumList = addendum.addendumList
                    agreementDetails = addendumList[addendumList.length - 1]
                } else if (addendum && addendum.agreementDetails) {
                    agreementDetails = addendum.agreementDetails
                } else {
                    throw new Error('AGREEMENTS_NOT_FOUND')
                }
                key = 'Addendum'
                no_of_burials = itemUsage.length
            } else {
                const agreementController = new AgreementController(agreement.id)
                agreementDetails = await agreementController.getAgreementDetails(transaction, true, lotSellUnitId)
                key = 'Agreement'
                no_of_burials = 0
            }
            const result = await this.contractInformationPayload(agreementDetails)
            result.key = key
            result.no_of_burials = no_of_burials
            result.properties = await this.getPropertiesForContract(contractNumber)
            return result
        } else {
            throw new Error('AGREEMENT_NOT_FOUND_FOR_THIS_CONTRACT_NUMBER')
        }
    }
    static async getContractByProperty (lotSellUnitId, transaction) {
        let whereConditions = {
            deletedAt: null,
            deletedBy: null
        }
        const lotSellUnitIds = [lotSellUnitId]
        const propertyDataFromHmis = await models.Property.getDataFromHmis(lotSellUnitIds)
        const lotSpaceIds = propertyDataFromHmis.map(property => property.lot_space)
        const itemUsage = await models.ItemUsage.findAll({
            where: {
                lotSpaceId: { [Op.in]: lotSpaceIds },
                usageStatus: 2,
                deletedAt: null,
                deletedBy: null
            }
        })
        const contractDetails = await WebCemController.contractCommonIncludes(lotSellUnitId, whereConditions)
        let agreementDetails, key
        if (contractDetails && contractDetails.length > 0) {
            const contractDetail = contractDetails[0]
            if (contractDetail.addendumId) {
                const addendumController = new AddendumController(contractDetail.agreementId)
                const addendum = await addendumController.getAllAddendum(transaction, true, lotSellUnitId)
                if (addendum && addendum.addendumList && addendum.addendumList.length > 0) {
                    const addendumList = addendum.addendumList
                    agreementDetails = addendumList[addendumList.length - 1]
                } else if (addendum && addendum.agreementDetails) {
                    agreementDetails = addendum.agreementDetails
                }
                key = 'Addendum'
            } else if (contractDetail.agreementId) {
                const agreement = await models.Agreement.findOne({
                    where: {
                        id: contractDetail.agreementId
                    }
                })
                if (agreement.status === 'Submitted') {
                    const addendumController = new AddendumController(contractDetail.agreementId)
                    const addendum = await addendumController.getAllAddendum(transaction, true, lotSellUnitId)
                    if (addendum && addendum.addendumList && addendum.addendumList.length > 0) {
                        const addendumList = addendum.addendumList
                        agreementDetails = addendumList[addendumList.length - 1]
                    } else if (addendum && addendum.agreementDetails) {
                        agreementDetails = addendum.agreementDetails
                    }
                    key = 'Addendum'
                } else {
                    const agreementController = new AgreementController(contractDetail.agreementId)
                    agreementDetails = await agreementController.getAgreementDetails(transaction, true, lotSellUnitId)
                    key = 'Agreement'
                }
            }
            const result = await this.contractInformationPayload(agreementDetails)
            result.key = key
            result.no_of_burials = itemUsage.length
            if (agreementDetails.contractNumber) {
                result.properties = await this.getPropertiesForContract(agreementDetails.contractNumber, agreementDetails.id)
            }
            return result
        } else {
            throw new Error('AGREEMENTS_NOT_FOUND')
        }
    }
    static async getContractDetailsByPurchaserOPI (onePortalId, lotSellUnitId, transaction) {
        let agreementDetails; let agreements = []; let purchaser = {}
        const contractDetails = await models.Agreement.findAll({
            where: { type: 2 },
            attributes: ['id', 'status', 'contractNumber'],
            include: [
                {
                    model: models.AgreementPerson,
                    as: 'purchaser',
                    attributes: ['agreementId', 'personId'],
                    include: [
                        {
                            model: models.Person,
                            as: 'person',
                            attributes: [
                                'firstName',
                                'middleName',
                                'lastName'
                            ],
                            required: true,
                            include: [
                                {
                                    model: models.PersonVerificationDetails,
                                    as: 'personVerificationDetails',
                                    attributes: ['onePortalId'],
                                    where: { onePortalId }
                                }]
                        }
                    ]
                }]
        })
        const lotSellUnitIds = [lotSellUnitId]
        const propertyDataFromHmis = await models.Property.getDataFromHmis(lotSellUnitIds)
        const lotSpaceIds = propertyDataFromHmis.map(property => property.lot_space)
        const itemUsage = await models.ItemUsage.findAll({
            where: {
                lotSpaceId: { [Op.in]: lotSpaceIds },
                usageStatus: 2,
                deletedAt: null,
                deletedBy: null
            }
        })
        if (contractDetails && contractDetails.length) {
            await Promise.all(contractDetails.map(async contract => {
                if (contract.status === 'Submitted') {
                    const addendumController = new AddendumController(contract.id)
                    const addendum = await addendumController.getAllAddendum(transaction, true, lotSellUnitId)
                    if (addendum && addendum.addendumList && addendum.addendumList.length > 0) {
                        const addendumList = addendum.addendumList
                        agreementDetails = addendumList[addendumList.length - 1]
                        const result = await this.contractInformationPayload(agreementDetails)
                        purchaser = result.purchaser
                        delete result.purchaser
                        result.key = 'Addendum'
                        result.no_of_burials = itemUsage.length
                        result.properties = await this.getPropertiesForContract(agreementDetails.contractNumber, agreementDetails.id)
                        agreements.push(result)
                    } else if (addendum && addendum.agreementDetails) {
                        agreementDetails = addendum.agreementDetails
                        const agreementResult = await this.contractInformationPayload(agreementDetails)
                        purchaser = agreementResult.purchaser
                        delete agreementResult.purchaser
                        agreementResult.key = 'Agreement'
                        agreementResult.no_of_burials = itemUsage.length
                        agreementResult.properties = await this.getPropertiesForContract(agreementDetails.contractNumber, agreementDetails.id)
                        agreements.push(agreementResult)
                    }
                } else {
                    const agreementController = new AgreementController(contract.id)
                    agreementDetails = await agreementController.getAgreementDetails(transaction, true, lotSellUnitId)
                    const agreementResult = await this.contractInformationPayload(agreementDetails)
                    purchaser = agreementResult.purchaser
                    delete agreementResult.purchaser
                    agreementResult.key = 'Agreement'
                    agreementResult.no_of_burials = 0
                    agreementResult.properties = await this.getPropertiesForContract(contract.contractNumber, agreementDetails.id)
                    agreements.push(agreementResult)
                }
            }))
            const resultPayload = {
                ...purchaser,
                agreements: agreements
            }
            return resultPayload
        } else {
            const purchaser = await models.Person.findOne({
                attributes: [
                    'firstName',
                    'middleName',
                    'lastName'
                ],
                required: true,
                include: [
                    {
                        model: models.PersonVerificationDetails,
                        as: 'personVerificationDetails',
                        attributes: ['onePortalId'],
                        where: { onePortalId }
                    }]
            })
            return {
                cl_ref: _.get(purchaser, 'personVerificationDetails.onePortalId', ''),
                first_name: _.get(purchaser, 'firstName', ''),
                middle_name: _.get(purchaser, 'middleName', ''),
                last_name: _.get(purchaser, 'lastName', ''),
                agreements: []
            }
        }
    }
    static async reserveProperty (lotSellUnitId, reqBody, transaction) {
        let data = {}; let count = 0
        const user = await models.User.findOne({
            where: {
                email: reqBody.user.email
            }
        })
        let agreementProperty = await models.AgreementProperty.findOne({
            where: {
                deletedAt: null,
                deletedBy: null
            },
            include: [{
                model: models.Property,
                as: 'property',
                where: { lotSellUnitId }
            },
            {
                model: models.Agreement,
                as: 'agreement'
            }]
        })
        if (agreementProperty) {
            const property = _.get(agreementProperty, 'property', '')
            const propController = new PropertyController(agreementProperty.agreementId)
            if (!reqBody.canProceed) {
                const propertyDetail = await propController.getProperty(property.id)
                const otherGardenProperties = await models.AgreementProperty.findAll({
                    where: {
                        agreementId: agreementProperty.agreementId,
                        reservationStatus: 'Confirmed',
                        deletedAt: null
                    },
                    include: [
                        {
                            model: models.Property,
                            as: 'property',
                            where: {
                                propertyGardenId: {
                                    [Op.ne]: propertyDetail.propertyGardenId
                                }
                            }
                        }]
                })
                if (otherGardenProperties && otherGardenProperties.length) {
                    return { confirmation_message: 'As the new property selected has different specifications than earlier selection, some of the items may not be consumable on this property.' }
                }
            }
            if (agreementProperty.reservationStatus === 'reserved') {
                // eslint-disable-next-line no-unused-vars
                const confirmProperty = await propController.confirmProperty(property.id, 'confirmed', user)
            }
            if (agreementProperty.addendumId) {
                data = {
                    addendumId: agreementProperty.addendumId
                }
            }
            for (let right = 0; right < reqBody.noOfRights; right++) {
                const agreementPropertyAdditionalRights = new AgreementPropertyAdditionalRights(agreementProperty.agreementId, agreementProperty.id)
                const additionalRight = await agreementPropertyAdditionalRights.updateAdditionalRights(data, 'add', user)
                if (additionalRight) {
                    count = count + 1
                }
            }
            if (count === reqBody.noOfRights) {
                return `${reqBody.noOfRights} additional right(s) are added successfully`
            } else {
                throw new Error('AGREEMENT_PROPERTY_NOT_RESERVED')
            }
        } else if (!reqBody.noOfRights) {
            let agreement, addendum
            if (reqBody.agreementId) {
                agreement = await models.Agreement.findOne({
                    where: {
                        id: reqBody.agreementId
                    }
                })
            } else {
                agreement = await models.Agreement.findOne({
                    where: {
                        contractNumber: reqBody.contractNumber
                    }
                })
            }
            if (reqBody.contractNumber) {
                addendum = await models.Addendum.findOne({
                    where: {
                        addendumNumber: reqBody.contractNumber
                    }
                })
            }
            const property = await models.Property.findOne({
                where: {
                    lotSellUnitId
                }
            })
            if (!(agreement || addendum) || !property) {
                throw new Error('AGREEMENT_PROPERTY_NOT_RESERVED')
            }
            const addendumController = new AddendumController(_.get(agreement, 'id') || _.get(addendum, 'agreementId'))
            const addendumDetails = await addendumController.getInProgressAddendum(transaction)
            const propController = new PropertyController(_.get(agreement, 'id') || _.get(addendum, 'agreementId'))
            const reserveProperty = await propController.reserveProperty(property.id, user, 'reserved', _.get(addendumDetails, 'id'))
            if (reserveProperty) {
                return 'Property Reserved Successfully'
            }
        } else {
            throw new Error('AGREEMENT_PROPERTY_NOT_RESERVED')
        }
    }
}
module.exports = WebCemPropertyReservationController
