const models = require('../../models')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const _ = require('lodash')

exports.getDecedant = async (queryObj) => {
    try {
        let decedent = await models.Person.scope('withFullSSN').findOne({
            where: queryObj,
            include: [
                {
                    model: models.PersonInfo,
                    as: 'PersonInformation',
                    include: createIncludeObject(),
                    attributes: [
                        'personId',
                        'birthState',
                        'birthCountry',
                        'deceasedStatus',
                        'noOfYearsStayed',
                        'occupation',
                        'yearsOfOccupation',
                        'industry',
                        'hospitalDeathStatus',
                        'maidenName'
                    ]
                }
            ],
            attributes: [
                'id',
                'prefix',
                'onePortalId',
                'firstName',
                'lastName',
                'middleName',
                'phoneNumber',
                'secondaryPhoneNumber',
                'email',
                'maritalStatus',
                'gender',
                'ssnEncrypted',
                'ssnLastFour',
                'ssnSalt',
                'ssn',
                'isVerified',
                'isAlive',
                'aka',
                'suffix',
                'dateOfBirth',
                'dateOfDeath'
            ]
        })
        return getFinalObj(decedent)
    } catch (err) {
        throw err
    }
}

async function getNotifierInfo (personId) {
    let result = await models.ContactPerson.findOne({
        where: { PersonId: personId, DeletedAt: null, DeletedBy: null },
        include: [
            {
                model: models.Person,
                as: 'PersonalInformation',
                attributes: [
                    'id', 'onePortalId', 'prefix', 'firstName', 'middleName', 'lastName', 'phoneNumber', 'secondaryPhoneNumber', 'organizationId', 'aka', 'email'
                ],
                include: [
                    {
                        model: models.PersonInfo,
                        as: 'PersonInformation',
                        attributes: ['id', 'personId', 'residentialAddressId'],
                        include: [{
                            model: models.Address,
                            as: 'PersonAddress',
                            attributes: ['id', 'line1', 'line2', 'apt', 'addressTypeId', 'city', 'state', 'county', 'country', 'zipcode']
                        }]
                    },
                    {
                        model: models.Organization,
                        as: 'PersonOrganization',
                        attributes: ['id', 'name', 'phoneNumber'],
                        include: [
                            {
                                model: models.Address,
                                as: 'Address',
                                attributes: ['id', 'line1', 'line2', 'apt', 'addressTypeId', 'city', 'state', 'county', 'country', 'zipcode']
                            },
                            {
                                model: models.OrganizationType
                            }
                        ]
                    }
                ]
            },
            {
                model: models.Relation
            },
            {
                model: models.ContactCaseRole,
                as: 'caseRoles',
                include: [
                    {
                        model: models.Role,
                        attributes: ['name'],
                        where: {
                            [Op.and]: [
                                {
                                    name: 'Notifier'
                                },
                                {
                                    type: 'Contact'
                                }
                            ]
                        }
                    }
                ],
                required: false
            }
        ]
    })
    return result
}

async function getNoKInfo (personId) {
    let result = await models.ContactPerson.findAll({
        where: { PersonId: personId, DeletedAt: null, DeletedBy: null },
        include: [
            {
                model: models.Person,
                as: 'PersonalInformation',
                attributes: [
                    'id', 'onePortalId', 'prefix', 'firstName', 'middleName', 'lastName', 'phoneNumber', 'secondaryPhoneNumber', 'organizationId', 'aka', 'email'
                ],
                include: [
                    {
                        model: models.PersonInfo,
                        as: 'PersonInformation',
                        attributes: ['id', 'personId', 'residentialAddressId'],
                        include: [{
                            model: models.Address,
                            as: 'PersonAddress',
                            attributes: ['id', 'line1', 'line2', 'apt', 'addressTypeId', 'city', 'state', 'county', 'country', 'zipcode']
                        }]
                    },
                    {
                        model: models.Organization,
                        as: 'PersonOrganization',
                        attributes: ['id', 'name', 'phoneNumber'],
                        include: [
                            {
                                model: models.Address,
                                as: 'Address',
                                attributes: ['id', 'line1', 'line2', 'apt', 'addressTypeId', 'city', 'state', 'county', 'country', 'zipcode']
                            },
                            {
                                model: models.OrganizationType
                            }
                        ]
                    }
                ]
            },
            {
                model: models.Relation
            },
            {
                model: models.ContactCaseRole,
                as: 'caseRoles',
                include: [
                    {
                        model: models.Role,
                        attributes: ['name'],
                        where: {
                            [Op.and]: [
                                {
                                    name: 'Next of Kin'
                                },
                                {
                                    type: 'Contact'
                                }
                            ]
                        }
                    }
                ],
                required: false
            }
        ]
    })
    return result
}

