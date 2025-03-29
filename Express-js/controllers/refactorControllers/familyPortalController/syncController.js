const models = require('../../../models')
const logger = require('../../../lib/logger')
const _ = require('lodash')
const { seed } = require('../../../config/seed')
const { formatAddress } = require('../../../utils/addressValidation')
const CallFaa = require('../../../routes/familyPortal/callFaa')

class SyncController {
    /**
     *
     * @param {Object<{decedentId: Number, userId: Number, decedent: Object}>} queryObj
     */
    static async pullFromFAA (queryObj, transaction, setLock) {
        try {
            if (!queryObj.decedentId) {
                throw new Error('INVALID_DECEDENT_ID')
            }
            if (!queryObj.userId) {
                throw new Error('INVALID_USER_ID')
            }
            if (!queryObj.decedent) {
                throw new Error('INVALID_DATA')
            }

            const {
                decedentId,
                userId,
                decedent
            } = queryObj

            const person = await models.Person.findOne({
                where: {
                    id: decedentId
                },
                transaction
            })

            const familyArranger = await models.FamilyArranger.findOne({
                where: {
                    decedentId
                },
                transaction
            })

            if (!person.isVerified) {
                throw new Error('CALL_NOT_VERIFIED')
            }

            const personId = person.id

            const personVerificationDetails = await models.PersonVerificationDetails.findOne({
                where: {
                    personId
                },
                transaction
            })

            const personEthnicity = await models.PersonEthnicity.findOne({
                where: {
                    personId
                },
                transaction
            })

            const personEducation = await models.EducationDetails.findOne({
                where: {
                    personId
                },
                transaction
            })

            const veteran = await models.Veteran.findOne({
                where: {
                    personId
                },
                transaction
            })

            const deathDetails = await models.DeathDetails.findOne({
                where: {
                    personId
                },
                transaction
            })

            let maritalStatusId = null
            if (_.get(decedent, 'primaryInfo.maritalStatus')) {
                const maritalStatus = await models.MaritalStatus.findOne({
                    where: {
                        Name: _.get(decedent, 'primaryInfo.maritalStatus')
                    },
                    transaction
                })
                maritalStatusId = maritalStatus.id
            }

            let addressPlaceId = person.addressPlaceId
            if (_.get(decedent, 'residentInfo.address')) {
                addressPlaceId = await this.updatePlace(_.get(decedent, 'residentInfo.address'), addressPlaceId, transaction)
                console.log('Resident Address Details Updated')
            }

            let birthPlaceId = person.birthPlaceId
            if (_.get(decedent, 'primaryInfo.locationOfBirth')) {
                const address = {
                    state: _.get(decedent, 'primaryInfo.locationOfBirth.birthState'),
                    country: _.get(decedent, 'primaryInfo.locationOfBirth.birthCountry')
                }
                birthPlaceId = await this.updatePlace(address, birthPlaceId, transaction)
                console.log('Birth Address Details Updated')
            }

            if (_.get(decedent, 'ethnicityInfo')) {
                const ethnicityId = personEthnicity ? personEthnicity.id : null
                await this.updateEthnicityDetails(_.get(decedent, 'ethnicityInfo'), ethnicityId, personId, transaction)
                console.log('Ethnicity Details Updated')
            }

            if (_.get(decedent, 'educationInfo.qualification')) {
                const educationId = personEducation ? personEducation.id : null
                await this.updateEducationDetails(_.get(decedent, 'educationInfo'), educationId, personId, transaction)
                console.log('Education Details Updated')
            }

            const veteranId = veteran ? veteran.id : null
            await this.updateVeteranDetails(_.get(decedent, 'veteranInfo'), veteranId, personId, transaction)
            console.log('Veteran Details Updated')

            if (_.get(decedent, 'parentsInfo.father')) {
                let updatedParent = await this.filterUpdateObject(_.get(decedent, 'parentsInfo.father'))
                await this.updateParent(updatedParent, 'Father', personId, userId, transaction)
                console.log('Father Details Updated')
            }

            if (_.get(decedent, 'parentsInfo.mother')) {
                let updatedParent = await this.filterUpdateObject(_.get(decedent, 'parentsInfo.mother'))
                await this.updateParent(updatedParent, 'Mother', personId, userId, transaction)
                console.log('Mother Details Updated')
            }

            if (_.get(decedent, 'certifierInfo.licenseNumber')) {
                const certifierId = deathDetails.certifierId
                let updatedCertifier = await this.filterUpdateObject(_.get(decedent, 'certifierInfo'))
                await this.updateCertifierDetails(updatedCertifier, certifierId, deathDetails, transaction)
                console.log('Certifier Details Updated')
            }
            if (_.get(decedent, 'notifierInfo')) {
                let updatedNotifier = await this.filterUpdateObject(_.get(decedent, 'notifierInfo'))
                await this.updateNotifierDetails(updatedNotifier, personId, userId, transaction)
                console.log('Notifier Details Updated')
            }

            for (const nok of decedent.nokInfo) {
                let updatedNOK = await this.filterUpdateObject(nok)
                // create or update nok
                const resourceId = await this.updateNOKDetails(updatedNOK, personId, nok.onePortalPersonId, userId, transaction)
                // notify FAA to update personId in NOK
                if (!nok.onePortalPersonId) {
                    nok.onePortalPersonId = resourceId
                    const data = await CallFaa.updateNOK(decedent.decedentId, nok)
                    if (!data) {
                        throw new Error('NOK_UPDATE_ERROR')
                    }
                }
            }
            console.log('NOK Details Updated')

            // update person
            let newPerson = {
                prefix: _.get(decedent, 'primaryInfo.prefix'),
                suffix: _.get(decedent, 'primaryInfo.suffix'),
                aka: _.get(decedent, 'primaryInfo.aka'),
                firstName: _.get(decedent, 'primaryInfo.firstName'),
                middleName: _.get(decedent, 'primaryInfo.middleName'),
                lastName: _.get(decedent, 'primaryInfo.lastName'),
                phoneNumber: _.get(decedent, 'primaryInfo.phoneNumber'),
                secondaryPhoneNumber: _.get(decedent, 'primaryInfo.secondaryPhoneNumber'),
                email: _.get(decedent, 'primaryInfo.email'),
                gender: _.get(decedent, 'primaryInfo.gender') ? _.findKey(seed['Gender'], function (key) {
                    return (key === _.get(decedent, 'primaryInfo.gender'))
                }) : null,
                dateOfBirth: _.get(decedent, 'primaryInfo.dateOfBirth'),
                addressPlaceId,
                birthPlaceId,
                maidenName: _.get(decedent, 'primaryInfo.maidenName'),
                maritalStatusId
            }
            newPerson = await this.filterUpdateObject(newPerson)
            person.set(newPerson)
            await person.save({ transaction })

            // update personVerificationDetails
            if (personVerificationDetails) {
                console.log('Updating Person Verification Details')
                let newPersonVerificationDetails = {
                    ssnLastFour: _.get(decedent, 'primaryInfo.ssn.lastFour'),
                    ssnSalt: _.get(decedent, 'primaryInfo.ssn.salt'),
                    ssnEncrypted: _.get(decedent, 'primaryInfo.ssn.encrypted'),
                    yearsAtResidentialAddress: parseInt(_.get(decedent, 'residentInfo.noOfYearsStayed')),
                    updatedBy: userId
                }
                newPersonVerificationDetails = await this.filterUpdateObject(newPersonVerificationDetails)
                personVerificationDetails.set(newPersonVerificationDetails)
                await personVerificationDetails.save({ transaction })
            }

            // if setLock param is present lock communication
            if (setLock === true) {
                familyArranger.set({ isFaaLocked: setLock })
                await familyArranger.save({ transaction })
            }

            return {
                message: 'OK'
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    static async updatePlace (reqBody, addressPlaceId, transaction) {
        const addressDetails = await formatAddress(reqBody)
        let finalAddressPlaceId = addressPlaceId
        if (addressPlaceId) {
            // Address place is present, create or update address
            const searchedPlace = await models.Place.findOne({
                where: {
                    id: addressPlaceId
                },
                transaction
            })
            if (searchedPlace.addressId) {
                // If address is already present update address
                const searchedAddress = await models.Address.findOne({
                    where: {
                        id: searchedPlace.addressId
                    },
                    transaction
                })
                searchedAddress.set(addressDetails)
                await searchedAddress.save({ transaction })
            } else {
                // If address is not present create new address and update the place
                const savedAddress = await models.Address.create(addressDetails, { transaction })
                searchedPlace.set({ addressId: savedAddress.id })
                await searchedPlace.save({ transaction })
            }
        } else {
            const savedAddress = await models.Address.create(addressDetails, { transaction })
            const addressId = savedAddress.id
            const savedPlace = await models.Place.create({ addressId }, { transaction })
            finalAddressPlaceId = savedPlace.id
        }
        return finalAddressPlaceId
    }

    static async updateEthnicityDetails (reqBody, ethnicityId, personId, transaction) {
        const raceOne = _.get(reqBody, 'raceOne.name')
        const raceTwo = _.get(reqBody, 'raceTwo.name')
        const raceThree = _.get(reqBody, 'raceThree.name')
        const ethnicityOne = _.get(reqBody, 'ethnicityOne.name')
        const ethnicityTwo = _.get(reqBody, 'ethnicityTwo.name')
        const ethnicityThree = _.get(reqBody, 'ethnicityThree.name')
        const hispanic = _.get(reqBody, 'hispanic.name')
        const ethnicityDetails = {
            personId,
            raceOneId: raceOne ? await this.getRaceId(raceOne) : null,
            raceTwoId: raceTwo ? await this.getRaceId(raceTwo) : null,
            raceThreeId: raceThree ? await this.getRaceId(raceThree) : null,
            hispanicId: hispanic ? await this.getEthnicityId(hispanic) : null,
            isHispanic: reqBody.isHispanic,
            ethnicityOneId: ethnicityOne ? await this.getEthnicityId(ethnicityOne) : null,
            ethnicityTwoId: ethnicityTwo ? await this.getEthnicityId(ethnicityTwo) : null,
            ethnicityThreeId: ethnicityThree ? await this.getEthnicityId(ethnicityThree) : null
        }
        let ethnicityResult = {}
        if (ethnicityId) {
            /* If the ethnicity is created */
            const searchedEthnicity = await models.PersonEthnicity.findOne({
                where: {
                    id: ethnicityId
                },
                transaction
            })
            searchedEthnicity.set(ethnicityDetails)
            ethnicityResult = await searchedEthnicity.save({ transaction })
        } else {
            /* If the ethnicity is not created */
            ethnicityResult = await models.PersonEthnicity.create(ethnicityDetails, { transaction })
        }
        return ethnicityResult.id
    }

    static async updateEducationDetails (reqBody, educationId, personId, transaction) {
        const educationDetails = {
            personId,
            qualificationId: reqBody.qualification ? await this.getQualificationId(reqBody.qualification) : null,
            occupation: reqBody.occupation,
            industry: reqBody.industry
        }
        if (reqBody.yearsOfOccupation) {
            educationDetails['yearsOfOccupation'] = parseInt(reqBody.yearsOfOccupation)
        }
        let educationResult = {}
        if (educationId) {
            /* If the education details is created */
            const searchedEducationDetails = await models.EducationDetails.findOne({
                where: {
                    id: educationId
                },
                transaction
            })
            searchedEducationDetails.set(educationDetails)
            educationResult = await searchedEducationDetails.save({ transaction })
        } else {
            /* If the education details is not created */
            educationResult = await models.EducationDetails.create(educationDetails, { transaction })
        }
        return educationResult.id
    }

    static async updateVeteranDetails (reqBody, veteranId, personId, transaction) {
        const veteranDetails = {
            personId,
            serviceBranchId: _.get(reqBody, 'serviceBranch') ? await this.getServiceBranchId(reqBody.serviceBranch) : null,
            serviceEra: _.get(reqBody, 'serviceEra', null),
            isUnknown: _.get(reqBody, 'isUnknown', false),
            isVeteran: _.get(reqBody, 'serviceBranch') ? 'true' : _.get(reqBody, 'isUnknown') ? 'unknown' : 'false'
        }
        let veteranResult = {}
        if (veteranId) {
            /* If the veteran is created */
            const searchedVeteran = await models.Veteran.findOne({
                where: {
                    id: veteranId
                },
                transaction
            })
            searchedVeteran.set(veteranDetails)
            veteranResult = await searchedVeteran.save({ transaction })
        } else {
            /* If the veteran is not created */
            veteranResult = await models.Veteran.create(veteranDetails, { transaction })
        }
        return veteranResult.id
    }

    static async updateParent (reqBody, relationName, personId, userId, transaction) {
        let parentContact = await models.PersonContact.findOne({
            where: { personId, deletedAt: null, deletedBy: null },
            include: [
                {
                    model: models.Person,
                    as: 'person',
                    attributes: ['id', 'prefix', 'firstName', 'middleName', 'lastName', 'maidenName']
                },
                {
                    model: models.Relation,
                    as: 'relation',
                    where: { name: relationName }
                }
            ],
            transaction
        })
        const relation = await models.Relation.findOne({
            where: {
                name: relationName
            },
            transaction
        })

        const parent = {
            ...reqBody
        }

        const parentAddress = {
            state: reqBody.birthState,
            country: reqBody.birthCountry
        }
        const addressDetails = await formatAddress(parentAddress)

        if (parentContact) {
            // parent already exists, update details
            const searchedPerson = await models.Person.findOne({
                where: {
                    id: parentContact.resourceId
                },
                transaction
            })

            if (Object.keys(addressDetails).length > 0) {
                if (searchedPerson.birthPlaceId) {
                    const searchedAddressPlace = await models.Place.findOne({
                        where: {
                            id: searchedPerson.birthPlaceId
                        },
                        transaction
                    })
                    const searchedAddress = await models.Address.findOne({
                        where: {
                            id: searchedAddressPlace.addressId
                        },
                        transaction
                    })
                    searchedAddress.set(addressDetails)
                    await searchedAddress.save({ transaction })
                } else {
                    const savedAddress = await models.Address.create(addressDetails, { transaction })
                    const addressId = savedAddress.id
                    const savedPlace = await models.Place.create({ addressId }, { transaction })
                    parent.birthPlaceId = savedPlace.id
                }
            }
            searchedPerson.set(parent)
            await searchedPerson.save({ transaction })
            parentContact.set({ updatedBy: userId })
            await parentContact.save({ transaction })
        } else {
            // parent doesn't exist, create parent
            if (Object.keys(addressDetails).length > 0) {
                const savedAddress = await models.Address.create(addressDetails, { transaction })
                const addressId = savedAddress.id
                const savedPlace = await models.Place.create({ addressId }, { transaction })
                parent.birthPlaceId = savedPlace.id
            }
            const savedPerson = await models.Person.create(parent, { transaction })
            const parentContactDetails = {
                personId,
                contactType: 1,
                resourceId: savedPerson.id,
                resourceType: 'Person',
                relationId: relation.id,
                createdBy: userId
            }
            parentContact = await models.PersonContact.create(parentContactDetails, { transaction })
        }
        return parentContact.id
    }

    static async updateCertifierDetails (reqBody, certifierId, deathDetails, transaction) {
        const certifierDetails = {
            licenseNumber: reqBody.licenseNumber.toUpperCase(),
            faxNumber: reqBody.faxNumber
        }
        let certifierResult = {}
        const address = _.get(reqBody, 'address')
        const updatedAddress = this.filterUpdateObject(address)
        const addressDetails = await formatAddress(updatedAddress)
        const personDetails = {
            prefix: reqBody.prefix,
            firstName: reqBody.firstName,
            lastName: reqBody.lastName,
            middleName: reqBody.middleName,
            phoneNumber: reqBody.phoneNumber
        }
        if (certifierId) {
            const certifier = await models.Certifier.findOne({
                where: {
                    id: certifierId
                },
                transaction
            })
            // Update certifier
            if (!certifier.personId && reqBody.firstName) {
                // Create person and address
                let addressPlaceId = null
                // Create address if any of the details is present
                if (Object.keys(addressDetails).length > 0) {
                    const savedAddress = await models.Address.create(addressDetails, { transaction })
                    const addressId = savedAddress.id
                    const savedPlace = await models.Place.create({ addressId }, { transaction })
                    addressPlaceId = savedPlace.id
                }
                // Create person
                personDetails.addressPlaceId = addressPlaceId
                const savedPerson = await models.Person.create(personDetails, { transaction })
                certifierDetails.personId = savedPerson.id
                const searchedCertifier = await models.Certifier.findOne({
                    where: {
                        id: certifierId
                    },
                    transaction
                })
                searchedCertifier.set(certifierDetails)
                certifierResult = await searchedCertifier.save({ transaction })
            } else if (certifier.personId) {
                // Update person
                const searchedPerson = await models.Person.findOne({
                    where: {
                        id: certifier.personId
                    },
                    transaction
                })
                searchedPerson.set(personDetails)
                await searchedPerson.save({ transaction })
                certifierResult = await models.Certifier.findOne({
                    where: {
                        id: certifierId
                    },
                    transaction
                })
            }
        } else {
            if (reqBody.firstName) {
                // Create person and certifier
                let addressPlaceId = null
                // Create address if zipcode is present
                if (_.get(reqBody, 'address.zipcode')) {
                    const savedAddress = await models.Address.create(addressDetails, { transaction })
                    const addressId = savedAddress.id
                    const savedPlace = await models.Place.create({ addressId }, { transaction })
                    addressPlaceId = savedPlace.id
                }
                // Create person
                personDetails.addressPlaceId = addressPlaceId
                const savedPerson = await models.Person.create(personDetails, { transaction })
                certifierDetails.personId = savedPerson.id
                certifierResult = await models.Certifier.create(certifierDetails, { transaction })
            }
            // If certifier name is not present, not creating certifier
        }
        const searchedDeathDetails = await models.DeathDetails.findOne({
            where: {
                id: deathDetails.id
            },
            transaction
        })
        searchedDeathDetails.set({ certifierId: certifierResult.id })
        await searchedDeathDetails.save({ transaction })
        return certifierResult.id
    }

    static async updateNotifierDetails (reqBody, personId, userId, transaction) {
        let notifier = await models.PersonContact.findOne({
            where: { personId: personId, deletedAt: null, deletedBy: null },
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
                                    attributes: ['id', 'apartment', 'line1', 'line2', 'city', 'state', 'county', 'country', 'zipcode']
                                },
                                {
                                    model: models.Organization,
                                    as: 'organization',
                                    attributes: ['id', 'name', 'phoneNumber']
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
            ],
            transaction
        })

        let relationId = null
        if (reqBody.relationship) {
            let relation = await models.Relation.findOne({
                where: {
                    name: reqBody.relationship
                },
                transaction
            })
            relationId = relation.id
        }

        const contactRole = await models.ContactRole.findOne({
            where: {
                name: 'Notifier'
            },
            transaction
        })
        const roleId = contactRole.id
        const address = _.get(reqBody, 'address')
        const updatedAddress = this.filterUpdateObject(address)
        const addressDetails = await formatAddress(updatedAddress)
        const personDetails = {
            prefix: reqBody.prefix,
            firstName: reqBody.firstName,
            lastName: reqBody.lastName,
            middleName: reqBody.middleName,
            phoneNumber: reqBody.phoneNumber,
            secondaryPhoneNumber: reqBody.secondaryPhoneNumber,
            email: reqBody.email
        }
        const personContactDetails = {
            personId,
            contactType: 1,
            resourceType: 'Person',
            relationId
        }

        if (notifier) {
            // update notifier
            let searchedPersonContact = await models.PersonContact.findOne({
                where: {
                    id: notifier.id
                },
                transaction
            })
            let searchedPerson = await models.Person.findOne({
                where: {
                    id: searchedPersonContact.resourceId
                },
                transaction
            })
            let addressPlaceId = searchedPerson.addressPlaceId

            if (Object.keys(addressDetails).length > 0) {
                if (!searchedPerson.addressPlaceId) {
                    // address is not present, create address
                    const savedAddress = await models.Address.create(addressDetails, { transaction })
                    const addressId = savedAddress.id
                    const savedPlace = await models.Place.create({ addressId }, { transaction })
                    addressPlaceId = savedPlace.id
                } else {
                    // address is present, update address
                    let searchedAddressPlace = await models.Place.findOne({
                        where: {
                            id: searchedPerson.addressPlaceId
                        },
                        transaction
                    })
                    let searchedAddress = await models.Address.findOne({
                        where: {
                            id: searchedAddressPlace.addressId
                        },
                        transaction
                    })
                    searchedAddress.set(addressDetails)
                    await searchedAddress.save({ transaction })
                }
                // address created/updated, update person
                personDetails.addressPlaceId = addressPlaceId
            }
            searchedPerson.set(personDetails)
            await searchedPerson.save({ transaction })
            // update person contact
            personContactDetails.updatedBy = userId
            searchedPersonContact.set(personContactDetails)
            await searchedPersonContact.save({ transaction })
        } else {
            // Create person and address
            let addressPlaceId = null
            // Create address if any of the details is present
            if (Object.keys(addressDetails).length > 0) {
                const savedAddress = await models.Address.create(addressDetails, { transaction })
                const addressId = savedAddress.id
                const savedPlace = await models.Place.create({ addressId }, { transaction })
                addressPlaceId = savedPlace.id
            }
            // Create person
            personDetails.addressPlaceId = addressPlaceId
            const savedPerson = await models.Person.create(personDetails, { transaction })
            // create person contact
            personContactDetails.resourceId = savedPerson.id
            personContactDetails.createdBy = userId
            const savedPersonContact = await models.PersonContact.create(personContactDetails, { transaction })
            // create person contact role
            const personContactRoleDetails = {
                personContactId: savedPersonContact.id,
                roleId
            }
            await models.PersonContactRole.create(personContactRoleDetails, { transaction })
        }
    }

    static async updateNOKDetails (reqBody, personId, resourceId, userId, transaction) {
        let relationId = null
        if (reqBody.relationship) {
            let relation = await models.Relation.findOne({
                where: {
                    name: reqBody.relationship
                },
                transaction
            })
            relationId = relation.id
        }

        const contactRole = await models.ContactRole.findOne({
            where: {
                name: 'Next of Kin'
            },
            transaction
        })
        const roleId = contactRole.id
        const address = _.get(reqBody, 'address')
        const updatedAddress = this.filterUpdateObject(address)
        const addressDetails = await formatAddress(updatedAddress)
        const personDetails = {
            prefix: reqBody.prefix,
            firstName: reqBody.firstName,
            lastName: reqBody.lastName,
            middleName: reqBody.middleName,
            phoneNumber: reqBody.phoneNumber,
            email: reqBody.email,
            secondaryPhoneNumber: reqBody.secondaryPhoneNumber
        }
        const personContactDetails = {
            personId,
            contactType: 1,
            resourceType: 'Person',
            relationId
        }

        let updatedResourceId = resourceId
        if (resourceId) {
            // update nok
            let searchedPersonContact = await models.PersonContact.findOne({
                where: {
                    personId,
                    resourceId
                },
                transaction
            })
            let searchedPerson = await models.Person.findOne({
                where: {
                    id: searchedPersonContact.resourceId
                }
            })
            let addressPlaceId = searchedPerson.addressPlaceId

            if (Object.keys(addressDetails).length > 0) {
                if (!searchedPerson.addressPlaceId) {
                    // address is not present, create address
                    const savedAddress = await models.Address.create(addressDetails, { transaction })
                    const addressId = savedAddress.id
                    const savedPlace = await models.Place.create({ addressId }, { transaction })
                    addressPlaceId = savedPlace.id
                } else {
                    // address is present, update address
                    let searchedAddressPlace = await models.Place.findOne({
                        where: {
                            id: searchedPerson.addressPlaceId
                        },
                        transaction
                    })
                    let searchedAddress = await models.Address.findOne({
                        where: {
                            id: searchedAddressPlace.addressId
                        },
                        transaction
                    })
                    searchedAddress.set(addressDetails)
                    await searchedAddress.save({ transaction })
                }
                // address created/updated, update person
                personDetails.addressPlaceId = addressPlaceId
                searchedPerson.set(personDetails)
                await searchedPerson.save({ transaction })
                // update person contact
                personContactDetails.updatedBy = userId
                searchedPersonContact.set(personContactDetails)
                await searchedPersonContact.save({ transaction })
            }
        } else {
            // Create person and address
            let addressPlaceId = null
            // Create address if any of the details is present
            if (Object.keys(addressDetails).length > 0) {
                const savedAddress = await models.Address.create(addressDetails, { transaction })
                const addressId = savedAddress.id
                const savedPlace = await models.Place.create({ addressId }, { transaction })
                addressPlaceId = savedPlace.id
            }
            // Create person
            personDetails.addressPlaceId = addressPlaceId
            const savedPerson = await models.Person.create(personDetails, { transaction })
            updatedResourceId = savedPerson.id
            // create person contact
            personContactDetails.resourceId = savedPerson.id
            personContactDetails.createdBy = userId
            const savedPersonContact = await models.PersonContact.create(personContactDetails, { transaction })
            // create person contact role
            const personContactRoleDetails = {
                personContactId: savedPersonContact.id,
                roleId
            }
            await models.PersonContactRole.create(personContactRoleDetails, { transaction })
        }
        return updatedResourceId
    }

    static async getQualificationId (name) {
        const qualification = await models.Qualification.findOne({
            where: {
                name
            }
        })
        return qualification.id
    }

    static async getServiceBranchId (name) {
        const serviceBranch = await models.ServiceBranch.findOne({
            where: {
                name
            }
        })
        return serviceBranch.id
    }

    static async getRaceId (name) {
        const race = await models.Race.findOne({
            where: {
                name
            }
        })
        return race.id
    }

    static async getEthnicityId (name) {
        const ethnicity = await models.Ethnicity.findOne({
            where: {
                name
            }
        })
        return ethnicity.id
    }

    static async filterUpdateObject (object) {
        const newObject = {}
        Object.keys(object).forEach((key) => {
            if (object[key]) {
                newObject[key] = object[key]
            }
        })
        return newObject
    }
}

module.exports = SyncController
