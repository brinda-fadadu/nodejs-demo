const faker = require('faker')
const models = require('../../../../../models')
const baseUrl = '/api/v1/persons/'
const endUrl = '/anRemainsInfo/transfers'
const {
    chai,
    server,
    addTestUser,
    genAuthToken
} = require('../../../../helper')
const callData = require('../../../../schema/call')
const createCallController = require('../../../../../controllers/Calls/CreateCall/create')
const verifyPersonController = require('../../../../../controllers/Calls/VerifyCall/verifyCall')
const createTransferObj = require('../../../../schema/transfers/createTransfer')
const { createAnremainsInfoTransfer } = require('../../../../../controllers/persons/caseOverview/anRemains/createAnRemainsInfoTransfer')
let user, authToken, callCreated, reqData, decedentIds, callVerification, reasonIds, callReqBody, res, transfers, transferRes
let verifyReqBody = {}


describe('/GET List of transfers of a person', () => {
    before(async () => {
        try {
            user = await addTestUser()
            authToken = await genAuthToken(user)
            callReqBody = await callData.getCallData()
            callCreated = await createCallController.createCall(callReqBody.call)
            decedentIds = callCreated.someOneHasPassed.map(e => {
                return e.decedent.id
            })
            reasonIds = callCreated.someOneHasPassed.map(e => {
                return e.id
            })
            verifyReqBody.params = {}
            verifyReqBody.params.callId = callCreated.Identifier
            verifyReqBody.body = {}
            verifyReqBody.currentUser = {}
            verifyReqBody.currentUser.id = user.id
            verifyReqBody.body.person = {
                "personId": decedentIds[0],
                "userType": "Decedent",
                "reasonId": reasonIds[0]
            }
            //verify the decedent
            callVerification = await verifyPersonController.verifyCall(verifyReqBody)
        } catch (error) {
            console.log(error)
        }
    })
    after(async () => {
        try {
            await models.SomeOnePassed.destroy({ truncate: true })
            await models.Person.destroy({ truncate: true })
            await models.Note.destroy({ truncate: true })
            await models.Call.destroy({ where: {} })
            await models.ContactPerson.destroy({ truncate: true })
            await models.AnRemainsInfo.destroy({ where: {}})
            await models.AnRemainsTransfer.destroy({ where: {}})

        } catch (error) {
            console.log(error)
        }
    })

    it('should return error message if the token is not present', async function () {
        res = await chai.request(server)
        .get(baseUrl  +  decedentIds[0] + endUrl)
        .set("authorization", "")
        res.should.have.status(401)
        res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('should return error message if personId is sent but is not found in database', async () => {
        res = await chai.request(server)
        .get(baseUrl  + faker.random.number() + endUrl)
        .set("authorization", authToken)
        
        res.should.have.status(404)
        res.body.should.have.property('error').and.to.be.equal(`Person not found`)
    })

    it('should return error message if the personId is sent as a string instead of integer', async () => {
        res = await chai.request(server)
        .get(baseUrl  + 'abcd' + endUrl)
        .set("authorization", authToken)
        
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`PersonId must be a integer`)
    })

    it('should return rows as empty array and count as zero if there are no transfers available for that person', async () => {
        res = await chai.request(server)
        .get(baseUrl  + decedentIds[0] + endUrl)
        .set("authorization", authToken)
        
        res.should.have.status(200)
        res.body.should.have.property('data').to.have.nested.property('count').to.be.equal(0)
    })

    it('should return a rows array if the person has transfers associated to him', async () => {

        transfers = await createTransferObj()
        try {
            transferRes = await createAnremainsInfoTransfer(decedentIds[0], transfers, user.id)
        } catch (error) {
            console.log(error)
        }

        res = await chai.request(server)
        .get(baseUrl  + decedentIds[0] + endUrl)
        .set("authorization", authToken)
        
        res.should.have.status(200)
        res.body.should.have.property('data').to.have.nested.property('count').to.be.equal(1)
    })
})