async function getParentsInfo (personId, relation) {
    let result = await models.ContactPerson.findOne({
        where: { PersonId: personId, DeletedAt: null, DeletedBy: null },
        include: [
            {
                model: models.Person,
                as: 'PersonalInformation',
                attributes: [
                    'id', 'prefix', 'firstName', 'middleName', 'lastName'
                ],
                include: [
                    {
                        model: models.PersonInfo,
                        as: 'PersonInformation',
                        attributes: ['birthState', 'birthCountry', 'maidenName']
                    }
                ]
            },
            {
                model: models.Relation,
                where: {
                    name: relation
                }
            }
        ]
    })
    return result
}

async function filterNokObj (nokList, notifier) {
    nokList = nokList.map(nok => {
        let newNok = {
            prefix: _.get(nok, 'PersonalInformation.prefix', null),
            firstName: _.get(nok, 'PersonalInformation.firstName', null),
            middleName: _.get(nok, 'PersonalInformation.middleName', null),
            lastName: _.get(nok, 'PersonalInformation.lastName', null),
            phoneNumber: _.get(nok, 'PersonalInformation.phoneNumber', null),
            secondaryPhoneNumber: _.get(nok, 'PersonalInformation.secondaryPhoneNumber', null),
            relation: _.get(nok, 'Relation.name', null),
            address: _.get(nok, 'PersonalInformation.PersonInformation.PersonAddress', {}),
            isNotifier: _.get(nok, 'PersonalInformation.PersonInformation.personId') === _.get(notifier, 'PersonalInformation.PersonInformation.personId')
        }
        return newNok
    })
    return nokList
}

async function getFinalObj (result) {
    let finalObj = {}
    let notifier = await getNotifierInfo(result.PersonInformation.personId)
    let father = await getParentsInfo(result.PersonInformation.personId, 'Father')
    let mother = await getParentsInfo(result.PersonInformation.personId, 'Mother')
    let nok = await getNoKInfo(result.PersonInformation.personId)
    nok = await filterNokObj(nok, notifier)

    finalObj = {
        id: result.id,
        onePortalId: _.get(result, 'onePortalId'),
        personalInfo: {
            prefix: _.get(result, 'prefix'),
            firstName: _.get(result, 'firstName'),
            middleName: _.get(result, 'middleName'),
            lastName: _.get(result, 'lastName'),
            phoneNumber: _.get(result, 'phoneNumber'),
            secondaryPhoneNumber: _.get(result, 'secondaryPhoneNumber'),
            maidenName: _.get(result, 'PersonInformation.maidenName'),
            aka: _.get(result, 'aka'),
            email: _.get(result, 'email'),
            maritalStatus: _.get(result, 'maritalStatus'),
            gender: _.get(result, 'gender'),
            ssn: {
                ssnLastFour: _.get(result, 'ssnLastFour'),
                ssnSalt: _.get(result, 'ssnSalt'),
                ssnEncrypted: _.get(result, 'ssnEncrypted')
            },
            isVerified: _.get(result, 'isVerified'),
            isAlive: _.get(result, 'isAlive'),
            suffix: _.get(result, 'suffix'),
            dateOfBirth: _.get(result, 'dateOfBirth'),
            dateOfDeath: _.get(result, 'dateOfDeath'),
            PersonInformation: {
                birthState: _.get(result, 'PersonInformation.birthState'),
                birthCountry: _.get(result, 'PersonInformation.birthCountry'),
                deceasedStatus: _.get(result, 'PersonInformation.deceasedStatus'),
                hospitalDeathStatus: _.get(result, 'PersonInformation.hospitalDeathStatus')
            }
        },
        residentInfo: {
            noOfYearsStayed: _.get(result, 'PersonInformation.noOfYearsStayed'),
            address: _.get(result, 'PersonInformation.PersonAddress')
        },
        ethnicityInfo: _.get(result, 'PersonInformation.EthnicityInformation'),
        educationInfo: {
            qualification: _.get(result, 'PersonInformation.Education'),
            occupation: _.get(result, 'PersonInformation.occupation'),
            yearsOfOccupation: _.get(result, 'PersonInformation.yearsOfOccupation'),
            industry: _.get(result, 'PersonInformation.industry')
        },
        veteranInfo: {
            veteran: _.get(result, 'PersonInformation.Veteran')
        },
        parentsInfo: {
            father: {
                firstName: _.get(father, 'PersonalInformation.firstName'),
                middleName: _.get(father, 'PersonalInformation.middleName'),
                lastName: _.get(father, 'PersonalInformation.lastName'),
                maidenName: _.get(father, 'PersonalInformation.maidenName'),
                birthCountry: _.get(father, 'PersonalInformation.PersonInformation.birthCountry'),
                birthState: _.get(father, 'PersonalInformation.PersonInformation.birthState')
            },
            mother: {
                firstName: _.get(mother, 'PersonalInformation.firstName'),
                middleName: _.get(mother, 'PersonalInformation.middleName'),
                lastName: _.get(mother, 'PersonalInformation.lastName'),
                maidenName: _.get(mother, 'PersonalInformation.maidenName'),
                birthCountry: _.get(mother, 'PersonalInformation.PersonInformation.birthCountry'),
                birthState: _.get(mother, 'PersonalInformation.PersonInformation.birthState')
            }
        },
        deathInfo: {
            locationOfDeath: {
                address: _.get(result, 'PersonInformation.PlaceOfDeathAddress'),
                facility: _.get(result, 'PersonInformation.PlaceOfDeathOrganization')
            },
            locationOfRemains: {
                address: _.get(result, 'PersonInformation.LocationOfRemainAddress'),
                facility: _.get(result, 'PersonInformation.LocationOfRemainsOrganization')
            }
        },
        certifierInfo: _.get(result, 'PersonInformation.CertifierInfo'),
        notifierInfo: {
            prefix: _.get(notifier, 'PersonalInformation.prefix'),
            firstName: _.get(notifier, 'PersonalInformation.firstName'),
            middleName: _.get(notifier, 'PersonalInformation.middleName'),
            lastName: _.get(notifier, 'PersonalInformation.lastName'),
            phoneNumber: _.get(notifier, 'PersonalInformation.phoneNumber'),
            secondaryPhoneNumber: _.get(notifier, 'PersonalInformation.secondaryPhoneNumber'),
            relation: _.get(notifier, 'Relation.name'),
            address: _.get(notifier, 'PersonalInformation.PersonInformation.PersonAddress')
        },
        nokInfo: nok
    }
    return finalObj
}

