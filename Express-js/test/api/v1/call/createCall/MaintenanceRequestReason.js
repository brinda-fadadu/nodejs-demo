const {
    chai,
    server,
    addTestUser,
    genAuthToken,
    getMaintenanceTypes
} = require('../../../../helper')
const callerTest = require('./callerTest')
const models = require('../../../../../models')
const { getCallData } = require('../../../../schema/call')
const faker = require('faker')
const baseUrl = '/api/v1/calls'
let authToken, user, reqData, maintenanceTypes

describe('/POST Create Call - Maintenance Request Reason', function () {
    before(async () => {
        try {
            user = await addTestUser()
            authToken = await genAuthToken(user)
            maintenanceTypes = await getMaintenanceTypes()
            await callerTest(3)
            return
        } catch (err) {
            console.log('Error:::::')
            console.log(err)
            process.exit()
        }
    })

    after(async () => {
        try {
            await models.MaintenanceRequestReason.destroy({ where: {} })
            await models.Person.destroy({ where: {} })
            await models.Call.destroy({ where: {} })
        } catch (error) {
            console.log('Error:::::')
            console.log(error)
        }
    })

    beforeEach(async () => {
        reqData = await getCallData(3)
    })

    it('should respond with error message if we did"nt pass serviceLocation', async () => {
        delete reqData.call.reason[0].serviceLocation
        const res = await chai.request(server)
            .post(baseUrl)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal('Service Location is required')
    })

    it('should respond with error message if we did"nt pass reasons', async () => {
        delete reqData.call.reason[0].reasons
        const res = await chai.request(server)
            .post(baseUrl)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal('Reasons is required')
    })

    it('should respond with error message if we pass serviceLocation with only special characters', async () => {
        reqData.call.reason[0].serviceLocation = '!@#$%^&*()'
        const res = await chai.request(server)
            .post(baseUrl)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal('Only special characters are not allowed in Service Location')
    })

    it('should respond with error message if we pass reasons which are not present in database', async () => {
        reqData.call.reason[0].reasons = [Object.keys(maintenanceTypes).length + 1]
        const res = await chai.request(server)
            .post(baseUrl)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('message').and.to.be.equal('Enter a valid and existing maintenanceTypeIds from ' + maintenanceTypes)
    })

    it('should respond with success message and creates maintenance search call', async () => {
        const res = await chai.request(server)
            .post(baseUrl)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(201)
        res.body.should.have.property('success').and.to.be.equal(true)
        res.body.should.have.property('call').to.be.an('object')
        res.body.call.should.have.property('identifier').to.be.a('string')
    })
});