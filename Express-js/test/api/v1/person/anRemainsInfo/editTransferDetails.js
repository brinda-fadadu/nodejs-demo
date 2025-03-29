const {
    chai,
    server,
    addTestUser,
    genAuthToken,   
    verifyPerson,
    getLocations,
} = require('../../../../helper')

const faker = require('faker')
const _ = require('underscore')
const {getCallData, createCallData, getOrganizationData} = require('../../../../schema/call')
const seedData = require('../../../../../config/seed').seed
const { createAnremainsInfoTransfer } = require('../../../../../controllers/persons/caseOverview/anRemains/createAnRemainsInfoTransfer')
let   authToken,personId, transferData, transferLocationTypes, transferTypes, locations, transferDetails


describe('Edit transfer details', async () => {    
    before(async () => {
        try {
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
                userType:'Decedent',
                reasonId: callResponse.someOneHasPassed[0].id
            }
            const verificationResult = await verifyPerson(verifyData)
            console.log('Verification completed :::::::::')
                transferTypes = _.invert(seedData.TransferType)
                transferLocationTypes = _.invert(seedData.TransferLocationTypes)
                console.log(transferLocationTypes)
            transferData = {
                primaryDriverId: faker.random.number({ min: 1, max: 9 }),
                secondaryDriverId: faker.random.number({ min: 1, max: 9 }),
                fromLocationTypeId: Number(transferLocationTypes['Organization']),
                toLocationTypeId: Number(transferLocationTypes['Location']),
                fromLocation: await getOrganizationData(),
                toLocation: Number(locations['Product Name Cremation Society']),
                isTransferCompleted: false,
                isTransferReady: true,
                transferType: Number(transferTypes['Transfer In']),
                neededByDateTime: faker.date.recent(),
                transferDateTime: faker.date.recent()
            }
            transferDetails = await createAnremainsInfoTransfer(personId, transferData, user.id)
            console.log(transferDetails)
        } catch (error) {
            console.log(error);
        }
    })

    it('1 Should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .put(`/api/v1/persons/${personId}/anRemainsInfo/transfers/${transferDetails.Identifier}`)
            .set('authorization', '')
            .send(transferData)
        res.should.have.status(401);
    })

    it('2 Should return status code 422 without request data', async () => {
        const res = await chai.request(server)
            .put(`/api/v1/persons/${personId}/anRemainsInfo/transfers/${transferDetails.Identifier}`)
            .set('authorization', authToken)
            .send()
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`Input required`)
    })

    it('3 Should return error when primaryDriverId is not given in input', async () => {
        delete transferData.primaryDriverId
        const res = await chai.request(server)
            .put(`/api/v1/persons/${personId}/anRemainsInfo/transfers/${transferDetails.Identifier}`)
            .set('authorization', authToken)
            .send(transferData)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`child "primaryDriverId" fails because ["primaryDriverId" is required]`)
    })

    it('4 Should return error when invalid primaryDriverId is given in input', async () => {
        transferData.primaryDriverId = 'abcd'
        const res = await chai.request(server)
            .put(`/api/v1/persons/${personId}/anRemainsInfo/transfers/${transferDetails.Identifier}`)
            .set('authorization', authToken)
            .send(transferData)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`child "primaryDriverId" fails because ["primaryDriverId" must be a number]`)
    })

    it('5 Should return error when invalid secondaryDriverId is given in input', async () => {
        transferData.primaryDriverId = 1
        transferData.secondaryDriverId = 'abcd'
        const res = await chai.request(server)
            .put(`/api/v1/persons/${personId}/anRemainsInfo/transfers/${transferDetails.Identifier}`)
            .set('authorization', authToken)
            .send(transferData)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`child "secondaryDriverId" fails because ["secondaryDriverId" must be a number]`)
    })

    it('6 Should return error when invalid fromLocationTypeId is given in input', async () => {
        transferData.secondaryDriverId = 1
        transferData.fromLocationTypeId = 0
        const res = await chai.request(server)
            .put(`/api/v1/persons/${personId}/anRemainsInfo/transfers/${transferDetails.Identifier}`)
            .set('authorization', authToken)
            .send(transferData)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Location type must either Organization, Residence, Location`)
    })

    it('7 Should return error when invalid toLocationTypeId is given in input', async () => {
        transferData.fromLocationTypeId = 2
        transferData.toLocationTypeId = 0
        const res = await chai.request(server)
            .put(`/api/v1/persons/${personId}/anRemainsInfo/transfers/${transferDetails.Identifier}`)
            .set('authorization', authToken)
            .send(transferData)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Location type must either Organization, Residence, Location`)
    })

    it('8 Should return error when invalid transferType is given in input', async () => {
        transferData.toLocationTypeId = 1
        transferData.transferType = 'abcd'
        const res = await chai.request(server)
            .put(`/api/v1/persons/${personId}/anRemainsInfo/transfers/${transferDetails.Identifier}`)
            .set('authorization', authToken)
            .send(transferData)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Transfer type value is invalid`)
    })

    it('9 Should return error when fromLocation is not given in input', async () => {
        delete transferData.fromLocation
        transferData.transferType = Number(transferTypes['Transfer In'])
        const res = await chai.request(server)
            .put(`/api/v1/persons/${personId}/anRemainsInfo/transfers/${transferDetails.Identifier}`)
            .set('authorization', authToken)
            .send(transferData)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`From location is required`)
    })

    it('10 Should return error when toLocation is not given in input', async () => {
        delete transferData.toLocation
        transferData.fromLocation = await getOrganizationData()
        const res = await chai.request(server)
            .put(`/api/v1/persons/${personId}/anRemainsInfo/transfers/${transferDetails.Identifier}`)
            .set('authorization', authToken)
            .send(transferData)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`To location is required`)
    })

    it('11 Should return success when valid input is given', async () => {
        transferData.toLocation = Number(locations['Product Name Cremation Society'])
        const res = await chai.request(server)
            .put(`/api/v1/persons/${personId}/anRemainsInfo/transfers/${transferDetails.Identifier}`)
            .set('authorization', authToken)
            .send(transferData)
        res.should.have.status(200);
        res.body.should.have.property('success').to.equal(true);
    })
})
