const {
    chai,
    server,
    expect,
    addTestUser,
    genAuthToken,
    verifyPerson,
    createArrangementWithData,
    getServicesList,
    createStatementForArrangement,
    getLocations,
    getOrganizationTypes
} = require('../../../../helper')  //Please change the helper path if required


const moment = require('moment')
const faker = require('faker')
const _ = require('underscore')
const { getCallData, createCallData, getOrganizationData } = require('../../../../schema/call') 	// Please check this path from your file path
const seedData = require('../../../../../config/seed').seed
const models = require('../../../../../models')
let authToken, personId, transferData, transferLocationTypes, transferTypes, locations


describe('Add transfer details', async () => {
    before(async () => {
        const user = await addTestUser()
        const atNeedCallData = await getCallData()
        locations = await getLocations()
        authToken = await genAuthToken(user)

        atNeedCallData.call.userId = user.id
        const callResponse = await createCallData(atNeedCallData.call)
        personId = callResponse.someOneHasPassed[0].decedentId
        const verifyData = {
            callId: callResponse.identifier,
            personId: callResponse.someOneHasPassed[0].decedentId,
            currentUserId: user.id,
            userType: 'Decedent',
            reasonId: callResponse.someOneHasPassed[0].id
        }
        const verificationResult = await verifyPerson(verifyData)
        transferTypes = _.invert(seedData.TransferType)
        transferLocationTypes = _.invert(seedData.TransferLocationTypes)

        transferData = {
            primaryDriverId: faker.random.number({ min: 1, max: 9 }),
            secondaryDriverId: faker.random.number({ min: 1, max: 9 }),
            fromLocationTypeId: Number(transferLocationTypes['Organization']),
            toLocationTypeId: Number(transferLocationTypes['Location']),
            fromLocation: await getOrganizationData(),
            toLocation: Number(locations['Cremation Society']),
            isTransferCompleted: false,
            isTransferReady: true,
            transferType: Number(transferTypes['Transfer In']),
            neededByDateTime: faker.date.recent(),
            transferDateTime: faker.date.recent()
        }
    })

    after(async () => {
        await models.Call.destroy({where:{}})
        await models.Person.destroy({where:{}})
        await models.AnRemainsInfo.destroy({where:{}})
        await models.AnRemainsTransfer.destroy({where:{}})
    })

    beforeEach(async () => {

    })

    afterEach(async () => {

    })
    //TODO: Rewrite the test cases once we defined sub services, Statement creation, Cemetery contract creation
    it('Created Transfer from an Organization to the location', async () => {
        let response = await chai.request(server)
            .post(`/api/v1/persons/${personId}/anRemainsInfo/transfers`)
            .set('Authorization', authToken)
            .send(transferData)
        response.should.have.status(201)
    })

    it('Create a transfer from location to the Out Organization', async () => {
        transferData.fromLocationTypeId = Number(transferLocationTypes['Location'])
        transferData.toLocationTypeId = Number(transferLocationTypes['Organization'])
        transferData.fromLocation = locations['Cremation Society']
        transferData.toLocation = await getOrganizationData()

        let response = await chai.request(server)
            .post(`/api/v1/persons/${personId}/anRemainsInfo/transfers`)
            .set('Authorization', authToken)
            .send(transferData)
        response.should.have.status(201)
    })

    it('Send request with invalid from Location Type', async () => {
        transferData.fromLocationTypeId = 6
        let response = await chai.request(server)
            .post(`/api/v1/persons/${personId}/anRemainsInfo/transfers`)
            .set('Authorization', authToken)
            .send(transferData)
        response.should.have.status(422)
        response.body.should.have.property('error').and.to.be.equal('Location type must either Organization, Residence, Location')
    })

    it('should respond with error when primaryDriver id is sent as string', async () => {
        transferData.primaryDriverId = faker.random.word()
        let response = await chai.request(server)
            .post(`/api/v1/persons/${personId}/anRemainsInfo/transfers`)
            .set('Authorization', authToken)
            .send(transferData)
        response.should.have.status(422)
        response.body.should.have.property('error').and.to.be.equal('Primary driver information is required and only number allows')
        transferData.primaryDriverId = faker.random.number({ min: 1, max: 9 })
    })

    it('should respond with error when secondary id is sent as string', async () => {
        transferData.secondaryDriverId = faker.random.word()
        let response = await chai.request(server)
            .post(`/api/v1/persons/${personId}/anRemainsInfo/transfers`)
            .set('Authorization', authToken)
            .send(transferData)
        response.should.have.status(422)
        response.body.should.have.property('error').and.to.be.equal('Only number allows for secondary driver ')
        transferData.secondaryDriverId = faker.random.number({ min: 1, max: 9 })
    })
})
