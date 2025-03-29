const {
    chai,
    server,
    addTestUser,
    genAuthToken,
    verifyPerson,
} = require('../../../../helper')
const faker = require('faker')
const baseUrl = '/api/v1/persons'
const { generateOpi } = require('../../../../personVerifyFunction')
const lowering = require('../../../../../utils/loweringFirstLetter')
const personSchemaCreation = require('../../../../schema/person')
const models = require('../../../../../models')
const { seed, getMaritalStatusIds } = require('../../../../../config/seed')


let authToken, personData, user, personSchema, reqBody, randomString, randomNumber, genderValues, maritalStatusIds

describe('Update priamry details of a person', () => {
    before(async () => {
        try {
            user = await addTestUser()
            authToken = await genAuthToken(user)
            personData = await generateOpi(user) // this function returns personId, opi
            personSchema = await personSchemaCreation()
            reqBody = lowering(personSchema)
            randomString = faker.random.word()
            randomNumber = faker.random.number()
            reqBody.phoneNumber = faker.phone.phoneNumber('123#######')
            reqBody.secondaryPhoneNumber = faker.phone.phoneNumber('123#######')
            delete reqBody.aKA
            delete reqBody.ssn
            delete reqBody.onePortalId
            delete reqBody.licenseNumber
            delete reqBody.languageId,
            delete reqBody.isVerified,
            delete reqBody.organizationId
            delete reqBody.dateOfDeath
            genderValues = Object.keys(seed.Gender).map(e => { return Number(e) })
            maritalStatusIds = await getMaritalStatusIds()

        } catch (error) {
            console.log(error)
        }
    })

    after(async () => {
        await models.Call.destroy({ where: {} })
        await models.Person.destroy({ where: {} })
        await models.PersonInfo.destroy({ where: {} })
    })

    it('should return an error saying token is not found', async () => {
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', '')
        res.should.have.status(401)
    })

    it('should return error of invalid personId', async () => {
        const res = await chai.request(server)
        .put(`${baseUrl}/${randomString}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('PersonId must be a integer')
    })

    it('should return an error saying person not found', async () => {
        
        const res = await chai.request(server)
        .put(`${baseUrl}/${randomNumber}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(404)
        res.body.should.have.property('error').and.to.be.equal('Person not found')
    })

    it('should return error saying invalid prefix', async () => {
        reqBody.prefix = randomNumber
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Prefix must be a string')
    })

    it('should return error saying firstName is required', async () => {
        delete reqBody.firstName
        reqBody.prefix = faker.name.prefix()
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('First Name is required')
    })

    it('should return error saying invalid firstName', async () => {
        reqBody.firstName = randomNumber
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('First Name must be a string')
    })

    it('should return an error saying invalid lastName', async () => {
        reqBody.firstName = faker.name.firstName()
        reqBody.lastName = randomNumber
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Last Name must be a string')
    })

    it('should return an error saying invalid middleName', async () => {
        reqBody.lastName = faker.name.lastName()
        reqBody.middleName = randomNumber
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Middle Name must be a string')
    })

    it('should return an error saying phoneNumber is required', async () => {
        reqBody.middleName = randomString
        delete reqBody.phoneNumber
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Phone Number is required')
    })

    it('should return an error saying invalid phoneNumber', async () => {
        reqBody.middleName = randomString
        reqBody.phoneNumber = randomNumber
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Phone Number must be a string')
    })

    it('should return an error saying invalid secondary phone number', async () => {
        reqBody.phoneNumber = faker.phone.phoneNumber('123#######')
        reqBody.secondaryPhoneNumber = randomNumber
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Secondary Phone Number must be a string')
    })

    it('should return an error saying invalid email', async () => {
        reqBody.secondaryPhoneNumber = faker.phone.phoneNumber('123#######')
        reqBody.email = randomString

        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Enter a valid Email')

    })

    it('should return an error saying aka should be a string', async () => {
        reqBody.email = faker.internet.email()
        reqBody.aka = randomNumber
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('AKA must be a string')
    })

    it('should return an error saying ssn should be a string', async () => {
        reqBody.aka = randomString
        reqBody.ssn = randomNumber
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('SSN must be a string')
    })

    it('should return an error saying gender should be a number', async () => {
        reqBody.ssn = randomString
        reqBody.gender = randomString
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Gender must be a integer')
    })

    it('should return an error saying gender should be a number from gender values', async () => {
        reqBody.ssn = randomString
        reqBody.gender = randomNumber
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Enter valid Gender from [${genderValues}]`)
    })

    it('should return an error saying date of birth should be a date', async () => {
        reqBody.gender = genderValues[0]
        reqBody.dateOfBirth = randomString
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Date of Birth must be a date')
    })

    it('should return an error saying date of birth must be before today', async () => {
        reqBody.dateOfBirth = faker.date.future()
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Date of Birth must be less than today')
    })

    it('should return an error saying marital status must be a number', async () => {
        reqBody.dateOfBirth = faker.date.past()
        reqBody.maritalStatus = randomString
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Marital Status must be a integer')
    })

    it('should return an error saying marital status must be valid', async () => {
        reqBody.maritalStatus = randomNumber
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Enter valid Marital Status from [${maritalStatusIds}]`)
    })

    it('should be able to update the primary details of the person', async () => {
        reqBody.maritalStatus = maritalStatusIds[0]
        const res = await chai.request(server)
        .put(`${baseUrl}/${personData.personId}/primaryInfo`)
        .send(reqBody)
        .set('authorization', authToken)
        res.should.have.status(200)
        res.body.should.have.property('success').and.to.be.equal(true)
    })

})

