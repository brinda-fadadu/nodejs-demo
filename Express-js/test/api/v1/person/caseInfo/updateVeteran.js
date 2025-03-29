const {
    chai,
    server,
    addTestUser,
    genAuthToken,
} = require('../../../../helper')  //Please change the helper path if required
const models = require('../../../../../models/index')
const faker = require('faker')
const { personInfoSchema, veteranSchema } = require('../../../../schema/personInfo')
const personSchema = require('../../../../schema/person')
const loweringCapital = require('../../../../../utils/loweringFirstLetter')

const baseUrl = '/api/v1/persons'
let opi = ''
let veteranObj = {}
let createdPerson = {}
let createdPersonInfo = {}
let updatedPersonInfo = {}

describe('PUT /api/v1/persons/:onePortalId/veteran-info', () => {

    before(async () => {
        try {
            user = await addTestUser()
            authToken = genAuthToken(user);
            const personObj = await personSchema()
            veteranObj = loweringCapital(veteranSchema())
            const personInfoObj = personInfoSchema()
            createdPerson = await models.Person.create(personObj)
            opi = createdPerson.onePortalId
            personInfoObj.veteranId = null
            personInfoObj.personId = createdPerson.id
            createdPersonInfo = await models.PersonInfo.create(personInfoObj)
        } catch (error) {
            console.log(error);
        }
    })

    after(async () => {
        try {
            await models.Person.destroy({ truncate: true })
            await models.Veteran.destroy({ truncate: true })
            await models.PersonInfo.destroy({ truncate: true })
        } catch (error) {
            console.log(error)
        }
    })

    it('should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/veteran-info`)
            .send(veteranObj)
            .set('authorization', '')
        res.should.have.status(401);
    })

    it('should return error of invalid OPI', async () => {
        const randomString = faker.random.word()
        const res = await chai.request(server)
            .put(`${baseUrl}/${randomString}/veteran-info`)
            .send(veteranObj)
            .set('authorization', authToken)
        res.should.have.status(404);
        res.body.should.have.property('error').and.to.be.equal(`OnePortalId not found`)
    })

    it('should return error of isUnknown required', async () => {
        const randomBoolean = faker.random.boolean()
        delete veteranObj.isUnknown
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/veteran-info`)
            .send(veteranObj)
            .set('authorization', authToken)
        veteranObj.isUnknown = randomBoolean
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`isUnknown is mandatory / not valid`)
    })

    it('should return error of isUnknown not valid', async () => {
        const randomBoolean = faker.random.boolean()
        veteranObj.isUnknown = faker.random.word()
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/veteran-info`)
            .send(veteranObj)
            .set('authorization', authToken)
        veteranObj.isUnknown = randomBoolean
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`isUnknown is mandatory / not valid`)
    })

    it('should return error of service branch id not valid when sending a string', async () => {
        const randomString = faker.random.word()
        veteranObj.serviceBranchId = randomString
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/veteran-info`)
            .send(veteranObj)
            .set('authorization', authToken)
        veteranObj.serviceBranchId = faker.random.number()
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Service Branch Id is not valid`)
    })

    it('should return error of service branch id not valid when sending a number less than 0', async () => {
        const negativeNumber = faker.random.number({ max: -1 })
        veteranObj.serviceBranchId = negativeNumber
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/veteran-info`)
            .send(veteranObj)
            .set('authorization', authToken)
        veteranObj.serviceBranchId = faker.random.number()
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Service Branch Id is not valid`)
    })

    it('should return object after the creation of the veteran for the first time', async () => {
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/veteran-info`)
            .send(veteranObj)
            .set('authorization', authToken)
        updatedPersonInfo = await models.PersonInfo.findOne({
            where: {
                PersonId: createdPerson.id
            }
        })
        res.should.have.status(200);
        chai.assert.equal(createdPersonInfo.VeteranId, null, 'veteranId is null')
        chai.assert.equal(updatedPersonInfo.VeteranId, res.body.id, 'veteranId is equal to the response id')
        chai.assert.containsAllKeys(res.body, ['id', 'serviceBranchId', 'serviceEra', 'isUnknown'])
    })


    it('should return success object after updating the service era', async () => {
        const randomString = faker.random.word()
        veteranObj.serviceEra = randomString
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/veteran-info`)
            .send(veteranObj)
            .set('authorization', authToken)
        res.should.have.status(200);
        chai.assert.equal(updatedPersonInfo.VeteranId, res.body.id, 'veteranId is equal to the response id')
        chai.assert.equal(res.body.serviceEra, randomString, 'serviceEra should be equal to the response serviceEra')
    })

    it('should return success object after updating the service branch id', async () => {
        const randomNumber = faker.random.number()
        veteranObj.serviceBranchId = randomNumber
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/veteran-info`)
            .send(veteranObj)
            .set('authorization', authToken)
        res.should.have.status(200);
        chai.assert.equal(updatedPersonInfo.VeteranId, res.body.id, 'veteranId is equal to the response id')
        chai.assert.equal(res.body.serviceBranchId, randomNumber, 'serviceBranchId should be equal to the response serviceBranchId')
    })

    it('should return success object after updating the isUnknown', async () => {
        const randomBoolean = faker.random.boolean()
        veteranObj.isUnknown = randomBoolean
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/veteran-info`)
            .send(veteranObj)
            .set('authorization', authToken)
        res.should.have.status(200);
        chai.assert.equal(updatedPersonInfo.VeteranId, res.body.id, 'veteranId is equal to the response id')
        chai.assert.equal(res.body.isUnknown, randomBoolean, 'isUnknown should be equal to the response isUnknown')
    })
})