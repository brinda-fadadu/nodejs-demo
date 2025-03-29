const models = require('../../../models')
const moment = require('moment')
const _ = require('lodash')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const funeralServicesIncludes = async () => {
    return [
        {
            model: models.AgreementLocationItem,
            as: 'agreementLocationItem',
            include: agreementItemsSubIncludes()
        },
        {
            model: models.AgreementPackageItem,
            as: 'agreementPackageItem',
            include: [{
                model: models.LocationItem,
                as: 'locationItem',
                attributes: ['itemId'],
                include: [
                    {
                        model: models.Item,
                        attributes: ['id', 'name'],
                        required: true
                    }
                ]
            }, {
                model: models.AgreementPackage,
                as: 'agreementPackage',
                include: [{
                    model: models.Agreement,
                    as: 'agreementDetails',
                    attributes: ['type', 'contractNumber', 'arrangerId'],
                    include: [{
                        model: models.Employee,
                        as: 'arranger'
                    }]
                },
                {
                    model: models.Addendum,
                    as: 'addendumDetails'
                }]
            }]

        },
        {
            model: models.AgreementCashAdvancedItem,
            as: 'agreementCashAdvancedItem',
            include: agreementItemsSubIncludes()

        }
    ]
}

const cemeteryServicesInclude = async () => {
    return [

        {
            model: models.AgreementLocationItem,
            as: 'agreementItems',
            attributes: ['agreementId', 'locationItemId', 'addendumId'],
            include: agreementItemsSubIncludes()
        },
        {
            model: models.AgreementMemorialItem,
            as: 'agreementMemorialItems',
            include: [
                {
                    model: models.AgreementMemorial,
                    as: 'agreementMemorial',
                    include: [
                        {
                            model: models.Agreement,
                            as: 'agreement',
                            attributes: ['type', 'contractNumber', 'arrangerId']
                        }
                    ]
                },
                {
                    model: models.LocationItem,
                    as: 'locationItem',
                    attributes: ['itemId'],
                    include: [
                        {
                            model: models.Item,
                            attributes: ['id', 'name'],
                            required: true
                        }
                    ]
                }
            ]
        },
        {
            model: models.AgreementProperty,
            attributes: ['propertyId', 'updatedAt'],
            as: 'agreementProperties',
            include: [
                {
                    model: models.Property,
                    as: 'property',
                    attributes: ['name']
                },
                {
                    model: models.Agreement,
                    as: 'agreement',
                    attributes: ['type', 'contractNumber']
                }
            ]
        },
        {
            model: models.ScheduledCemeteryService,
            as: 'scheduledCemeteryService',
            attributes: ['id'],
            include: [
                {
                    model: models.IntermentInformationSection,
                    as: 'intermentInformationDetails',
                    attributes: ['beginningTime', 'endingTime']
                },
                {
                    model: models.DisintermentInfoSection,
                    as: 'disintermentInformationDetails',
                    attributes: ['beginningTime', 'endingTime']
                }
            ],
            required: true
        }
    ]
}

const agreementItemsSubIncludes = () => {
    return [{
        model: models.LocationItem,
        as: 'locationItem',
        attributes: ['itemId'],
        include: [
            {
                model: models.Item,
                attributes: ['id', 'name'],
                required: true
            }
        ]
    }, {
        model: models.Agreement,
        as: 'agreementDetails',
        attributes: ['type', 'contractNumber', 'arrangerId']
    }]
}

const calculateAge = (dateOfBirth, dateOfDeath) => {
    const dob = moment(dateOfBirth) || null
    const dod = moment(dateOfDeath) || null
    if (dob && dod) {
        return dod.diff(dob, 'years')
    } else if (dob) {
        return moment().diff(dob, 'years')
    } else if (dod) {
        return '-'
    }
}

const _converCamelCaseToSnakeCase = (object) => {
    const newObj = {}
    Object.keys(object).map(key => {
        newObj[key.replace(/([A-Z])/g, '_$1').toLowerCase()] = object[key]
    })
    return newObj
}

const returnAgreementType = (type) => {
    const AgreementController = require('../agreementController/agreementController')

    const agreementTypes = AgreementController.TYPES
    return Object.keys(agreementTypes).find(key => agreementTypes[key] === type)
}

const returnFormattedAddress = (addressDetails) => {
    return {
        address1: _.get(addressDetails, 'address.line1'),
        address2: _.get(addressDetails, 'address.line2'),
        city: _.get(addressDetails, 'address.city'),
        state: _.get(addressDetails, 'address.state'),
        zip: _.get(addressDetails, 'address.zipcode')
    }
}

const returnFormattedOrgDetails = (orgDetails) => {
    return {
        name: _.get(orgDetails, 'organization.name'),
        type: _.get(orgDetails, 'organization.organizationType.type'),
        phone_number: _.get(orgDetails, 'organization.phoneNumber')
    }
}

