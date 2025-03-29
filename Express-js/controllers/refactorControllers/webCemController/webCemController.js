const models = require('../../../models')
const logger = require('../../../lib/logger')
const _ = require('lodash')
const seedValues = require('../../../config/seed').seed
const UserController = require('../userController')
const { getRelations, commonDownloadFileWithSignature } = require('../utils')
const {
    funeralServicesIncludes,
    cemeteryServicesInclude,
    calculateAge,
    returnFormattedAddress,
    _converCamelCaseToSnakeCase,
    returnAgreementType,
    returnAgreementIncludes,
    vaultIncludes,
    intermentIncludes
} = require('./helpers')
const { docuSignClient } = require('../../../services').docusign
// const WholeSaleCremationController = require('../miscSalesController/wholeSalesController')
// const { orderBy } = require('lodash')
class WebCemController {
    static async fetchDecedentDetails (onePortalId) {
        try {
            let result = {}
            const personVerificationDetails = await models.PersonVerificationDetails.findOne(
                {
                    where: {
                        onePortalId: onePortalId
                    },
                    attributes: ['personId'],
                    include: [
                        {
                            model: models.Person,
                            as: 'person',
                            attributes: ['isAlive'],
                            where: {
                                isAlive: false
                            }
                        }
                    ]
                }
            )
            if (!personVerificationDetails) {
                throw new Error('PERSON_NOT_FOUND')
            }
            const personId = personVerificationDetails.personId
            result.contacts = await this._fetchContactsDetails(personId)
            result.personal = await this._fetchPersonalDetails(personId)
            result.genealogy = await this._fetchGenealogyDetails(personId)
            result.military = await this._fetchMilitaryDetails(personId)
            result.obituary = await this._fetchObituaryDetails(personId)
            result.agreements = await this._fetchAgreementsOfPerson(personId)
            result.services = await this._fetchServives(personId)
            result.burial_items = await this._fetchCustomDetails(personId)
            result.interment = await this._fetchLocalIntermentDetails(personId)
            result.interment_if_not_local = await this._fetchNonLocalIntermentDetails(
                personId
            )
            result.cremation = await this._fetchCremationDetails(personId)
            delete result.cremation.cremation_number
            return result
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    static async _getUserId (email) {
        try {
            const user = await models.User.findOne({
                where: {
                    email: email
                }
            })
            return user.id
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    static async _updateBirthPlace (personId, birthPlace, transaction) {
        try {
            const birthPlaceId = await models.Person.findOne({
                where: {
                    id: personId
                },
                transaction,
                include: [
                    {
                        model: models.Place,
                        as: 'birthPlace',
                        include: [{
                            model: models.Address,
                            as: 'address',
                            attributes: ['id']
                        }]
                    }
                ]
            })
            if (birthPlaceId.birthPlace) {
                await models.Address.update(birthPlace, {
                    where: {
                        id: birthPlaceId.birthPlace.address.id
                    },
                    transaction
                })
            } else {
                const updatedAddress = await models.Address.create(birthPlace, { transaction })
                if (updatedAddress.id) {
                    const addressId = updatedAddress.id
                    const updatedPlace = await models.Place.create({ addressId }, { transaction })
                    if (updatedPlace.id) {
                        await models.Person.update({ birthPlaceId: updatedPlace.id, updatedAt: new Date() }, {
                            where: {
                                id: personId
                            },
                            transaction
                        })
                    }
                }
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    static async _updateAddress (personId, place, transaction) {
        try {
            const addressPlaceId = await models.Person.findOne({
                where: {
                    id: personId
                },
                transaction,
                attributes: ['addressPlaceId'],
                include: [
                    {
                        model: models.Place,
                        as: 'addressPlace',
                        include: [{
                            model: models.Address,
                            as: 'address',
                            attributes: ['id']
                        }]
                    }
                ]
            })
            if (addressPlaceId.addressPlace) {
                await models.Address.update(place, {
                    where: {
                        id: addressPlaceId.addressPlace.address.id
                    },
                    transaction
                })
            } else {
                const updatedAddress = await models.Address.create(place, { transaction })
                if (updatedAddress.id) {
                    const addressId = updatedAddress.id
                    const updatedPlace = await models.Place.create({ addressId }, { transaction })
                    if (updatedPlace.id) {
                        await models.Person.update({ addressPlaceId: updatedPlace.id, updatedAt: new Date() }, {
                            where: {
                                id: personId
                            },
                            transaction
                        })
                    }
                }
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    static async updateDecedent (onePortalId, body) {
        const transaction = await models.sequelize.transaction()
        try {
            let result = {}
            const personVerificationDetails = await models.PersonVerificationDetails.findOne(
                {
                    where: {
                        onePortalId: onePortalId
                    },
                    attributes: ['personId'],
                    include: [
                        {
                            model: models.Person,
                            as: 'person',
                            attributes: ['isAlive'],
                            where: {
                                isAlive: false
                            }
                        }
                    ]
                }
            )
            if (!personVerificationDetails) {
                throw new Error('PERSON_NOT_FOUND')
            }
            const personId = personVerificationDetails.personId
            const relations = await getRelations('map')
            if (_.get(body, 'personal.nee')) {
                result.mother = await models.PersonContact.findOne({
                    where: {
                        relationId: [
                            relations['Mother']
                        ],
                        personId: personId,
                        resourceType: 'Person'
                    },
                    attributes: ['resourceId', 'relationId'],
                    include: [
                        {
                            model: models.Person,
                            as: 'person',
                            attributes: ['id']
                        }
                    ]
                })
                if (_.get(result, 'mother.person.id')) {
                    result.updatedNee = await models.Person.update({ maidenName: body.nee }, {
                        where: {
                            id: result.mother.person.id
                        },
                        transaction
                    })
                }
            }
            if (body.personal) {
                result.updatedPersonalDetails = await models.Person.update(body.personal, {
                    where: {
                        id: personId
                    },
                    transaction
                })
            }
            if (body.deathDetails) {
                result.updatedDeathDetails = await models.DeathDetails.update(body.deathDetails, {
                    where: {
                        personId: personId
                    },
                    transaction
                })
            }
            if (body.serviceDate) {
                const resourceCemetry = await models.ScheduledCemeteryService.findAll({
                    where: {
                        personId: personId
                    },
                    include: [{
                        model: models.WorkOrder,
                        as: 'workOrder',
                        attributes: ['resourceId', 'completedOn']
                    }]
                })
                const resourceFuneral = await models.ScheduledFuneralService.findAll({
                    where: {
                        personId: personId
                    },
                    include: [{
                        model: models.WorkOrder,
                        as: 'workOrder',
                        attributes: ['resourceId', 'completedOn']
                    }]
                })
                const resource = resourceCemetry.concat(resourceFuneral)
                const completedOn = _.sortBy(resource, function (dateObj) {
                    return new Date(dateObj.completedOn)
                })
                result.updatedServiceDate = await models.WorkOrder.update(body.serviceDate, {
                    where: {
                        statusId: 3,
                        resourceId: completedOn[0].workOrder.resourceId
                    },
                    transaction
                })
            }
            if (body.birthPlace) {
                await this._updateBirthPlace(personId, body.birthPlace, transaction)
            }
            if (body.place) {
                await this._updateAddress(personId, body.place, transaction)
            }
            await transaction.commit()
            return result
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    static async updateOwner (onePortalId, body) {
        const transaction = await models.sequelize.transaction()
        try {
            let result = {}
            const personVerificationDetails = await models.PersonVerificationDetails.findOne(
                {
                    where: {
                        onePortalId: onePortalId
                    },
                    attributes: ['personId'],
                    include: [
                        {
                            model: models.Person,
                            as: 'person'
                        }
                    ]
                }
            )
            if (!personVerificationDetails) {
                throw new Error('PERSON_NOT_FOUND')
            }
            const personId = personVerificationDetails.personId
            if (body.personal) {
                result.updatedPersonalDetails = await models.Person.update(body.personal, {
                    where: {
                        id: personId
                    },
                    transaction
                })
            }
            if (body.birthPlace) {
                if (body.birthPlace) {
                    await this._updateBirthPlace(personId, body.birthPlace, transaction)
                }
            }
            if (body.address) {
                await this._updateAddress(personId, body.address, transaction)
            }
            if (body.ethnicity) {
                result.updatedEthnicity = await models.PersonEthnicity.update(body.ethnicity, {
                    where: {
                        personId: personId
                    },
                    transaction
                })
            }
            await transaction.commit()
            return result
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    static async _fetchPersonalDetails (personId, alive = false) {
        const personDetails = await models.Person.scope(
            'notDeleted',
            'withPlace',
            'withDeathDetails',
            'withBirthPlace'
        ).findOne({
            where: {
                id: personId,
                isAlive: alive
            },
            attributes: [
                'aka',
                'suffix',
                'prefix',
                'firstName',
                'middleName',
                'maidenName',
                'lastName',
                'gender',
                'pictureUrl',
                'dateOfBirth'
            ],
            raw: true,
            nest: true
        })
        const geneologyData = await this._fetchGenealogyDetails(personId)
        personDetails['nee'] = !_.isEmpty(geneologyData) && geneologyData.mother ? geneologyData.mother.nee : ''
        personDetails['title'] = personDetails['prefix']
        personDetails['firstName'] = _.trim(personDetails['firstName'])
        personDetails['lastName'] = _.trim(personDetails['lastName'])
        personDetails['middleName'] = _.trim(personDetails['middleName'])
        delete personDetails.maidenName
        delete personDetails.prefix
        let city = personDetails.birthPlace.address.city ? `${personDetails.birthPlace.address.city}, ` : ''
        let state = personDetails.birthPlace.address.state ? personDetails.birthPlace.address.state : ''
        let birthPlace = `${city}${state}`
        city = personDetails.deathDetails.deathPlace.address.city ? `${personDetails.deathDetails.deathPlace.address.city}, ` : ''
        state = personDetails.deathDetails.deathPlace.address.state ? personDetails.deathDetails.deathPlace.address.state : ''
        let deathPlace = `${city}${state}`
        const serviceDate = await this._getServiceDate(personId)
        const burialStatus = await this._getBurialStatusDetails(personId)
        const cremationPlace = await this._fetchCremationDetails(personId)
        const property = burialStatus === 'Cremated' ? { cremation_place: cremationPlace.crematory } : { property: await this._fetchProperty(personId) }
        const primaryDetails = {
            ...personDetails,
            church: '',
            yahrzeit_month: '',
            yahrzeit_day: '',
            dateOfDeath: _.get(personDetails, 'deathDetails.dateOfDeath'),
            gender: seedValues.Gender[_.get(personDetails, 'gender')],
            placeOfDeath: deathPlace,
            birthPlace: birthPlace,
            address: {
                ...returnFormattedAddress(_.get(personDetails, 'addressPlace'))
            },
            age: calculateAge(
                _.get(personDetails, 'dateOfBirth'),
                _.get(personDetails, 'deathDetails.dateOfDeath')
            ),
            dateOfService: serviceDate,
            cause_of_death: '',
            race: await this._getRaceDetails(personId),
            burialStatus: burialStatus,
            cremation_number: cremationPlace.cremation_number,
            ...property
        }
        delete primaryDetails.addressPlace
        delete primaryDetails.deathDetails
        return _converCamelCaseToSnakeCase(primaryDetails)
    }

    static async _fetchContactsDetails (personId) {
        const VerifiedPersonController = require('../personController/verifiedPersonController')
        const verifiedPerson = new VerifiedPersonController(personId)
        const contacts = await verifiedPerson.getListOfContacts({
            contactType: [1, 2, 3]
        })
        return contacts.map(contact => {
            return {
                name: _.get(contact, 'name', ''),
                phone_number: _.get(contact, 'phoneNumber', ''),
                email: _.get(contact, 'email', ''),
                relationship: _.get(contact, 'relation.name', '')
            }
        })
    }
    static async _fetchGenealogyDetails (personId) {
        const relations = await getRelations('map')
        const contacts = await models.PersonContact.findAll({
            where: {
                relationId: [
                    relations['Mother'],
                    relations['Father'],
                    relations['Spouse']
                ],
                personId: personId,
                resourceType: 'Person'
            },
            attributes: ['resourceId', 'relationId'],
            include: [
                {
                    model: models.Person,
                    as: 'person',
                    attributes: ['firstName', 'middleName', 'lastName', 'maidenName']
                }
            ],
            raw: true,
            nest: true
        })
        if (contacts.length) {
            let genealogyData = {}
            contacts.forEach(async contact => {
                const relation = Object.keys(relations).find(
                    key => relations[key] === contact.relationId
                )
                const data = await _converCamelCaseToSnakeCase(contact.person)
                data['nee'] = data['maiden_name']
                delete data.maiden_name
                genealogyData[relation.toLowerCase()] = {
                    ...data
                }
            })
            genealogyData.comments = ''
            return genealogyData
        }
        return {}
    }

    static async _fetchMilitaryDetails (personId) {
        const VerifiedPersonController = require('../personController/verifiedPersonController')
        const verifiedPerson = new VerifiedPersonController(personId)
        const details = await verifiedPerson.getVeteranDetails()
        return {
            service_era: _.get(details, 'serviceEra', ''),
            service_branch: _.get(details, 'serviceBranch.name', '')
        }
    }

    static async _fetchObituaryDetails (personId) {
        const obituaryData = await models.Obituary.findAll({
            where: {
                personId: personId
            },
            attributes: ['obituary', 'updatedAt']
        })
        const sortedArr = _.orderBy(
            obituaryData,
            'updatedAt',
            'desc'
        )
        return _.get(sortedArr, '[0].obituary', '')
    }

    static async _fetchAgreementsOfPerson (personId) {
        const AgreementController = require('../agreementController/agreementController')
        const types = [
            AgreementController.TYPES['Cemetry'],
            AgreementController.TYPES['Funeral']
        ]
        const needTypes = AgreementController.NEED_TYPES
        const agreements = await models.Agreement.findAll({
            where: {
                type: types
            },
            attributes: ['id', 'type', 'needType', 'contractNumber', 'arrangerId', 'totalPurchasePrice', 'due', 'createdAt', 'status'],
            include: returnAgreementIncludes(personId)
        })
        const addendums = await models.Addendum.findAll({
            include: [
                {
                    model: models.Agreement,
                    where: {
                        type: types
                    },
                    attributes: ['id', 'type', 'needType', 'contractNumber', 'arrangerId', 'totalPurchasePrice', 'due', 'createdAt', 'status'],
                    include: returnAgreementIncludes(personId)
                }]
        })
        let result = []
        if (agreements && agreements.length) {
            await Promise.all(agreements.map(async agreement => {
                let obj = {
                    agreement_number: _.get(agreement, 'contractNumber', ''),
                    agreement:
            AgreementController.TYPES['Funeral'] === _.get(agreement, 'type')
                ? 'Funeral'
                : 'Cemetery',
                    agreement_type:
            needTypes['AN'] === _.get(agreement, 'needType')
                ? 'At-Need'
                : 'Pre_Need'
                }
                const agreementForm = await models.CaseInfoForm.findOne({
                    where: {
                        agreementId: agreement.id
                    },
                    attributes: ['envelopeId']
                })
                if (agreementForm && agreementForm.envelopeId) {
                    obj.documents = [
                        await docuSignClient.generatePreviewUrl(agreementForm.envelopeId)
                    ]
                }
                result.push(obj)
            }))
        }
        if (addendums && addendums.length) {
            await Promise.all(addendums.map(async addendum => {
                let obj = {
                    agreement_number: _.get(addendum, 'addendumNumber', ''),
                    agreement:
            AgreementController.TYPES['Funeral'] === _.get(addendum.Agreement, 'type')
                ? 'Funeral'
                : 'Cemetery',
                    agreement_type:
            needTypes['AN'] === _.get(addendum.Agreement, 'needType')
                ? 'At-Need'
                : 'Pre_Need'
                }
                const agreementForm = await models.CaseInfoForm.findOne({
                    where: {
                        addendumId: addendum.id
                    },
                    attributes: ['envelopeId']
                })
                if (agreementForm && agreementForm.envelopeId) {
                    obj.documents = [
                        await docuSignClient.generatePreviewUrl(agreementForm.envelopeId)
                    ]
                }
                result.push(obj)
            })
            )
        }
        return result
    }

    static async _fetchCemetryServices (personId) {
        const cemetryIncludes = await cemeteryServicesInclude()
        const cemeteryServices = await models.ItemUsage.findAll({
            where: {
                personId
            },
            attributes: ['resourceId', 'resourceType'],
            include: [...cemetryIncludes]
        })
        let services = []
        if (cemeteryServices && cemeteryServices.length) {
            services = await Promise.all(
                cemeteryServices.map(async service => {
                    const beginningTime =
          _.get(
              service,
              'scheduledCemeteryService.intermentInformationDetails.beginningTime', ''
          ) ||
          _.get(
              service,
              'scheduledCemeteryService.disintermentInformationDetails.beginningTime', ''
          )
                    const endingTime =
          _.get(
              service,
              'scheduledCemeteryService.intermentInformationDetails.endingTime', ''
          ) ||
          _.get(
              service,
              'scheduledCemeteryService.disintermentInformationDetails.endingTime', ''
          )
                    const obj = {
                        start_time: beginningTime,
                        end_time: endingTime
                    }
                    const type = service.agreementItems ? service.agreementItems.addendumId ? '(Addendum)' : '' : ''
                    if (service.resourceType === 'AgreementLocationItem') {
                        if (service.agreementItems) {
                            obj.service = _.get(service, 'agreementItems.locationItem.Item.name')
                            obj.agreement_type = await returnAgreementType(
                                _.get(service, 'agreementItems.agreementDetails.type')
                            ) + type
                        }
                    } else if (service.resourceType === 'AgreementProperty') {
                        obj.service = _.get(service, 'agreementProperties.property.name')
                        obj.agreement_type = await returnAgreementType(
                            _.get(service, 'agreementProperties.agreement.type')
                        ) + type
                    } else if (service.resourceType === 'AgreementMemorialItem') {
                        obj.service = _.get(
                            service,
                            'agreementMemorialItems.agreementMemorial.name'
                        )
                        obj.agreement_type = await returnAgreementType(
                            _.get(
                                service,
                                'agreementMemorialItems.agreementMemorial.agreement.type'
                            )
                        ) + type
                    }
                    return obj
                })
            )
        }
        return services
    }

    static async _fetchFuneralServices (personId) {
        const funeralIncludes = await funeralServicesIncludes()
        const funeralServices = await models.ScheduledFuneralService.findAll({
            where: {
                personId
            },
            include: [
                ...funeralIncludes,
                {
                    model: models.SchedulingSection,
                    as: 'schedulingDetails'
                }
            ]
        })
        let services = []
        if (funeralServices && funeralServices.length) {
            services = await Promise.all(
                funeralServices.map(async service => {
                    const type = service.agreementLocationItem ? service.agreementLocationItem.addendumId ? '(Addendum)' : '' : ''
                    return {
                        service: await this._fetchDetailsForFuneralServices(
                            service,
                            'serviceName'
                        ),
                        agreement_type: await this._fetchDetailsForFuneralServices(
                            service,
                            'agreementType'
                        ) + type,
                        start_time: _.get(service, 'schedulingDetails.beginningTime'),
                        end_time: _.get(service, 'schedulingDetails.endingTime')
                    }
                })
            )
        }
        return services
    }

    static async _fetchServives (personId) {
        const cemeteryServices = await this._fetchCemetryServices(personId)
        const funeralServices = await this._fetchFuneralServices(personId)
        return funeralServices.concat(cemeteryServices)
    }

    static _fetchDetailsForFuneralServices (service, field) {
        let resourceType

        if (_.get(service, 'agreementLocationItemId')) {
            resourceType = 'agreementLocationItem'
        } else if (_.get(service, 'agreementPackageItemId')) {
            resourceType = 'agreementPackageItem'
        } else if (_.get(service, 'agreementCashAdvancedItemId')) {
            resourceType = 'agreementCashAdvancedItem'
        }
        switch (field) {
        case 'serviceName':
            return _.get(service, `${resourceType}.locationItem.Item.name`)

        case 'agreementType':
            let type
            if (resourceType === 'agreementPackageItem') {
                type = _.get(
                    service,
                    `${resourceType}.agreementPackage.agreementDetails.type`
                )
            } else {
                type = _.get(service, `${resourceType}.agreementDetails.type`)
            }
            return returnAgreementType(type)
        default:
            break
        }
    }

    static async _getRaceDetails (personId) {
        const VerifiedPersonController = require('../personController/verifiedPersonController')
        const verifiedPerson = new VerifiedPersonController(personId)
        const ethnicityDetails = await verifiedPerson.getEthnicityDetails()
        let race = ''
        if (_.get(ethnicityDetails, 'isHispanic')) {
            race = 'Hispanic'
        }
        return race
    }
    static async _getBurialStatusDetails (personId) {
        const AgreementController = require('../agreementController/agreementController')
        const funeralStatements = await models.Agreement.count({
            include: returnAgreementIncludes(personId),
            where: {
                type: AgreementController.TYPES['Funeral']
            }
        })
        const cemeteryContracts = await models.Agreement.findAndCountAll({
            include: returnAgreementIncludes(personId),
            where: {
                type: AgreementController.TYPES['Cemetry']
            }
        })
        if (funeralStatements > 0 && cemeteryContracts.count === 0) {
            return 'Not Buried'
        } else if (cemeteryContracts && cemeteryContracts.count > 0) {
            const includesArr = await intermentIncludes([
                'Cemetery Graveside Service',
                'Cemetery Cremation Service',
                'Cemetery Witness Cremation Services',
                'Cemetery Disinterment Service'
            ], 'agreementItems')
            const services = await models.ScheduledCemeteryService.findAll({
                where: {
                    personId
                },
                include: [
                    {
                        model: models.ItemUsage,
                        as: 'itemUsage',
                        where: {
                            resourceType: 'AgreementLocationItem'
                        },
                        include: [
                            ...includesArr
                        ],
                        required: true
                    },
                    {
                        model: models.WorkOrder,
                        as: 'workOrder',
                        include: [
                            {
                                model: models.WorkOrderStatus,
                                as: 'status',
                                where: {
                                    name: 'closed'
                                }
                            }
                        ],
                        required: true
                    }
                ],
                order: [['updatedAt', 'DESC']]

            })
            if (services.length) {
                const attribute = _.get(services, '[0].itemUsage.agreementItems.locationItem.Item.itemAttributes')
                const attributeName = _.get(attribute, '[0].AttributeValue.name')
                if (attributeName === 'Cemetery Cremation Service' || attributeName === 'Cemetery Witness Cremation Services') {
                    return 'Cremated'
                }
                if (attributeName === 'Cemetery Graveside Service') {
                    let status = 'Buried'
                    const disintermentService = await this._getDisintermentService(personId)
                    if (disintermentService) {
                        if (disintermentService.workOrder < services[0].workOrder.completedOn && disintermentService.disintermentService && disintermentService.disintermentService.intermentInformationDetails && !disintermentService.disintermentService.intermentInformationDetails.temporaryBurialLocation) {
                            status = 'Reinterred'
                        }
                    }
                    return status
                }
                if (attributeName === 'Cemetery Disinterment Service') {
                    return 'Disinterred'
                }
                const gravesideService = _.find(services, service => {
                    const serviceAttribute = _.get(service, '[0].itemUsage.agreementItems.locationItem.Item.itemAttributes')
                    return _.get(serviceAttribute, '[0].AttributeValue.name') === 'Cemetery Graveside Service'
                })
                const disintermentService = _.find(services, service => {
                    const serviceAttribute = _.get(service, '[0].itemUsage.agreementItems.locationItem.Item.itemAttributes')
                    return _.get(serviceAttribute, '[0].AttributeValue.name') === 'Cemetery Disinterment Service'
                })
                if (gravesideService && disintermentService) {
                    if (_.get(gravesideService, 'workOrder.updatedAt') > _.get(disintermentService, 'workOrder.updatedAt')) {
                        return 'Reinterred'
                    }
                }
            } else {
                const properties = cemeteryContracts.rows.filter(contract => _.get(contract, 'agreementProperties.reservationStatus') === 'confirmed')
                if (properties.length) {
                    return 'Location is reserved for deceased'
                }
            }
        }
        return 'Pending Burial'
    }
    static async _getDisintermentService (personId) {
        const SchedulingController = require('../schedulingController/schedulingController')
        let schedulingCtrl = new SchedulingController()
        let schedulindData = await SchedulingController.getSchedulableServices(personId)
        let disintermentServicesWO = []
        if (schedulindData && schedulindData.length) {
            schedulindData.map(e => {
                if (e.workOrderStatus === 'closed' && e.schedulingAttribute === 'Cemetery Disinterment Service') {
                    disintermentServicesWO.push(e)
                }
            })
        }
        if (disintermentServicesWO && disintermentServicesWO.length) {
            let [latestService] = disintermentServicesWO.sort((a, b) => new Date(b.scheduledCemeteryService.workOrder.completedOn).getTime() - new Date(a.scheduledCemeteryService.workOrder.completedOn).getTime())
            let disintermentService = await schedulingCtrl.getScheduledCemeteryServiceDetails(personId, latestService.scheduledCemeteryService.id)
            return {
                disintermentService,
                workOrder: latestService.scheduledCemeteryService.workOrder.completedOn }
        }
    }
    static async _getServiceDate (personId) {
        const cemeteryServices = await models.ScheduledCemeteryService.scope('disintermentInfoSectionScope').findAll({
            attributes: ['id'],
            where: {
                personId
            },
            include: [
                {
                    model: models.IntermentInformationSection,
                    as: 'intermentInformationDetails',
                    attributes: ['beginningTime', 'endingTime']
                },
                {
                    model: models.WorkOrder,
                    as: 'workOrder',
                    include: [
                        {
                            model: models.WorkOrderStatus,
                            as: 'status',
                            where: {
                                name: 'closed'
                            }
                        }
                    ]
                }
            ],
            required: true
        })
        const funeralIncludes = await funeralServicesIncludes()
        const funeralServices = await models.ScheduledFuneralService.scope('workOrderClosedStatusScope').findAll({
            where: {
                personId
            },
            include: [
                ...funeralIncludes,
                {
                    model: models.SchedulingSection,
                    as: 'schedulingDetails'
                }
            ]
        })
        const workOrders = []
        let personWorkOrders = []
        personWorkOrders.push(funeralServices)
        personWorkOrders.push(cemeteryServices)
        personWorkOrders = _.flatten(personWorkOrders)
        if (personWorkOrders && personWorkOrders.length) {
            personWorkOrders.map(record => {
                if (record.workOrder) {
                    workOrders.push(record)
                }
            })
        }
        if (workOrders.length > 0) {
            const sortedArr = _.orderBy(
                workOrders,
                'workOrder.completedOn',
                'desc'
            )
            const serviceDate = sortedArr[0].workOrder.completedOn
            return serviceDate
        } else {
            return ''
        }
    }

    static async _fetchCustomDetails (personId) {
        let burialItems = {
            interment_contract: null,
            casket: null,
            urn: null,
            vault: null,
            custom5: ''
        }
        const SchedulingController = require('../schedulingController/schedulingController')
        let schedulingCtrl = new SchedulingController()
        let schedulingData = await SchedulingController.getSchedulableServices(personId)
        let graveSideServices = schedulingData.map(e => {
            if (e.workOrderStatus === 'closed' && (e.schedulingAttribute === 'Funeral Graveside Service' || e.schedulingAttribute === 'Cemetery Graveside Service')) {
                let data = {
                    contractNumber: e.addendumNumber ? e.addendumNumber : e.contractNumber,
                    type: e.agreementType
                }
                switch (e.schedulingAttribute) {
                case 'Funeral Graveside Service':
                    data.date = e.scheduledFuneralService.updatedAt
                    data.scheduledId = e.scheduledFuneralService.id
                    break
                case 'Cemetery Graveside Service':
                    data.date = e.scheduledCemeteryService.updatedAt
                    data.scheduledId = e.scheduledCemeteryService.id
                    break
                }
                return data
            }
        })
        graveSideServices = _.compact(graveSideServices)
        if (graveSideServices && graveSideServices.length) {
            let [latestService] = graveSideServices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            if (latestService) {
                let data
                switch (latestService.type) {
                case 'Funeral':
                    data = await schedulingCtrl.getScheduledFuneralServiceDetails(personId, latestService.scheduledId)
                    break
                case 'Cemetery':
                    data = await schedulingCtrl.getScheduledCemeteryServiceDetails(personId, latestService.scheduledId)
                    break
                }
                burialItems.interment_contract = `${latestService.contractNumber}(${latestService.type})`
                burialItems.casket = _.get(data, 'casketDetails.casket.casketName', null)
                burialItems.urn = _.get(data, 'urnInformationDetails.urn.urnName', null)
                burialItems.vault = _.get(data, 'vaultDetails.vault.vaultName', null)
            }
        }
        return burialItems
    }

    static async _fetchNonLocalIntermentDetails (personId) {
        const includesArr = await intermentIncludes(
            'Funeral Graveside Service',
            'agreementLocationItem'
        )
        const funeralGarvesideService = await models.ScheduledFuneralService.scope('cemeteryInformationScopeAddress').findAll(
            {
                where: {
                    personId
                },
                include: [
                    ...includesArr,
                    {
                        model: models.WorkOrder,
                        as: 'workOrder',
                        required: true,
                        include: [
                            {
                                model: models.WorkOrderStatus,
                                as: 'status',
                                where: {
                                    name: 'closed'
                                }
                            }
                        ]
                    }
                ],
                order: [['updatedAt', 'DESC']]
            }
        )
        let details = {}
        if (funeralGarvesideService && funeralGarvesideService.length && funeralGarvesideService[0].workOrder && funeralGarvesideService[0].workOrder.resourceType !== 'ScheduledCemeteryService') {
            if (_.get(funeralGarvesideService, '[0].agreementLocationItemId')) {
                if (funeralGarvesideService[0].cemeteryInformationDetails.clCemeteryLocation) {
                    details = _.get(funeralGarvesideService, '[0].cemeteryInformationDetails.clCemeteryLocation', '')
                } else if (funeralGarvesideService[0].cemeteryInformationDetails.cemeteryLocation) {
                    details = _.get(funeralGarvesideService, '[0].cemeteryInformationDetails.cemeteryLocation', '')
                }
            }
        }
        return {
            name: _.get(
                details,
                'organization.name',
                _.get(details, 'name', '')
            ),
            phone: _.get(
                details,
                'organization.phoneNumber',
                _.get(details, 'phoneNumber', '')
            ),
            city: _.get(
                details,
                'address.city',
                _.get(details, 'place.address.city', '')
            ),
            state: _.get(
                details,
                'address.state',
                _.get(details, 'place.address.state', '')
            ),
            address: _.get(details, 'address')
                ? (
                    _.get(details, 'address.line1') +
                ' ' +
                _.get(details, 'address.line2')

                )
                : (
                    _.get(details, 'place')
                        ? (
                            _.get(details, 'place.address.line1') +
                        ' ' +
                        _.get(details, 'place.address.line2')
                        ) : (
                            ''
                        )
                ),
            zip: _.get(
                details,
                'address.zipcode',
                _.get(details, 'place.address.zipcode', '')
            )
        }
    }

    static async _fetchLocalIntermentDetails (personId) {
        const WorkOrderController = require('../workOrderController/workOrderController')
        const includesArr = await intermentIncludes(
            'Cemetery Graveside Service',
            'agreementItems'
        )
        const vaultDetailsIncludes = await vaultIncludes('vaultItemUsageDetails')
        const noteCategory = await models.NoteCategory.findOne({
            where: { name: 'Work Order' }
        })
        const scopes = [
            'intermentInformationSectionScope',
            'FuneralArrangementSectionScope',
            'disintermentInfoSectionScope'
        ]
        scopes.push({ method: ['closedWorkOrderScope', _.get(noteCategory, 'id')] })

        const details = await models.ScheduledCemeteryService.scope(scopes).findAll({
            where: {
                personId
            },
            include: [
                vaultDetailsIncludes,
                {
                    model: models.ItemUsage,
                    as: 'itemUsage',
                    where: { resourceType: 'AgreementLocationItem', usageStatus: 2 },
                    attributes: ['id', 'resourceId'],
                    include: [...includesArr]
                }
            ],
            order: [['updatedAt', 'DESC']]
        })
        let propertyDetails = []
        let garden = []
        let lotSpaceIds = []
        if (details && details.length) {
            details.map(item => {
                if (item.itemUsage.agreementItems.locationItem.Item.itemAttributes) {
                    const agreement = item.itemUsage.agreementItems.locationItem.Item.itemAttributes
                    if (agreement && agreement.length) {
                        agreement.map(detail => {
                            if (detail.AttributeValue) {
                                if (detail.AttributeValue.name === 'Cemetery Graveside Service') {
                                    propertyDetails.push(details)
                                }
                            }
                        })
                    }
                }
            })
        }
        propertyDetails = _.flatten(propertyDetails)
        let lotSellUnitIds = []
        let popertyDataFromHmis = []
        if (propertyDetails && propertyDetails.length) {
            if (propertyDetails[0].intermentInformationDetails.temporaryBurialLocationId) {
                const workOrderController = new WorkOrderController()
                const temporaryBurialLocation = await workOrderController.getTempPropertyDataFromHMIS(propertyDetails[0].intermentInformationDetails.temporaryBurialLocationId)
                lotSpaceIds.push(temporaryBurialLocation.Lot_Space_ID)
                lotSellUnitIds.push(temporaryBurialLocation.Lot_Sell_Unit_ID)
                garden.push(temporaryBurialLocation.Section_Cd)
            } else {
                const properties = _.get(
                    propertyDetails,
                    '[0].intermentInformationDetails.properties'
                )
                if (properties && properties.length) {
                    lotSellUnitIds = properties.map(property => property.itemUsage.agreementProperties.property.lotSellUnitId)
                    lotSpaceIds = properties.map(property => _.get(property, 'itemUsage.lotSpaceId', ''))
                    garden = properties.map(property => property.itemUsage.agreementProperties.property.propertyGardens.name)
                }
            }
            lotSpaceIds = _.compact(lotSpaceIds)
            if (lotSellUnitIds.length > 0 && lotSpaceIds.length > 0) {
                popertyDataFromHmis = await models.Property.getDataFromHmis(lotSellUnitIds, lotSpaceIds)
            } else {
                return {}
            }
            garden = _.uniq(garden).join(', ')
            let notes = ''
            if (_.get(propertyDetails, '[0].workOrder')) {
                if (propertyDetails[0].workOrder.notes.length > 0) {
                    const sortedNotes = _.orderBy(
                        propertyDetails[0].workOrder.notes,
                        'updatedAt',
                        'desc'
                    )
                    notes = sortedNotes[0].content
                }
            }
            // eslint-disable-next-line camelcase
            const { lot_section_panel, row_tier_division, niche_grave_crypt, lot_depth, lot_space } = await this._returnPropertyData(popertyDataFromHmis)
            const burialTypeAttribute = _.get(propertyDetails, '[0].itemUsage.agreementItems.locationItem.Item.itemAttributes', []).find(e => _.get(e, 'AttributeValue.attribute.name', '') === 'Burial Type')
            return {
                garden: garden,
                lot_section_panel: lot_section_panel.trim(),
                row_tier_division: row_tier_division.trim(),
                niche_crypt_grave: niche_grave_crypt.trim(),
                division: '',
                lot_space: lot_space,
                lot_depth: lot_depth,
                comments: notes,
                burial_type: _.get(burialTypeAttribute, 'AttributeValue.name', ''),
                level: '',
                vault: _.get(propertyDetails, '[0].vaultItemUsageDetails.ItemUsage.agreementItems.locationItem.Item.name', ''),
                vault_size: _.get(
                    propertyDetails,
                    '[0].vaultItemUsageDetails.ItemUsage.agreementItems.locationItem.Item.itemAttributes.AttributeValue.name', ''
                ),
                funeral_home: _.get(
                    propertyDetails,
                    '[0].funeralArrangementDetails.serviceLocation.organization.name',
                    _.get(propertyDetails, '[0].funeralArrangementDetails.clFacilityLocation.name', '')
                )
            }
        } else {
            return {}
        }
    }
    static async _fetchProperty (personId) {
        const cemetryIncludes = await cemeteryServicesInclude()
        const cemeteryServices = await models.ItemUsage.findAll({
            where: {
                personId,
                usageStatus: 2
            },
            attributes: ['resourceId', 'resourceType'],
            include: [...cemetryIncludes]
        })
        const sortedArr = _.orderBy(
            cemeteryServices,
            'agreementProperties.updatedAt',
            'desc'
        )
        return _.get(sortedArr, '[0].agreementProperties.property.name', '')
    }
    static async _fetchCremationDetails (personId) {
        const funeralIncludesArr = await intermentIncludes([
            'Funeral Cremation Service',
            'Funeral Witness Cremation Service'],
        'agreementLocationItem'
        )
        const cemeteryIncludesArr = await intermentIncludes([
            'Cemetery Cremation Service',
            'Cemetery Witness Cremation Services'],
        'agreementItems'
        )
        const noteCategory = await models.NoteCategory.findOne({
            where: { name: 'Work Order' }
        })
        const scopes = ['resourceSectionScope', 'cemeteryInformationScope', 'schedulingSectionScope']
        scopes.push({ method: ['workOrderScopeWeb', _.get(noteCategory, 'id')] })
        const funeralCremationServices = await models.ScheduledFuneralService.scope(scopes).findAll(
            {
                where: {
                    personId
                },
                includes: [
                    ...funeralIncludesArr
                ],
                order: [['updatedAt', 'DESC']]
            }
        )
        const cemeteryCremationServices = await models.ScheduledCemeteryService.scope(
            'intermentInformationSectionScope',
            'FuneralArrangementSectionScope',
            'disintermentInfoSectionScope',
            'genericSectionScope'
        ).findAll(
            {
                where: {
                    personId
                },
                include: [
                    {
                        model: models.ItemUsage,
                        as: 'itemUsage',
                        include: [
                            ...cemeteryIncludesArr

                        ]
                    },
                    {
                        model: models.WorkOrder,
                        as: 'workOrder',
                        required: true,
                        include: [
                            {
                                model: models.WorkOrderStatus,
                                as: 'status',
                                where: {
                                    name: 'closed'
                                },
                                required: true
                            },
                            {
                                model: models.Note,
                                as: 'notes',
                                where: {
                                    categoryId: _.get(noteCategory, 'id'),
                                    resourceType: 'WorkOrder'
                                },
                                required: false
                            },
                            {
                                model: models.WorkOrderDetail,
                                as: 'workOrderDetail',
                                include: [
                                    {
                                        model: models.Chapel,
                                        as: 'cremationPlace',
                                        include: [
                                            {
                                                model: models.Location,
                                                as: 'location',
                                                include: [
                                                    {
                                                        model: models.Place,
                                                        as: 'place',
                                                        include: [
                                                            {
                                                                model: models.Organization,
                                                                as: 'organization'
                                                            },
                                                            {
                                                                model: models.Address,
                                                                as: 'address'
                                                            }
                                                        ]
                                                    }
                                                ]
                                            },
                                            {
                                                model: models.Place,
                                                as: 'place',
                                                include: [
                                                    {
                                                        model: models.Organization,
                                                        as: 'organization'
                                                    },
                                                    {
                                                        model: models.Address,
                                                        as: 'address'
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }

                        ]
                    }
                ],
                order: [['updatedAt', 'DESC']]
            }
        )
        const funeralServices = []
        if (funeralCremationServices && funeralCremationServices.length) {
            funeralCremationServices.map(funeral => {
                if (funeral.workOrder != null && funeral.agreementLocationItemId) {
                    funeralServices.push(funeral)
                }
            })
        }
        let personWorkOrders = []
        personWorkOrders.push(funeralServices)
        if (cemeteryCremationServices && cemeteryCremationServices.length) {
            cemeteryCremationServices.map(cemetery => {
                if (cemetery.itemUsage) {
                    if (cemetery.itemUsage.agreementItems) {
                        personWorkOrders.push(cemetery)
                    }
                }
            })
        }
        personWorkOrders = _.flatten(personWorkOrders)
        const sortedArr = _.orderBy(
            personWorkOrders,
            'workOrder.updatedAt',
            'desc'
        )
        let notes = ''
        if (sortedArr.length && _.get(sortedArr, '[0].workOrder')) {
            if (sortedArr[0].workOrder.notes.length > 0) {
                const sortedNotes = _.orderBy(
                    sortedArr[0].workOrder.notes,
                    'updatedAt',
                    'desc'
                )
                notes = sortedNotes[0].content
            }
        }
        return {
            // No need to send cremation_number
            cremation_date: _.get(
                sortedArr,
                '[0].workOrder.completedOn',
                _.get(
                    sortedArr,
                    '[0].disintermentInformationDetails.endingTime',
                    _.get(sortedArr, '[0].intermentInformationDetails.endingTime', '')
                )
            ),
            crematory: _.get(sortedArr, '[0].resourcesDetails.crematory.name', _.get(sortedArr, '[0].schedulingDetails.reservedChapel.name', _.get(sortedArr, '[0].workOrder.workOrderDetail.cremationPlace.name', ''))),
            address: {
                'state': _.get(sortedArr, '[0].workOrder.workOrderDetail.cremationPlace.location.place.address.state', _.get(sortedArr, '[0].workOrder.workOrderDetail.cremationPlace.place.address.state', '')),
                'city': _.get(sortedArr, '[0].workOrder.workOrderDetail.cremationPlace.location.place.address.city', _.get(sortedArr, '[0].workOrder.workOrderDetail.cremationPlace.place.address.city', '')),
                'address2': _.get(sortedArr, '[0].workOrder.workOrderDetail.cremationPlace.location.place.address.line2', _.get(sortedArr, '[0].workOrder.workOrderDetail.cremationPlace.place.address.line2', '')),
                'address1': _.get(sortedArr, '[0].workOrder.workOrderDetail.cremationPlace.location.place.address.line1', _.get(sortedArr, '[0].workOrder.workOrderDetail.cremationPlace.place.address.line1', '')),
                'zipcode': _.get(sortedArr, '[0].workOrder.workOrderDetail.cremationPlace.location.place.address.zipcode', _.get(sortedArr, '[0].workOrder.workOrderDetail.cremationPlace.place.address.zipcode', ''))
            },
            witnessing_date: _.get(
                sortedArr,
                '[0].genericDetails.isWitnessedCremation'
            )
                ? _.get(sortedArr, '[0].workOrder.completedOn', '')
                : '',
            cremation_number: _.get(sortedArr, '[0].workOrder.workOrderDetail.cremationId', ''),
            pump_pacemaker: '',
            oversize: '',
            container: '',
            remain_status: '',
            date_of_status: '',
            comments: notes
        }
    }
    static async returnUserData (userId) {
        const userController = new UserController('', userId)
        const user = await userController.getUserDetails()
        const userObj = {
            user: {
                name: user.name,
                email: user.email,
                userRole: user.UserPermissions.name
            }
        }
        return userObj
    }

    static async _returnPropertyData (data) {
        const keyNames = [
            'niche_grave_crypt',
            'row_tier_division',
            'lot_section_panel',
            'lot_depth',
            'lot_space'
        ]
        const returnObj = {}
        keyNames.forEach(key => {
            const keyData = data.map(value => {
                const a = value[key]
                if (typeof a === 'string') {
                    return a.trim().length ? a.trim() : '--'
                }
                return a
            })
            returnObj[key] = keyData.join(', ')
        })
        return returnObj
    }
    static async returnDecedentSavePayload (personId, userId, isAlive = false) {
        try {
            const person = await models.Person.scope('withVerificationDetails').findOne({
                where: {
                    id: personId,
                    isVerified: true,
                    isAlive: isAlive,
                    deletedAt: null,
                    deletedBy: null
                },
                include: [
                    {
                        model: models.File,
                        as: 'personPictureUrl',
                        where: { resourceName: 'Person' },
                        required: false
                    }]
            })
            if (!person) {
                throw new Error('PERSON_NOT_FOUND')
            }
            let pictureUrl = ''
            if (person) {
                let result = person.toJSON()
                let singedPictureUrl
                if ((result.personPictureUrl && result.personPictureUrl.originalFileName) || result.pictureUrl) {
                    singedPictureUrl = await commonDownloadFileWithSignature(result.personPictureUrl, result.pictureUrl)
                    pictureUrl = singedPictureUrl
                }
            }

            let genealogyData = await this._fetchGenealogyDetails(personId)
            let obj = {}
            if (genealogyData) {
                obj = await this._returnGenealogyDataObj(genealogyData)
            }
            const personalDetails = await this._fetchPersonalDetails(personId, isAlive)
            const militaryDetails = await this._fetchMilitaryDetails(personId)
            const user = await this.returnUserData(userId)
            const data = {
                cl_ref: _.get(person, 'personVerificationDetails.onePortalId'),
                ...personalDetails,
                ...personalDetails.address,
                ...militaryDetails,
                ...obj,
                ...user
            }
            delete data.address
            data.grave = ''
            data.level = ''
            data.grave_type = ''
            data.pictureUrl = pictureUrl
            return data
        } catch (error) {
            logger.error(error)
            return {
                error: 'Some error has occured',
                error_message: error
            }
        }
    }

    static _returnGenealogyDataObj (data) {
        return {
            spouse_first_name: data.spouse ? data.spouse.first_name : '',
            spouse_middle_name: data.spouse ? data.spouse.middle_name : '',
            spouse_last_name: data.spouse ? data.spouse.last_name : '',
            mother_first_name: data.mother ? data.mother.first_name : '',
            mother_middle_name: data.mother ? data.mother.middle_name : '',
            mother_last_name: data.mother ? data.mother.last_name : '',
            father_first_name: data.father ? data.father.first_name : '',
            father_middle_name: data.father ? data.father.middle_name : '',
            father_last_name: data.father ? data.father.last_name : ''
        }
    }
    static async fetchPersonContacts (onePortalId) {
        try {
            const personVerificationDetails = await models.PersonVerificationDetails.findOne(
                {
                    where: {
                        onePortalId: onePortalId
                    },
                    attributes: ['personId'],
                    include: [
                        {
                            model: models.Person,
                            as: 'person',
                            attributes: ['isAlive']
                        }
                    ]
                }
            )
            if (!personVerificationDetails) {
                throw new Error('PERSON_NOT_FOUND')
            }
            const contacts = this._fetchContactsDetails(personVerificationDetails.personId)
            return contacts
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
    static async contractCommonIncludes (lotSellUnitId, whereConditions) {
        const contractDetails = await models.AgreementProperty.findAll({
            attributes: ['id', 'agreementId', 'propertyId', 'updatedAt', 'addendumId', 'reservationStatus'],
            where: whereConditions,
            include: [
                {
                    model: models.Property,
                    as: 'property',
                    where: {
                        lotSellUnitId: lotSellUnitId
                    },
                    attributes: ['id', 'name', 'lotSellUnitId']
                }
            ]
        })
        return contractDetails
    }
    static async getContractInformation (lotSellUnitId) {
        let result = []
        let whereConditions = {
            reservationStatus: 'confirmed',
            deletedAt: null,
            deletedBy: null
        }
        const contractDetails = await this.contractCommonIncludes(lotSellUnitId, whereConditions)
        let documents
        await Promise.all(contractDetails.map(async contract => {
            if (contract.addendumId) {
                const addendum = await models.Addendum.findOne({
                    where: { id: contract.addendumId },
                    include: [
                        {
                            model: models.HMISAddendumDataSync,
                            as: 'hmisAddendumSyncDetails',
                            where: {
                                statusId: 3
                            }
                        }
                    ]
                })
                if (addendum) {
                    const agreementForm = await models.CaseInfoForm.findOne({
                        where: {
                            addendumId: contract.addendumId
                        },
                        attributes: ['envelopeId']
                    })
                    if (agreementForm && agreementForm.envelopeId) {
                        documents = await docuSignClient.generatePreviewUrl(agreementForm.envelopeId)
                    }
                    let contractObjResult = {
                        contract_number: addendum.addendumNumber,
                        contract_document_url: documents || ''
                    }
                    result.push(contractObjResult)
                }
            } else if (contract.agreementId) {
                const agreement = await models.Agreement.findOne({
                    where: {
                        id: contract.agreementId
                    },
                    attributes: ['id', 'type', 'contractNumber'],
                    include: [
                        {
                            model: models.HMISDataSync,
                            as: 'hmisSyncDetails',
                            where: {
                                statusId: 3
                            }
                        }
                    ]
                })
                if (agreement) {
                    const agreementForm = await models.CaseInfoForm.findOne({
                        where: {
                            agreementId: agreement.id
                        },
                        attributes: ['envelopeId']
                    })
                    if (agreementForm && agreementForm.envelopeId) {
                        documents = await docuSignClient.generatePreviewUrl(agreementForm.envelopeId)
                    }
                    let contractObjResult = {
                        contract_number: agreement.contractNumber,
                        contract_document_url: documents || ''
                    }
                    result.push(contractObjResult)
                }
            }
        })
        )
        return result
    }
}

module.exports = WebCemController
