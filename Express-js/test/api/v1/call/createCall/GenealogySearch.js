const {
    chai,
    server,
    addTestUser,
    genAuthToken,
} = require('../../../../helper')
const models = require('../../../../../models')
const moment = require('moment')
const faker = require('faker')
const baseUrl = '/api/v1/calls'
const { getCallData } = require('../../../../schema/call')
const callerTest = require('./callerTest')
let authToken, user, reqData

async function apiCall() {
    return chai.request(server)
    .post(baseUrl)
    .set('authorization', authToken)
    .send(reqData)
}

describe('/POST Create Call - GenealogySearch', function () {
    before(async () => {
        try {
            user = await addTestUser()
            authToken = await genAuthToken(user)
            await callerTest(5)
            return
        } catch (err) {
            console.log('Error:::::')
            console.log(err)
            process.exit()
        }
    })

    after(async () => {
        try {
            await models.GeneologySearchReason.destroy({ where: {} })
            await models.Person.destroy({ where: {} })
            await models.Call.destroy({ where: {} })
        } catch (error) {
            console.log('Error:::::')
            console.log(error)
        }
    })

    beforeEach(async () => {
        reqData = await getCallData(5)
    })

    it('should respond with error message if we pass prefix as number', async () => {
        reqData.call.reason.forEach(e => e.decedent.prefix = faker.random.number())
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message')
    })

    it('should respond with error message if we pass decedent firstName as empty string', async () => {
        reqData.call.reason.forEach(e => e.decedent.firstName = "")
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal('First Name is required')
    })

    it('should respond with error message if we pass lastName as number', async () => {
        reqData.call.reason.forEach(e => e.decedent.lastName = faker.random.number())
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message')
    })

    it('should respond with error message if we pass middleName as number', async () => {
        reqData.call.reason.forEach(e => e.decedent.middleName = faker.random.number())
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message')
    })

    it('should respond with error message if we pass dateOfBirth greater than dateOfDeath', async () => {
        reqData.call.reason.forEach(e => {
            e.decedent.dateOfBirth = moment().format('MM/DD/YYYY')
        })
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal('Date of Death must be greater than Date of Birth')
    })

    it('should respond with error message if we pass isVerified as number', async () => {
        reqData.call.reason.forEach(e => e.decedent.isVerified = faker.random.number())
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message')
    })

    it('should respond with error message if we pass relationshipName as number', async () => {
        reqData.call.reason.forEach(e => e.decedent.relationshipName = faker.random.number())
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message')
    })

    it('should respond with error message if we pass relationShipId is not found in database', async () => {
        reqData.call.reason.forEach(e => {
            if (e.decedent.relationshipId) {
                e.decedent.relationshipId = faker.random.number()
            }
        })
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal('Invalid relationshipId')
    })

    it('should respond with error message if we pass isNok as string', async () => {
        reqData.call.reason.forEach(e => {
            if (e.isNok) {
                e.isNok = "test"
            }
        })
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal('Boolean values are allowed')
    })

    it('should respond with error message if we pass arrangerEmail as text', async () => {
        reqData.call.reason.forEach(e => e.arrangerEmail = faker.random.word())
        const res = await apiCall()
        res.should.have.status(422)
        res.body.should.have.property('message')
    })

    it('should respond with success message and creates genealogy search call', async () => {
        const res = await apiCall()
        res.should.have.status(201)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('call').to.be.an('object')
        res.body.call.should.have.property('identifier').to.be.a('string')
    })
});