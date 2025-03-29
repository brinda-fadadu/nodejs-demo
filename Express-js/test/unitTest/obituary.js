const models = require('../../models')
const {personSchema, addressSchema} = require('./schema')
const { createObituary, createObituaryFile, uploadPersonPicture, getObituaryDetails } = require('../../controllers/refactorControllers/personController/obituaryController')
const VerifiedPersonController  = require('../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../controllers/refactorControllers/personController/personController')
const { findOrCreateUser } = require('./helper')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
chai.should()

let userId, personId, obituaryData

describe('Obituary Controller Unit Test Cases', () => {
    before(async () => {
        const person = {
            ...personSchema()
        }
        const place= {
            address: {
                ...addressSchema()
            }
        }
        const createdPerson = await PersonController.createOrUpdate(person, place, {})
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        if(person.isVerified) {
            await verifiedPersonController.verifyPerson(createdPerson)
        }
        personId = createdPerson.id
        const user = await findOrCreateUser()
        userId = user.id
        obituaryData = {
            obituary: "Test Obituary 2",
            fileUrl: "testUrl for obituary",
	        fileType: "audio",
            personId: personId,
            createdBy: userId
        }
    })

    it('should successfully create Obituary of a Person', async () => {
        let createdObituary = await createObituary(obituaryData)
        createdObituary.should.have.property('prefix')
        createdObituary.should.have.property('firstName')
        createdObituary.should.have.property('lastName')
        createdObituary.should.have.property('middleName')
        createdObituary.should.have.property('dateOfBirth')
        createdObituary.should.have.property('dateOfDeath')
        createdObituary.should.have.property('obituary')
        createdObituary.should.have.property('audioFileUrl')
        createdObituary.should.have.property('pictureUrl')
        createdObituary.should.have.property('lastUpdatedBy')
        createdObituary.should.have.property('lastUpdatedAt')
    })

    it('should successfully create Obituary File of a Person', async () => {
        let createdObituary = await createObituaryFile(obituaryData)
        createdObituary.should.have.property('prefix')
        createdObituary.should.have.property('firstName')
        createdObituary.should.have.property('lastName')
        createdObituary.should.have.property('middleName')
        createdObituary.should.have.property('dateOfBirth')
        createdObituary.should.have.property('dateOfDeath')
        createdObituary.should.have.property('obituary')
        createdObituary.should.have.property('audioFileUrl')
        createdObituary.should.have.property('pictureUrl')
        createdObituary.should.have.property('lastUpdatedBy')
        createdObituary.should.have.property('lastUpdatedAt')
    })

    it('should successfully update Picture of a Person', async () => {
        let createdObituary = await uploadPersonPicture(personId, 'pictureUrl', userId)
        createdObituary.should.have.property('prefix')
        createdObituary.should.have.property('firstName')
        createdObituary.should.have.property('lastName')
        createdObituary.should.have.property('middleName')
        createdObituary.should.have.property('dateOfBirth')
        createdObituary.should.have.property('dateOfDeath')
        createdObituary.should.have.property('obituary')
        createdObituary.should.have.property('audioFileUrl')
        createdObituary.should.have.property('pictureUrl')
        createdObituary.should.have.property('lastUpdatedBy')
        createdObituary.should.have.property('lastUpdatedAt')
    })

    it('should successfully get Obituary Details of a Person', async () => {
        let createdObituary = await getObituaryDetails(personId)
        createdObituary.should.have.property('prefix')
        createdObituary.should.have.property('firstName')
        createdObituary.should.have.property('lastName')
        createdObituary.should.have.property('middleName')
        createdObituary.should.have.property('dateOfBirth')
        createdObituary.should.have.property('dateOfDeath')
        createdObituary.should.have.property('obituary')
        createdObituary.should.have.property('audioFileUrl')
        createdObituary.should.have.property('pictureUrl')
        createdObituary.should.have.property('lastUpdatedBy')
        createdObituary.should.have.property('lastUpdatedAt')
    })

    after(async () => {
        await models.Obituary.destroy({ where: {} })
        await models.ObituaryFile.destroy({ where: {} })
        await models.Person.destroy({ where: {} })
    })

})
