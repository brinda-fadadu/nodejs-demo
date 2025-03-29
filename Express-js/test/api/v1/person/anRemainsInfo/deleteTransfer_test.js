const faker = require('faker')
const models = require('../../../../../models')
const baseUrl = '/api/v1/persons/'
const {
    chai,
    server,
    addTestUser,
    genAuthToken
} = require('../../../../helper')
const { getCallData } = require('../../../../schema/call')
const createCallController = require('../../../../../controllers/Calls/CreateCall/create')
const verifyPersonController = require('../../../../../controllers/Calls/VerifyCall/verifyCall')
const createTransferObj = require('../../../../schema/transfers/createTransfer')
const { createAnremainsInfoTransfer } = require('../../../../../controllers/persons/caseOverview/anRemains/createAnRemainsInfoTransfer')
const getAnRemainsInfo = require('../../../../../controllers/persons/caseOverview/anRemains/anRemainsInfo')
let user, authToken, callCreated, reqData, decedentIds, callVerification, reasonIds, callReqBody, res, transfers, transferRes, anRemainsInfo
let verifyReqBody = {}

describe('/delete a transfer of a person', () => {
    before(async () => {
        try {
            user = await addTestUser()
            authToken = await genAuthToken(user)
            callReqBody = await getCallData()
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
            anRemainsInfo = await getAnRemainsInfo(decedentIds[0])
            transfers = await createTransferObj()
            transferRes = await createAnremainsInfoTransfer(decedentIds[0], transfers, user.id)
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
            await models.Contact.destroy({ truncate: true })
            await models.ContactPerson.destroy({ truncate: true })
            await models.AnRemainsInfo.destroy({ where: {}})
            await models.AnRemainsTransfer.destroy({ where: {}})
        } catch (error) {
            console.log(error)
        }
    })

    it('should return error message if the token is not present', async function () {
        res = await chai.request(server)
        .delete(baseUrl  + decedentIds[0] + '/anRemainsinfo/transfers/' + transferRes.Identifier)
        .set("authorization", "")
        res.should.have.status(401)
        res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('should return error message if personId is sent but is not found in database', async () => {
        res = await chai.request(server)
        .delete(baseUrl  + faker.random.number() + '/anRemainsinfo/transfers/' + transferRes.Identifier)
        .set("authorization", authToken)
        
        res.should.have.status(400)
        res.body.should.have.property('error').and.to.be.equal(`Person not found`)
    })

    it('should return error message if the personId is sent as a string instead of integer', async () => {
        res = await chai.request(server)
        .delete(baseUrl  + "123" + '/anRemainsinfo/transfers/' + transferRes.Identifier)
        .set("authorization", authToken)
        
        res.should.have.status(400)
        res.body.should.have.property('error').and.to.be.equal(`Person not found`)
    })

    it('should return error message if transferId is sent but is not found in database', async () => {
        res = await chai.request(server)
        .delete(baseUrl  + decedentIds[0] + '/anRemainsinfo/transfers/' + faker.random.number())
        .set("authorization", authToken)
        
        res.should.have.status(400)
        res.body.should.have.property('error').and.to.be.equal(`Transfer can not be deleted`)
    })

    it('should return error message if the transferId is sent as a string instead of integer', async () => {
        res = await chai.request(server)
        .delete(baseUrl  + anRemainsInfo.id + '/anRemainsinfo/transfers/' + "wedw")
        .set("authorization", authToken)
        
        res.should.have.status(400)
        res.body.should.have.property('error').and.to.be.equal(`Person not found`)
    })

    it('should return error message if the transfer is complete because completed transfers can not be deleted', async () => {
        res = await chai.request(server)
        .delete(baseUrl  + anRemainsInfo.id + '/anRemainsinfo/transfers/' +transferRes.Identifier)
        .set("authorization", authToken)
        
        res.should.have.status(400)
        res.body.should.have.property('error').and.to.be.equal(`Transfer can not be deleted`)
    })

    it('should return success message if the transfer is deleted successfully', async () => {
        res = await chai.request(server)
        .delete(baseUrl  + anRemainsInfo.id + '/anRemainsinfo/transfers/' + transferRes.Identifier)
        .set("authorization", authToken)
        
        res.should.have.status(200)
        res.body.should.have.property('data').and.to.be.equal(`Transfer has been deleted successfully`)

    })
})

