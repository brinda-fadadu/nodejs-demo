const models = require('../../../models')
const logger = require('../../../lib/logger')
const seed = require('../../../config/seed')
const _ = require('lodash')

class DecedentController {
    /**
     *
     * @param {Object<{email: String}>} queryObj
     */
    static async getDecedentList (queryObj) {
        try {
            if (!queryObj.email) {
                throw new Error('INVALID_EMAIL')
            }

            let decedents = await models.FamilyArranger.findAll({
                where: queryObj,
                attributes: ['id', 'firstName', 'lastName', 'email', 'secondaryEmail'],
                include: [{
                    model: models.Person,
                    as: 'decedent',
                    attributes: ['id', 'prefix', 'suffix', 'firstName', 'lastName', 'middleName', 'maidenName', 'aka', 'phoneNumber', 'secondaryPhoneNumber', 'gender', 'email', 'dateOfBirth', 'isAlive'],
                    include: [{
                        model: models.PersonVerificationDetails,
                        as: 'personVerificationDetails',
                        attributes: ['onePortalId']
                    },
                    {
                        model: models.DeathDetails,
                        as: 'deathDetails'
                    }]
                }]
            })

            decedents = _.map(decedents, decedent => ({
                id: _.get(decedent, 'id'),
                decedent: _.get(decedent, 'decedent'),
                familyArranger: {
                    firstName: _.get(decedent, 'firstName'),
                    lastName: _.get(decedent, 'lastName'),
                    email: _.get(decedent, 'email'),
                    secondaryEmail: _.get(decedent, 'secondaryEmail')
                }
            }))
            return decedents
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     *
     * @param {Object<{decedentId: Number}>} queryObj
     */
    static async unlockDecedent (queryObj) {
        const transaction = await models.sequelize.transaction()
        try {
            if (!queryObj.decedentId) {
                throw new Error('INVALID_DECEDENT_ID')
            }
            const familyArranger = await models.FamilyArranger.findOne({
                where: queryObj,
                transaction
            })
            familyArranger.set({ isFaaLocked: false })
            await familyArranger.save({ transaction })

            await transaction.commit()
        } catch (err) {
            await transaction.rollback()
            logger.error(err)
            throw err
        }
    }

    /**
     *
     * @param {Object<{decedentId: Number}>} queryObj
     */
    static async getDecedentInfo (queryObj) {
        try {
            if (!queryObj.id) {
                throw new Error('INVALID_DECEDENT_ID')
            }

            let createObj = await this.createIncludeObject()
            let decedent = await models.Person.findOne({
                where: queryObj,
                include: createObj,
                attributes: [
                    'id',
                    'prefix',
                    'firstName',
                    'lastName',
                    'middleName',
                    'maidenName',
                    'phoneNumber',
                    'secondaryPhoneNumber',
                    'email',
                    'gender',
                    'isVerified',
                    'isAlive',
                    'aka',
                    'suffix',
                    'dateOfBirth'
                ]
            })

            return this.getDecedentInfoFinalObj(decedent)
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    static async getNotifierInfo (personId) {
        let result = await models.PersonContact.findOne({
            where: { personId, deletedAt: null, deletedBy: null },
            include: [
                {
                    model: models.Person,
                    as: 'person',
                    attributes: ['id', 'prefix', 'firstName', 'middleName', 'lastName', 'phoneNumber', 'secondaryPhoneNumber', 'aka', 'email'],
                    include: [
                        {
                            model: models.Place,
                            as: 'addressPlace',
                            include: [
                                {
                                    model: models.Address,
                                    as: 'address',
                                    attributes: ['apartment', 'line1', 'line2', 'city', 'state', 'county', 'country', 'zipcode']
                                },
                                {
                                    model: models.Organization,
                                    as: 'organization',
                                    attributes: ['name', 'phoneNumber']
                                }
                            ]
                        }
                    ]
                },
                {
                    model: models.Relation,
                    as: 'relation'
                },
                {
                    model: models.PersonContactRole,
                    as: 'contactRoles',
                    include: [
                        {
                            model: models.ContactRole,
                            as: 'role',
                            attributes: ['name'],
                            where: {
                                name: 'Notifier'
                            }
                        }
                    ]
                }
            ]
        })
        return result
    }

    static async getParentsInfo (personId, relation) {
        let result = await models.PersonContact.findOne({
            where: { personId, deletedAt: null, deletedBy: null },
            include: [
                {
                    model: models.Person,
                    as: 'person',
                    attributes: ['id', 'prefix', 'firstName', 'middleName', 'lastName', 'maidenName'],
                    include: [
                        {
                            model: models.Place,
                            as: 'birthPlace',
                            include: [
                                {
                                    model: models.Address,
                                    as: 'address',
                                    attributes: ['apartment', 'line1', 'line2', 'city', 'state', 'county', 'country', 'zipcode']
                                }
                            ]
                        }
                    ]
                },
                {
                    model: models.Relation,
                    as: 'relation',
                    where: { name: relation }
                }
            ]
        })
        return result
    }

    static async getNoKInfo (personId) {
        let contactRoles = ['Next of Kin', 'Notifier']
        let result = await models.PersonContact.findAll({
            where: { personId, deletedAt: null, deletedBy: null },
            include: [
                {
                    model: models.Person,
                    as: 'person',
                    attributes: ['id', 'prefix', 'email', 'firstName', 'middleName', 'lastName', 'maidenName', 'phoneNumber', 'secondaryPhoneNumber'],
                    include: [
                        {
                            model: models.Place,
                            as: 'addressPlace',
                            include: [
                                {
                                    model: models.Address,
                                    as: 'address',
                                    attributes: ['apartment', 'line1', 'line2', 'city', 'state', 'county', 'country', 'zipcode']
                                },
                                {
                                    model: models.Organization,
                                    as: 'organization',
                                    attributes: ['name', 'phoneNumber']
                                }
                            ]
                        }
                    ]
                },
                {
                    model: models.Relation,
                    as: 'relation'
                },
                {
                    model: models.PersonContactRole,
                    as: 'contactRoles',
                    include: [
                        {
                            model: models.ContactRole,
                            as: 'role',
                            attributes: ['name'],
                            where: {
                                name: contactRoles
                            }
                        }
                    ],
                    required: true
                }
            ]
        })
        return result
    }

    static async filterNokObj (nokList, notifier) {
        nokList = nokList.map(nok => {
            let newNok = {
                prefix: _.get(nok, 'person.prefix', null),
                firstName: _.get(nok, 'person.firstName', null),
                middleName: _.get(nok, 'person.middleName', null),
                lastName: _.get(nok, 'person.lastName', null),
                phoneNumber: _.get(nok, 'person.phoneNumber', null),
                email: _.get(nok, 'person.email', null),
                secondaryPhoneNumber: _.get(nok, 'person.secondaryPhoneNumber', null),
                relation: _.get(nok, 'relation.name', null),
                address: _.get(nok, 'person.addressPlace.address', {}),
                isNotifier: _.get(nok, 'person.id') === _.get(notifier, 'person.id'),
                onePortalPersonId: _.get(nok, 'person.id')
            }
            return newNok
        })
        return nokList
    }

    static async getDecedentInfoFinalObj (result) {
        let finalObj = {}
        let notifier = await this.getNotifierInfo(result.id)
        let father = await this.getParentsInfo(result.id, 'Father')
        let mother = await this.getParentsInfo(result.id, 'Mother')
        let nok = await this.getNoKInfo(result.id)
        nok = await this.filterNokObj(nok, notifier)

        finalObj = {
            id: result.id,
            onePortalId: _.get(result, 'personVerificationDetails.onePortalId', null),
            isFaaLocked: _.get(result, 'FamilyArranger.isFaaLocked', false),
            isCallerNok: _.get(result, 'SomeOnePassed.isCallerNok', false),
            advisor: _.get(result, 'FamilyArranger.email', null),
            personalInfo: {
                prefix: _.get(result, 'prefix'),
                firstName: _.get(result, 'firstName'),
                middleName: _.get(result, 'middleName'),
                lastName: _.get(result, 'lastName'),
                phoneNumber: _.get(result, 'phoneNumber'),
                secondaryPhoneNumber: _.get(result, 'secondaryPhoneNumber'),
                maidenName: _.get(result, 'maidenName'),
                aka: _.get(result, 'aka'),
                email: _.get(result, 'email'),
                maritalStatus: _.get(result, 'maritalStatus.name'),
                gender: _.get(result, 'gender') ? seed.seed.Gender[_.get(result, 'gender')] : null,
                ssnLastFour: _.get(result, 'personVerificationDetails.ssnLastFour', null),
                isVerified: _.get(result, 'isVerified'),
                isAlive: _.get(result, 'isAlive'),
                suffix: _.get(result, 'suffix'),
                dateOfBirth: _.get(result, 'dateOfBirth'),
                dateOfDeath: _.get(result, 'deathDetails.dateOfDeath'),
                PersonInformation: {
                    birthState: _.get(result, 'birthPlace.address.state', null),
                    birthCountry: _.get(result, 'birthPlace.address.country', null),
                    deceasedStatus: _.get(result, 'PersonInformation.deceasedStatus', null),
                    hospitalDeathStatus: _.get(result, 'deathDetails.deceasedStatus', null)
                }
            },
            residentInfo: {
                noOfYearsStayed: _.get(result, 'personVerificationDetails.yearsAtResidentialAddress', null),
                address: _.get(result, 'addressPlace.address', null)
            },
            ethnicityInfo: _.get(result, 'PersonEthnicity'),
            educationInfo: {
                qualification: _.get(result, 'EducationDetail.qualification.name', null),
                occupation: _.get(result, 'EducationDetail.occupation', null),
                yearsOfOccupation: _.get(result, 'EducationDetail.yearsOfOccupation', null),
                industry: _.get(result, 'EducationDetail.industry', null)
            },
            veteranInfo: {
                serviceBranch: _.get(result, 'Veteran.serviceBranch.name', null),
                serviceEra: _.get(result, 'Veteran.serviceEra', null),
                isUnknown: _.get(result, 'Veteran.isUnknown', null)
            },
            parentsInfo: {
                father: {
                    firstName: _.get(father, 'person.firstName'),
                    middleName: _.get(father, 'person.middleName'),
                    lastName: _.get(father, 'person.lastName'),
                    maidenName: _.get(father, 'person.maidenName'),
                    birthState: _.get(father, 'person.birthPlace.address.state'),
                    birthCountry: _.get(father, 'person.birthPlace.address.country')
                },
                mother: {
                    firstName: _.get(mother, 'person.firstName'),
                    middleName: _.get(mother, 'person.middleName'),
                    lastName: _.get(mother, 'person.lastName'),
                    maidenName: _.get(mother, 'person.maidenName'),
                    birthState: _.get(mother, 'person.birthPlace.address.state'),
                    birthCountry: _.get(mother, 'person.birthPlace.address.country')
                }
            },
            certifierInfo: {
                prefix: _.get(result, 'deathDetails.certifier.certifierPerson.prefix', null),
                firstName: _.get(result, 'deathDetails.certifier.certifierPerson.firstName', null),
                middleName: _.get(result, 'deathDetails.certifier.certifierPerson.middleName', null),
                lastName: _.get(result, 'deathDetails.certifier.certifierPerson.lastName', null),
                licenseNumber: _.get(result, 'deathDetails.certifier.licenseNumber', null),
                faxNumber: _.get(result, 'deathDetails.certifier.faxNumber', null),
                phoneNumber: _.get(result, 'deathDetails.certifier.certifierPerson.phoneNumber', null),
                address: _.get(result, 'deathDetails.certifier.certifierPerson.place.address', null)
            },
            notifierInfo: {
                prefix: _.get(notifier, 'person.prefix'),
                firstName: _.get(notifier, 'person.firstName'),
                middleName: _.get(notifier, 'person.middleName'),
                lastName: _.get(notifier, 'person.lastName'),
                phoneNumber: _.get(notifier, 'person.phoneNumber'),
                secondaryPhoneNumber: _.get(notifier, 'person.secondaryPhoneNumber'),
                relation: _.get(notifier, 'relation.name'),
                address: _.get(notifier, 'person.addressPlace.address', null),
                onePortalPersonId: _.get(notifier, 'person.id')
            },
            nokInfo: nok
        }
        return finalObj
    }

    static async createIncludeObject () {
        return [
            {
                model: models.SomeOnePassed,
                as: 'SomeOnePassed',
                attributes: ['isCallerNok', 'isFaaLocked']
            },
            {
                model: models.FamilyArranger,
                as: 'FamilyArranger'
            },
            {
                model: models.PersonVerificationDetails,
                as: 'personVerificationDetails',
                attributes: ['onePortalId', 'ssnEncrypted', 'ssnLastFour', 'ssnSalt', 'ssn', 'yearsAtResidentialAddress']
            },
            {
                model: models.DeathDetails,
                as: 'deathDetails',
                attributes: ['dateOfDeath', 'deceasedStatus', 'hospitalDeathStatus'],
                include: [
                    {
                        model: models.Place,
                        as: 'deathPlace',
                        include: [
                            {
                                model: models.Address,
                                as: 'address',
                                attributes: ['apartment', 'line1', 'line2', 'city', 'state', 'county', 'country', 'zipcode']
                            },
                            {
                                model: models.Organization,
                                as: 'organization',
                                attributes: ['name', 'phoneNumber']
                            }
                        ]
                    },
                    {
                        model: models.Place,
                        as: 'lor',
                        include: [
                            {
                                model: models.Address,
                                as: 'address',
                                attributes: ['apartment', 'line1', 'line2', 'city', 'state', 'county', 'country', 'zipcode']
                            },
                            {
                                model: models.Organization,
                                as: 'organization',
                                attributes: ['name', 'phoneNumber']
                            }
                        ]
                    },
                    {
                        model: models.Certifier,
                        as: 'certifier',
                        include: [
                            {
                                model: models.Person,
                                as: 'certifierPerson',
                                attributes: ['id', 'prefix', 'firstName', 'middleName', 'lastName', 'phoneNumber', 'secondaryPhoneNumber', 'aka', 'email'],
                                include: [
                                    {
                                        model: models.Place,
                                        as: 'addressPlace',
                                        include: [
                                            {
                                                model: models.Address,
                                                as: 'address',
                                                attributes: ['apartment', 'line1', 'line2', 'city', 'state', 'county', 'country', 'zipcode']
                                            },
                                            {
                                                model: models.Organization,
                                                as: 'organization',
                                                attributes: ['name', 'phoneNumber']
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]

            },
            {
                model: models.MaritalStatus,
                as: 'maritalStatus',
                attributes: ['name']
            },
            {
                model: models.Place,
                as: 'birthPlace',
                include: [
                    {
                        model: models.Address,
                        as: 'address',
                        attributes: ['apartment', 'line1', 'line2', 'city', 'state', 'county', 'country', 'zipcode']
                    }
                ]
            },
            {
                model: models.Place,
                as: 'addressPlace',
                include: [
                    {
                        model: models.Address,
                        as: 'address',
                        attributes: ['apartment', 'line1', 'line2', 'city', 'state', 'county', 'country', 'zipcode']
                    },
                    {
                        model: models.Organization,
                        as: 'organization',
                        attributes: ['name', 'phoneNumber']
                    }
                ]
            },
            {
                model: models.EducationDetails,
                as: 'EducationDetail',
                include: [
                    {
                        model: models.Qualification,
                        as: 'qualification',
                        attributes: ['name']
                    }
                ],
                attributes: ['occupation', 'industry', 'yearsOfOccupation']
            },
            {
                model: models.PersonEthnicity,
                as: 'PersonEthnicity',
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
            },
            {
                model: models.Veteran,
                // as: 'Veteran',
                include: [
                    {
                        model: models.ServiceBranch,
                        as: 'serviceBranch'
                    }
                ]
            }
        ]
    }

    static async getDecedentDetails (onePortalId) {
        try {
            let decedentDetails = await models.PersonVerificationDetails.findOne({
                where: { onePortalId },
                attributes: ['id', 'personId', 'onePortalId', 'createdAt'],
                include: [{
                    model: models.Person,
                    as: 'person',
                    attributes: ['id', 'prefix', 'suffix', 'firstName', 'lastName', 'middleName', 'maidenName', 'aka', 'phoneNumber', 'secondaryPhoneNumber', 'gender', 'email', 'dateOfBirth', 'isAlive'],
                    include: [{
                        model: models.DeathDetails,
                        as: 'deathDetails',
                        attributes: ['id', 'dateOfDeath']
                    }]
                }]
            })
            return decedentDetails
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
}

module.exports = DecedentController