function createIncludeObject () {
    let includeObj = [
        {
            model: models.Qualification,
            as: 'Education'
        }, {
            model: models.Organization,
            as: 'PlaceOfBirthOrganization',
            include: createOrganizationInclude(),
            attributes: ['id', 'name', 'phoneNumber']
        }, {
            model: models.Address,
            as: 'PersonAddress'
        }, {
            model: models.Address,
            as: 'PlaceOfDeathAddress'
        }, {
            model: models.Organization,
            as: 'PlaceOfDeathOrganization',
            include: createOrganizationInclude(),
            attributes: ['id', 'name', 'phoneNumber']
        }, {
            model: models.Address,
            as: 'LocationOfRemainAddress'
        }, {
            model: models.Organization,
            as: 'LocationOfRemainsOrganization',
            include: createOrganizationInclude(),
            attributes: ['id', 'name', 'phoneNumber']
        }, {
            model: models.PersonEthnicity,
            as: 'EthnicityInformation',
            include: [
                {
                    model: models.Race,
                    as: 'RaceOne'
                },
                {
                    model: models.Race,
                    as: 'RaceTwo'
                },
                {
                    model: models.Race,
                    as: 'RaceThree'
                },
                {
                    model: models.Ethnicity,
                    as: 'Hispanic'
                },
                {
                    model: models.Ethnicity,
                    as: 'EthnicityOne'
                },
                {
                    model: models.Ethnicity,
                    as: 'EthnicityTwo'
                },
                {
                    model: models.Ethnicity,
                    as: 'EthnicityThree'
                }
            ]
        }, {
            model: models.Veteran,
            include: [
                {
                    model: models.ServiceBranch
                }
            ]
        }, {
            model: models.Certifier,
            as: 'CertifierInfo',
            include: [
                {
                    model: models.Address
                }
            ]
        }, {
            model: models.Certifier,
            as: 'CertifierInfo',
            include: [
                {
                    model: models.Address
                }
            ]
        }
    ]
    return includeObj
}

function createOrganizationInclude () {
    let includeObj = [
        {
            model: models.Address,
            as: 'Address',
            attributes: ['id', 'line1', 'line2', 'apt', 'addressTypeId', 'city', 'state', 'county', 'country', 'zipcode']
        },
        {
            model: models.OrganizationType
        }
    ]
    return includeObj
}
