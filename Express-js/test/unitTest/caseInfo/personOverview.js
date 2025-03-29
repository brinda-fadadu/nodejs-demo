const faker = require('faker')
const PersonController = require('../../../controllers/refactorControllers/personController/personController')
const AgreementController = require('../../../controllers/refactorControllers/agreementController/agreementController')
const CallController = require('../../../controllers/refactorControllers/callController/callController')
const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const models = require('../../../models/index')
const {addressSchema, organizationSchema, personSchema, contactsSchema, agreementSchema, callSchema, certifierSchema} = require('../schema')
const {getRolesOnContactType, getRelationsForContacts} = require('../helper')

const chai = require('chai')
const moment = require('moment')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised);
chai.should();

describe('creating a person and getting the basic details of the person', () => {
    let personId, createdPerson

    it('should create a person with isVerified true', async () => {
        const person = {
            ...personSchema(),
            isAlive: false
        }
        const place= {
            organization:{
                ...organizationSchema()
            },
            address: {
                ...addressSchema()
            }
        }
        createdPerson = await PersonController.createOrUpdate(person, place, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        const verifiedPerson = await verifiedPersonController.verifyPerson(createdPerson)
        personId = createdPerson.id
        createdPerson.should.have.property('firstName').and.to.be.equal(person.firstName)
    })

    it('should return person not found error if not existing personId is sent', async () => {
        try {
            const verifiedPersonController = new VerifiedPersonController(faker.random.number())

            const primaryDetails = await verifiedPersonController.getPrimaryDetails()
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
        }

        
    })

    it('should fetch the primaryDetails of the person', async () => {
        const verifiedPersonController = new VerifiedPersonController(personId)

        const primaryDetails = await verifiedPersonController.getPrimaryDetails()
        primaryDetails.should.have.property('id').and.to.be.equal(personId)
        primaryDetails.firstName.should.be.equal(createdPerson.firstName)
        primaryDetails.addressPlaceId.should.be.equal(createdPerson.addressPlaceId)
    })

    it('should throw an error when non existing personId is sent', async () => {
        try {
            const verifiedPersonController = new VerifiedPersonController(faker.random.number({ min:100}))
            const primaryDetails = await verifiedPersonController.getPrimaryDetails()
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
        }
    })

    it('should edit the primary details of the person', async () => {
        const verifiedPersonController = new VerifiedPersonController(personId)

        let primaryDetails = await verifiedPersonController.getPrimaryDetails()
        primaryDetails = primaryDetails.toJSON()
        primaryDetails.firstName = 'abcd'
        primaryDetails.addressPlace.address.line1 = 'abcd'
        const updatedDetails = await verifiedPersonController.setPrimaryDetails(primaryDetails)
        const personDetails = await verifiedPersonController.getPrimaryDetails()
        personDetails.firstName.should.be.equal(updatedDetails.firstName)
        personDetails.id.should.be.equal(personId)
    })

    it('should add the education details of the person', async () => {
        let educationSchema = {
            qualificationId: faker.random.number({ min: 1, max: 5 }),
            occupation: faker.random.word(),
            yearsOfOccupation: faker.random.number({ min: 1, max: 50 }),
            industry: faker.random.word()
        }
        const verifiedPersonController = new VerifiedPersonController(personId)

        const educationDetails = await verifiedPersonController.setEducationDetails(educationSchema)
        educationDetails.should.have.property('personId').and.to.be.equal(personId)
    })

    it('should edit the existing education details of the person', async () => {
        const verifiedPersonController = new VerifiedPersonController(personId)

        let educationDetails = await verifiedPersonController.getEducationDetails(personId)
        educationDetails = educationDetails.toJSON()
        educationDetails.occupation = 'abcd'
        educationDetails.industry = 'abcd'

        let updatedDetails = await verifiedPersonController.setEducationDetails(educationDetails)
        updatedDetails.occupation.should.be.equal('abcd')
        updatedDetails.industry.should.be.equal('abcd')
        updatedDetails.personId.should.be.equal(personId)
    })

    it('should add the veteran details for the person', async () => {
        let veteranSchema = {
            serviceBranchId: faker.random.number({min:1, max: 5}),
            serviceEra: faker.random.word(),
            isUnknown: faker.random.boolean()
        }
        const verifiedPersonController = new VerifiedPersonController(personId)
        const veteran = await verifiedPersonController.setVeteranDetails(veteranSchema)
        veteran.should.have.property('serviceEra').and.to.be.equal(veteranSchema.serviceEra)
        veteran.should.have.property('personId').and.to.be.equal(personId)

    })

    it('should get the veteran details', async () => {
        const verifiedPersonController = new VerifiedPersonController(personId)
        const veteran = await verifiedPersonController.getVeteranDetails()
        veteran.should.have.property('personId').and.to.be.equal(personId)
    })

    it('should edit the veteran details', async () => {
        const verifiedPersonController = new VerifiedPersonController(personId)
        const veteran = await verifiedPersonController.getVeteranDetails()
        const editReqBody = {
            ...veteran.toJSON(),
            isUnknown: false
        }
        const editedDetails = await verifiedPersonController.setVeteranDetails(editReqBody)
        editedDetails.should.have.property('isUnknown').and.to.be.equal(false)
    })


    it('should add the deathDetails of the person', async () => {
        let deathDetailsSchema = {
            deathPlace: {
                address: {
                    ...addressSchema()
                },
                organization: {
                    ...organizationSchema()
                }
            },
            hospitalDeathStatus: faker.random.word(),
            lorSameAsPlaceOfDeath: false,
            lor: {
                address: {
                    ...addressSchema()
                },
                organization: {
                    ...organizationSchema()
                }
            }
        }
        const verifiedPersonController = new VerifiedPersonController(personId)

        let deathDetails = await verifiedPersonController.setDeathDetails(deathDetailsSchema)
        deathDetails.personId.should.be.equal(personId)
    })

    it('should edit the deathDetails of the person', async () => {
        const verifiedPersonController = new VerifiedPersonController(personId)

        let deathDetails = await verifiedPersonController.getDeathDetails(personId)
        deathDetails = deathDetails.toJSON()
        deathDetails.lorSameAsPlaceOfDeath = true

        let updatedDetails = await verifiedPersonController.setDeathDetails(deathDetails)
        updatedDetails.deathPlaceId.should.be.equal(updatedDetails.locationOfRemainId)
    })

    it('should add the certifier details of a person', async () => {
        const verifiedPersonController = new VerifiedPersonController(personId)
        let certifierDetails = await verifiedPersonController.getCerifierDetails()

        let certifierSchemas = {
            id: certifierDetails.id || null,
            ...certifierSchema()
        }

        let addedCertifierDetails = await verifiedPersonController.setCertfierDetails(certifierSchemas)
        addedCertifierDetails.should.have.property('personId').and.to.be.equal(personId)
    })

    it('should edit the certifier details', async () => {
        const verifiedPersonController = new VerifiedPersonController(personId)

        let certifierDetails = await verifiedPersonController.getCerifierDetails()
        certifierDetails = certifierDetails.toJSON()
        let editReqBody = {
            id: certifierDetails.id,
            certifier: {
                ...certifierDetails.certifier
            }
        }
        editReqBody.certifier.certifierPerson.firstName = 'abcd'
        let updatedDetails = await verifiedPersonController.setCertfierDetails(editReqBody)
        updatedDetails.certifier.certifierPerson.firstName.should.be.equal('abcd')

    })

    it('should make locationOfRemainId as same as deathPlaceId if lor same as pod is true and no pod is entered', async () => {
        const verifiedPersonController = new VerifiedPersonController(personId)

        let deathDetails = await verifiedPersonController.getDeathDetails(personId)
        deathDetails = deathDetails.toJSON()
        deathDetails.lorSameAsPlaceOfDeath = true
        let updatedDetails = await verifiedPersonController.setDeathDetails(deathDetails)
        updatedDetails.should.have.property('locationOfRemainId').and.to.be.equal(deathDetails.deathPlaceId)
    })

    it('should add the ethnicity details of a person', async () => {
        let ethnictySchema = {
            isHispanic: true,
            hispanicId: faker.random.number({ min: 1, max: 10 }),
            ethnicityOneId: faker.random.number({ min: 1, max: 10 }),
            ethnicityTwoId: faker.random.number({ min: 1, max: 10 }),
            ethnicityThreeId: faker.random.number({ min: 1, max: 10 }),
            raceOneId: faker.random.number({ min: 1, max: 10 }),
            raceTwoId: faker.random.number({ min: 1, max: 10 }),
            raceThreeId: faker.random.number({ min: 1, max: 10 })
        }
        const verifiedPersonController = new VerifiedPersonController(personId)

        let ethnicityDetails = await verifiedPersonController.setEthnicityDetails(ethnictySchema)
        ethnicityDetails.should.have.property('personId').and.to.be.equal(personId)
    })

    it('should edit the ethnicity details of the person', async () => {
        const verifiedPersonController = new VerifiedPersonController(personId)

        let ethnicityDetails = await verifiedPersonController.getEthnicityDetails()
        ethnicityDetails = ethnicityDetails.toJSON()
        ethnicityDetails.isHispanic = false

        let updatedDetails = await verifiedPersonController.setEthnicityDetails(ethnicityDetails)
        updatedDetails.should.have.property('isHispanic').and.to.be.equal(false)
    })

    it('should the family/others contact successfully', async () => {
        const contactType = 1
        const roles = await getRolesOnContactType(contactType, noUniqueRoles=true)
        const contactSchema = await contactsSchema(contactType, noUniqueRelations = true)
        const createContactReqBody = {
            contactType,
            contactRoleIds: roles,
            ...contactSchema
        }
        const verifiedPersonController = new VerifiedPersonController(personId)
        const createdContact = await verifiedPersonController.addOrUpdateContactsWithRoles(createContactReqBody)
        createdContact.should.have.property('id')
        createdContact.should.have.property('personId').and.to.be.equal(personId)
        createdContact.contactRoles.length.should.be.equal(roles.length)
    })
    it('should the staff contact successfully', async () => {
        const contactType = 2
        const roles = await getRolesOnContactType(contactType, noUniqueRoles=true)
        const contactSchema = await contactsSchema(contactType, noUniqueRelations=true)
        const createContactReqBody = {
            contactType,
            contactRoleIds: roles,
            ...contactSchema
        }
        const verifiedPersonController = new VerifiedPersonController(personId)
        const createdContact = await verifiedPersonController.addOrUpdateContactsWithRoles(createContactReqBody)
        createdContact.should.have.property('id')
        createdContact.should.have.property('personId').and.to.be.equal(personId)
        createdContact.contactRoles.length.should.be.equal(roles.length)

    })

    it('should throw an error saying duplicate roles when contacts with NOTIFIER, INFORMANT, POWER OF ATTORNEY, Funeral Authorizer', async () => {
        const contactType = 1
        const roles = await getRolesOnContactType(contactType, noUniqueRoles=false)
        const contactSchema = await contactsSchema(contactType, noUniqueRelations=true)
        const createContactReqBody = {
            contactType,
            contactRoleIds: roles,
            ...contactSchema
        }
        const verifiedPersonController = new VerifiedPersonController(personId)
        const createdContact = await verifiedPersonController.addOrUpdateContactsWithRoles(createContactReqBody)
        try {
            createContactReqBody.contactRoleIds = roles
            const duplicateContact = await verifiedPersonController.addOrUpdateContactsWithRoles(createContactReqBody)
        } catch (error) {
            error.should.have.property('message')
        }
    })

    it('should return an error saying contacts not found', async () => {
        try {
        const verifiedPersonController = new VerifiedPersonController(personId)
        const contactDetails = await verifiedPersonController.getContactDetails(faker.random.number())
            
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('CONTACT_NOT_FOUND')
        }
    })


    it('should fetch the details of the created contact', async () => {
        const contactType = faker.random.number({min: 1, max: 3})
        const roles = await getRolesOnContactType(contactType, noUniqueRoles=true)
        const contactSchema = await contactsSchema(contactType, noUniqueRelations=true)
        const createContactReqBody = {
            contactType,
            contactRoleIds: roles,
            ...contactSchema
        }
        const verifiedPersonController = new VerifiedPersonController(personId)
        const createdContact = await verifiedPersonController.addOrUpdateContactsWithRoles(createContactReqBody)
        const contactDetails = await verifiedPersonController.getContactDetails(createdContact.id)

        contactDetails.should.have.property('id').and.to.be.equal(createdContact.id)
        createdContact.should.have.property('personId').and.to.be.equal(personId)
        createdContact.contactRoles.length.should.be.equal(roles.length)
    })


    it('should create and edit the contact details', async () => {
        const contactType = 1
        const roles = await getRolesOnContactType(contactType, noUniqueRoles=true)
        const contactSchema = await contactsSchema(contactType, noUniqueRelations=true)
        const createContactReqBody = {
            contactType,
            contactRoleIds: roles,
            ...contactSchema
        }
        const verifiedPersonController = new VerifiedPersonController(personId)
        const createdContact = await verifiedPersonController.addOrUpdateContactsWithRoles(createContactReqBody)
        let contactDetails = await verifiedPersonController.getContactDetails(createdContact.id)

        let editContactSchema = {
            ...contactDetails
        }
        switch (contactDetails.contactType) {
            case 1:
            case 3:
                editContactSchema.person = {
                    ...contactDetails.person,
                    firstName: 'abcd'
                }
                break;
            case 2:
                editContactSchema.resourceId = 3
                break
            default:
                break;
        }
        editContactSchema.contactRoleIds = roles.slice(roles.length - 1)
        const updatedContact = await verifiedPersonController.addOrUpdateContactsWithRoles(editContactSchema)
        updatedContact.should.have.property('id').and.to.be.equal(contactDetails.id)
        switch (updatedContact.contactType) {
            case 1:
            case 3:
                updatedContact.person.firstName.should.be.equal('abcd')
                break;
            case 2:
                updatedContact.resourceId.should.be.equal(editContactSchema.resourceId)
        
            default:
                break;
        }
    })

    it('should not create duplicate contacts of relation Father/Mother/Spouse', async () => {
        const contactType = 1
        const roles = await getRolesOnContactType(contactType, noUniqueRoles=true)
        const contactSchema = await contactsSchema(contactType, noUniqueRelations=false)
        const createContactReqBody = {
            contactType,
            contactRoleIds: roles,
            ...contactSchema
        }
        const verifiedPersonController = new VerifiedPersonController(personId)
        const createdContact = await verifiedPersonController.addOrUpdateContactsWithRoles(createContactReqBody)
        try {
            const duplicateContact = await verifiedPersonController.addOrUpdateContactsWithRoles(createContactReqBody)
        } catch (error) {
            error.should.have.property('message')
        }
    })

    it('should throw an error saying invalid relation', async () => {
        const contactType = 1
        const roles = await getRolesOnContactType(contactType, noUniqueRoles=true)
        const contactSchema = await contactsSchema(contactType, noUniqueRelations=false)
        const createContactReqBody = {
            contactType,
            contactRoleIds: roles,
            ...contactSchema,
            relationId: faker.random.number()
        }
        const verifiedPersonController = new VerifiedPersonController(personId)
        try {
            const duplicateContact = await verifiedPersonController.addOrUpdateContactsWithRoles(createContactReqBody)
        } catch (error) {
            error.should.have.property('message').and.to.be.equal('INVALID_RELATION')
        }
    })

    it('should fetch the list of contacts of the person', async () => {
        const verifiedPersonController = new VerifiedPersonController(personId)
        let listOfContacts = await verifiedPersonController.getListOfContacts()
        listOfContacts.should.be.an('array').of.length.greaterThan(0)
    })

    it('should fetch the list of contacts of the person based on contactType', async () => {
        const verifiedPersonController = new VerifiedPersonController(personId)
        let listOfContacts = await verifiedPersonController.getListOfContacts({contactType: [1,3]})
        listOfContacts.should.be.an('array').of.length.greaterThan(0)
    })

    it('should fetch contacts based on relations(father and mother)', async () => {
        const relations = await getRelationsForContacts(false)
        const verifiedPersonController = new VerifiedPersonController(personId)
        let listOfContacts = await verifiedPersonController.getListOfContacts({relationId: relations})
        listOfContacts.should.be.an('array').of.length.greaterThan(0)
    })

    it('should fetch the list of noks of a person', async () => {
        const verifiedPersonController = new VerifiedPersonController(personId)
        let noks = await verifiedPersonController.getNokDetails()
        noks.should.be.an('array').of.length.greaterThan(0)
    })

    it('should fetch notifier details of a person', async () => {
        const verifiedPersonController = new VerifiedPersonController(personId)
        let notifier = await verifiedPersonController.getNotifierDetails()
        notifier.should.have.property('personId').and.to.be.equal(personId)

    })

    it('should be able to successfully delete a contact', async () => {
        const verifiedPersonController = new VerifiedPersonController(personId)
        let listOfContacts = await verifiedPersonController.getListOfContacts()
        let deletedContact = await verifiedPersonController.deleteContact(listOfContacts[0].id)
        deletedContact[0].should.be.equal(1)
    })

})


describe('ongoing case listing', () => {
    let agreementPersonOpi
    let personName, opi

    before(async () => {
        const createdPerson = await PersonController.createOrUpdate({...personSchema()}, {}, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        const verifiedDetails = await verifiedPersonController.verifyPerson()
        const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementType=1, createdPerson.isAlive ? 1: 2 )
        const arrangement = await verifiedPersonController.createArrangement()
        saleTypeIds = saleTypes.map(saleType => saleType.id)
        const agreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            type: 1,
            saleTypeId: faker.random.arrayElement(saleTypeIds)
        }
        agreementPersonOpi = verifiedDetails.onePortalId
        await AgreementController.createOrEditAgreement(createdPerson.id, agreementObject, 1)
    })
    
    it('should fetch the list of ongoing cases', async () => {
        const onGoingCasesRes = await VerifiedPersonController.getOngoingCases()
        onGoingCasesRes.should.have.property('onGoingCases')
        onGoingCasesRes.should.have.property('totalResults').and.to.be.greaterThan(0)
        personName = onGoingCasesRes.onGoingCases[0].firstName
        opi = onGoingCasesRes.onGoingCases[0].onePortalId
    })

    it('should fetch the list with one element when searching with the name', async () => {
        const onGoingCasesRes = await VerifiedPersonController.getOngoingCases({ opiOrName: personName })
        onGoingCasesRes.should.have.property('onGoingCases')
        onGoingCasesRes.should.have.property('totalResults').and.to.be.equal(1)
    })

    it('should fetch the list with one element when searching with the opi', async () => {
        const onGoingCasesRes = await VerifiedPersonController.getOngoingCases({ opiOrName: opi })
        onGoingCasesRes.should.have.property('onGoingCases')
        onGoingCasesRes.should.have.property('totalResults').and.to.be.equal(1)
    })

    it('should fetch the list with one element when searching with the opi of an agreementPerson', async () => {
        const onGoingCasesRes = await VerifiedPersonController.getOngoingCases({ opiOrName: agreementPersonOpi })
        onGoingCasesRes.should.have.property('onGoingCases')
        onGoingCasesRes.should.have.property('totalResults').and.to.be.equal(1)
    })

    it('should fetch the list with 0 element when searching with the name of person verified before 15 days', async () => {
        const dateBefore15Days = moment().subtract(16, 'days')
        await models.PersonVerificationDetails.update({ 
            lastTouchedAt: dateBefore15Days,
            verifiedAt: dateBefore15Days
        }, {
            where: {
                onePortalId: opi
            }
        })
        await models.Agreement.update({ 
            status: 'Completed'
        }, {
            where: {}
        })
        const onGoingCasesRes = await VerifiedPersonController.getOngoingCases({ opiOrName: opi })
        onGoingCasesRes.should.have.property('onGoingCases')
        onGoingCasesRes.should.have.property('totalResults').and.to.be.equal(0)
    })

    it('should fetch the list with 0 element when searching with the opi of an agreementPerson of non active agreements', async () => {
        const onGoingCasesRes = await VerifiedPersonController.getOngoingCases({ opiOrName: agreementPersonOpi })
        onGoingCasesRes.should.have.property('onGoingCases')
        onGoingCasesRes.should.have.property('totalResults').and.to.be.equal(0)
    })
})


describe('get Notes', () => {
    let createdCall
    after(async () => {
        await models.PersonContactRole.destroy({ where: {}})
        await models.PersonContact.destroy({ where: {}})
        await models.DeathDetails.destroy({ where: {}})
        await models.Certifier.destroy({ where: {}})
        await models.EducationDetails.destroy({ where: {}})
        await models.PersonEthnicity.destroy({ where: {}})
        await models.Person.destroy({ where: {}})
        await models.Place.destroy({ where: {}})
    })

    before(async () => {
        const callObject = await callSchema(1)
        callObject.userId = 1
        callObject.notes = [
            {
                level: 'reason',
                content: faker.random.words()
            },
            {
                level: '',
                content: faker.random.words()
            }
        ]
        createdCall = await CallController.createOrUpdate(callObject)
    })

    it('should list the person related notes', async () => {
        const personController = new PersonController(createdCall.callerId)
        const notesList = await personController.getPersonRelatedNotes()
        notesList.length.should.be.equal(2)
        notesList[0].level.should.be.equal('reason')
        notesList.forEach(eachNote => {
            eachNote.should.have.property('categoryId')
            eachNote.should.have.property('resourceType').and.equal('call')
        })
    })
    
})
