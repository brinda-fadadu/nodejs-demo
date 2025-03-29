const {
    chai,
    server,
    addTestUser,
    genAuthToken,
    verifyPerson,
} = require('../../../helper')  //Please change the helper path if required


const faker = require('faker')
const _ = require('underscore')
const { getCallData, createCallData } = require('../../../schema/call') 	// Please check this path from your file path
const { certifierSchema, createAddress } = require('../../../schema/personInfo')
const models = require('../../../../models')
const loweringFirstLetter = require('../../../../utils/loweringFirstLetter')

let authToken, certifierObject, addressObject, OPI, anotherCertifier = {}

const baseUrl = '/api/v1/certifiers'

describe('Add certifier details', async () => {
    before(async () => {
        try {
            const user = await addTestUser()
            const atNeedCallData = await getCallData()
            authToken = await genAuthToken(user)
    
            atNeedCallData.call.userId = user.id
            const callResponse = await createCallData(atNeedCallData.call)
            const verifyData = {
                callId: callResponse.Identifier,
                personId: callResponse.someOneHasPassed[0].DecedentId,
                currentUserId: user.id,
                userType: 'Decedent',
                reasonId: callResponse.someOneHasPassed[0].id
            }
            const verificationResult = await verifyPerson(verifyData)
            OPI = verificationResult.onePortalId
            certifierObject = certifierSchema()
            addressObject = await createAddress()
            certifierObject.address = addressObject
        } catch (error) {
            console.log(error)
        }
    })

    after(async () => {
        await models.Call.destroy({where:{}})
        await models.Person.destroy({where:{}})
        await models.PersonInfo.destroy({where:{}})
        await models.Certifier.destroy({where:{}})
    })

    
    it('should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .post(`${baseUrl}?onePortalId=${OPI}`)
            .send(certifierObject)
            .set('authorization', '')
        res.should.have.status(401);
        res.body.should.have.property('message').and.to.be.equal(`Token not found`)
    })

    it('should respond with error when sent the random OPI', async () => {
        const randomString = faker.random.word()
        const res = await chai.request(server)
            .post(`${baseUrl}?onePortalId=${randomString}`)
            .send(certifierObject)
            .set('authorization', authToken)
        res.should.have.status(404);
        res.body.should.have.property('error').and.to.be.equal(`OnePortalId not found`)
    })

    it('should respond with error when no prefix is sent', async () => {
        const res = await chai.request(server)
            .post(`${baseUrl}?onePortalId=${OPI}`)
            .send(anotherCertifier)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Prefix is required`)
    })
    
    it('should respond with error when no firstName is sent', async () => {
        anotherCertifier.prefix = faker.random.word()
        const res = await chai.request(server)
            .post(`${baseUrl}?onePortalId=${OPI}`)
            .send(anotherCertifier)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`First name is required`)
    })

    it('should respond with error when no lastName is sent', async () => {
        anotherCertifier.firstName = faker.random.word()
        const res = await chai.request(server)
            .post(`${baseUrl}?onePortalId=${OPI}`)
            .send(anotherCertifier)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Last name is required`)
    })

    it('should respond with error when no license Number is sent', async () => {
        anotherCertifier.lastName = faker.random.word()
        const res = await chai.request(server)
            .post(`${baseUrl}?onePortalId=${OPI}`)
            .send(anotherCertifier)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`License number is required`)
    })

    it('should respond with error when no fax number is sent', async () => {
        anotherCertifier.licenseNumber = faker.random.word()
        const res = await chai.request(server)
            .post(`${baseUrl}?onePortalId=${OPI}`)
            .send(anotherCertifier)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Enter a valid fax number of length 10`)
    })

    it('should respond with error when no address object is sent', async () => {
        anotherCertifier.faxNumber = faker.phone.phoneNumberFormat(1)
        const res = await chai.request(server)
            .post(`${baseUrl}?onePortalId=${OPI}`)
            .send(anotherCertifier)
            .set('authorization', authToken)
        res.should.have.status(422);
    })

    it('should respond with error when city Id is string', async () => {
        anotherCertifier.address = {}
        anotherCertifier.address.cityId = faker.random.word()
        const res = await chai.request(server)
            .post(`${baseUrl}?onePortalId=${OPI}`)
            .send(anotherCertifier)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`City Id should be number`)
        anotherCertifier.address.cityId = faker.random.number({ max: 50 })
    })

    it('should respond with error when country Id is string', async () => {
        anotherCertifier.address.countryId = faker.random.word()
        const res = await chai.request(server)
            .post(`${baseUrl}?onePortalId=${OPI}`)
            .send(anotherCertifier)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Country Id should be number`)
        anotherCertifier.address.countryId = faker.random.number({ max: 50 })
    })

    it('should respond with error when county Id is string', async () => {
        anotherCertifier.address.countyId = faker.random.word()
        const res = await chai.request(server)
            .post(`${baseUrl}?onePortalId=${OPI}`)
            .send(anotherCertifier)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`County Id should be number`)
        anotherCertifier.address.countyId = faker.random.number({ max: 50 })
    })

    it('should respond with error when line1 is number', async () => {
        anotherCertifier.address.line1 = faker.random.number()
        const res = await chai.request(server)
            .post(`${baseUrl}?onePortalId=${OPI}`)
            .send(anotherCertifier)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Line1 should be string`)
        anotherCertifier.address.line1 = faker.random.word()
    })

    it('should respond with error when line2 is number', async () => {
        anotherCertifier.address.line2 = faker.random.number()
        const res = await chai.request(server)
            .post(`${baseUrl}?onePortalId=${OPI}`)
            .send(anotherCertifier)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Line2 should be string`)
        anotherCertifier.address.line2 = faker.random.word()
    })

    it('should respond with success when correct object is sent', async () => {
        certifierObject = loweringFirstLetter(certifierObject)
        const res = await chai.request(server)
            .post(`${baseUrl}?onePortalId=${OPI}`)
            .send(certifierObject)
            .set('authorization', authToken)
        res.should.have.status(200);
        chai.assert.containsAllKeys(res.body, certifierObject)
    })

    it('should respond with error when correct object is sent but with the same license number', async () => {
        const res = await chai.request(server)
            .post(`${baseUrl}?onePortalId=${OPI}`)
            .send(certifierObject)
            .set('authorization', authToken)
        res.should.have.status(404);
        res.body.should.have.property('error').and.to.be.equal(`Validation error`)
    })
})