const returnAgreementIncludes = (personId) => {
    return [
        {
            model: models.AgreementPerson,
            as: 'beneficiary',
            where: {
                personId: personId
            }
        },
        {
            model: models.Employee,
            as: 'arranger'
        },
        {
            model: models.AgreementProperty,
            as: 'agreementProperties'
        }
    ]
}
const returnPropertyIncludes = () => {
    return [
        {
            model: models.Agreement.scope('withAgreementPersons'),
            as: 'agreement'

        }
    ]
}
const returnItemUsageIncludesForCustom = (attribute) => {
    return [
        {
            model: models.AgreementLocationItem,
            as: 'agreementItems',
            attributes: ['id'],
            include: [
                {
                    model: models.LocationItem,
                    as: 'locationItem',
                    attributes: ['id'],
                    include: [
                        {
                            model: models.Item,
                            attributes: ['id', 'name'],
                            required: true,
                            include: [
                                {
                                    model: models.ItemAttributeValue,
                                    as: 'itemAttributes',
                                    required: true,

                                    include: [
                                        {
                                            model: models.AttributeValue,
                                            include: [
                                                {
                                                    model: models.Attribute,
                                                    as: 'attribute',
                                                    where: attribute ? {
                                                        name: attribute
                                                    } : {}
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]

                }
            ]
        }
    ]
}
const returnLocationItemIncludesForCustom = (attribute) => {
    return [
        {
            model: models.LocationItem,
            as: 'locationItem',
            attributes: ['id'],
            include: [
                {
                    model: models.Item,
                    attributes: ['id', 'name'],
                    required: true,
                    include: [
                        {
                            model: models.ItemAttributeValue,
                            as: 'itemAttributes',
                            required: true,

                            include: [
                                {
                                    model: models.AttributeValue,
                                    include: [
                                        {
                                            model: models.Attribute,
                                            as: 'attribute',
                                            where: attribute ? {
                                                name: attribute
                                            } : {}
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}

const casketIncludes = () => {
    return {
        model: models.CasketSection,
        where: { resourceType: 'AgreementLocationItem' },
        as: 'casketItemDetails',
        include: [
            {
                model: models.AgreementLocationItem,
                as: 'casket',
                attributes: ['id'],
                include: [
                    ...returnLocationItemIncludesForCustom('Casket size')
                ]
            }
        ]
    }
}

const vaultIncludes = (alias) => {
    return {
        model: models.VaultSection,
        as: alias,
        where: { resourceType: 'ItemUsage' },
        required: false,
        include: [
            {
                model: models.ItemUsage,
                attributes: ['id'],
                include: [
                    ...returnItemUsageIncludesForCustom('vault size')
                ]
            }
        ]
    }
}

const urnIncludes = () => {
    return {
        model: models.UrnInformationSection,
        where: { resourceType: 'AgreementLocationItem' },
        as: 'urnInformationItemDetails',
        include: [
            {
                model: models.AgreementLocationItem,
                as: 'urn',
                attributes: ['id'],
                include: [
                    ...returnLocationItemIncludesForCustom()
                ]
            }
        ]
    }
}

const intermentIncludes = (serviceName, agreementLocationItemAlias) => {
    return [
        {
            model: models.AgreementLocationItem,
            as: agreementLocationItemAlias,
            attributes: ['id', 'locationItemId'],
            required: true,
            include: [
                {
                    model: models.LocationItem,
                    as: 'locationItem',
                    attributes: ['id', 'itemId'],
                    required: true,
                    include: [
                        {
                            model: models.Item,
                            attributes: ['id', 'name'],
                            required: true,
                            include: [
                                {
                                    model: models.ItemAttributeValue,
                                    as: 'itemAttributes',
                                    required: true,
                                    include: [
                                        {
                                            model: models.AttributeValue,
                                            where: {
                                                name: serviceName
                                            },
                                            required: true,
                                            include: [
                                                {
                                                    model: models.Attribute,
                                                    as: 'attribute',
                                                    where: {
                                                        name: {
                                                            [Op.in]: ['Scheduling Service', 'Burial Type', 'Casket Size']
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}

const relationshipDetails = (relation, contacts) => {
    let relDetails = contacts.find(contact => contact.relationship === relation)
    return relDetails
}

module.exports = {
    funeralServicesIncludes,
    cemeteryServicesInclude,
    calculateAge,
    _converCamelCaseToSnakeCase,
    returnAgreementType,
    returnFormattedAddress,
    returnFormattedOrgDetails,
    returnAgreementIncludes,
    casketIncludes,
    urnIncludes,
    vaultIncludes,
    intermentIncludes,
    returnPropertyIncludes,
    relationshipDetails
}
