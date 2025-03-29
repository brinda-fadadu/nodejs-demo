const faker = require('faker')
const models = require('../../../../../models')
const baseUrl = '/api/v1/persons/'
const {
    chai,
    server,
    addTestUser,
    genAuthToken
  } = require('../../../../helper')
const { getEmployees } = require('../../../../../utils/dbGetFunctions')
const callData = require('../../../../schema/call')
const createCallController = require('../../../../../controllers/Calls/CreateCall/create')
const verifyPersonController = require('../../../../../controllers/Calls/VerifyCall/verifyCall')
const { getContactsIdsForAnRemains } = require('../../../../../utils/helpers/getListHelpers')
const createContact = require('../../../../../controllers/persons/contact/createContact')
const { contactHelper } = require('../../../../schema/personContact')
const getAnRemainsInfo = require('../../../../../controllers/persons/caseOverview/anRemains/anRemainsInfo')
let user, authToken, callCreated, reqData, contacts, decedentIds, callVerification, reasonIds, callReqBody, anRemainsInfo, contactHelperObj, contactReqBody, anRemains, embalmerIds, contactIds
let verifyReqBody = {}
let res
let altReq

describe('/PUT Anremains Info', () => {
    before(async () => {
        try {     
            user = await addTestUser()
            authToken = await genAuthToken(user)
            callReqBody = await callData.getCallData()
            callCreated = await createCallController.createCall(callReqBody.call)
            embalmerIds = await getEmployees([4])
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
            //create contacts for the decedent
            contactHelperObj = await contactHelper()
            contactHelperObj.createContactPersonObj.caseRoleId = contactHelperObj.caseRoles['Power of Attorney']
            contactReqBody = {}
            contactReqBody.body = {
                ...contactHelperObj.createContactPersonObj,
                personId: decedentIds[0]
            }
            contactReqBody.CreatedBy = user.id
            contactReqBody.params = {}
            contactReqBody.params.personId = decedentIds[0]
            await createContact(contactReqBody.body)
            contactIds = await getContactsIdsForAnRemains(decedentIds[0])
            anRemainsInfo = await getAnRemainsInfo(decedentIds[0])
            reqData = {
                "embalmingSelfApproved": false,
                "cremationSelfApproved": false,
                "embalmerId": user.id,
                "embalmingapprovedByContactIds": contactIds[0],
                "cremationApprovedByContactIds": contactIds
            }
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
        } catch (error) {
            console.log(error)
        }
    })

    it('should return error message if the token is not present', async function () {
        res = await chai.request(server)
        .put(baseUrl  +  decedentIds[0] + '/anRemainsInfo/' + anRemainsInfo.id)
        .set("authorization", "")
        .send(reqData)
        res.should.have.status(401)
        res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('should return an error message if the person id is sent but is not found in database', async function () {
        altReq = { ...reqData }
        altReq.embalmingSelfApproved = true
        altReq.cremationSelfApproved = true
        delete altReq.embalmingapprovedByContactIds
        delete altReq.cremationApprovedByContactIds
        res = await chai.request(server)
        .put(baseUrl  + faker.random.number() + '/anRemainsInfo/' +  anRemainsInfo.id)
        .set("authorization", authToken)
        .send(altReq)
        res.should.have.status(400)
        res.body.should.have.property('error').and.to.be.equal(`Person not found`)
    })

    it('should return a error message if the anRemainsId is sent but is not found in database', async function () {
        res = await chai.request(server)
        .put(baseUrl  +  decedentIds[0] + '/anRemainsInfo/' + faker.random.number())
        .set("authorization", authToken)
        .send(reqData)
        res.should.have.status(400)
        res.body.should.have.property('error').and.to.be.equal(`Person not found`)
    })

    it('should return a error message of the personId is sent as a string instead of a integer', async function () {
        res = await chai.request(server)
        .put(baseUrl  +  '123' + '/anRemainsInfo/' + anRemainsInfo.id)
        .set("authorization", authToken)
        .send(altReq)
        res.should.have.status(400)
        res.body.should.have.property('error').and.to.be.equal(`Person not found`)
    })

    it('should return a error message if the anRemainsId is sent as a string instead of a integer', async function () {
        res = await chai.request(server)
        .put(baseUrl  +  decedentIds[0] + '/anRemainsInfo/' + '123')
        .set("authorization", authToken)
        .send(reqData)
        res.should.have.status(400)
        res.body.should.have.property('error').and.to.be.equal(`Person not found`)
    })

    it('should return a error message if the embalmingApproved person is not there in the database', async function () {
        reqData.embalmingapprovedByContactIds = [234]
        res = await chai.request(server)
        .put(baseUrl  +  decedentIds[0] + '/anRemainsInfo/' + anRemainsInfo.id)
        .set("authorization", authToken)
        .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Enter valid embalming approved by contact id and it should be a integer`)
    })

    it('should return a error message if the cremation approved person is not present in database', async function () {
        reqData.embalmingapprovedByContactIds = contactIds[0]
        reqData.cremationApprovedByContactIds = [ faker.random.number(),  faker.random.number()]
        res = await chai.request(server)
        .put(baseUrl  +  decedentIds[0] + '/anRemainsInfo/' +  anRemainsInfo.id)
        .set("authorization", authToken)
        .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Enter valid cremation approved by ids`)
    })
    
    it('should return a error if the embalming approved id is sent as a string instead of a integer', async function () {
        reqData.embalmingapprovedByContactIds = '123'
        reqData.cremationApprovedByContactIds = contactIds
        res = await chai.request(server)
        .put(baseUrl  +  decedentIds[0] + '/anRemainsInfo/' +  anRemainsInfo.id)
        .set("authorization", authToken)
        .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Enter valid embalming approved by contact id and it should be a integer`)
    })
    
    it('should return a error if the embalming approved id is sent as an array instead of a single id', async function () {
        reqData.embalmingapprovedByContactIds = contactIds
        reqData.cremationApprovedByContactIds = contactIds
        res = await chai.request(server)
        .put(baseUrl  +  decedentIds[0] + '/anRemainsInfo/' +  anRemainsInfo.id)
        .set("authorization", authToken)
        .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Enter valid embalming approved by contact id and it should be a integer`)

    })

    it('should return a error if the cremation approved is sent as a single integer instead of an array', async function () {
        reqData.embalmingapprovedByContactIds = contactIds[0]
        reqData.cremationApprovedByContactIds = contactIds[0]
        res = await chai.request(server)
        .put(baseUrl  +  decedentIds[0] + '/anRemainsInfo/' +  anRemainsInfo.id)
        .set("authorization", authToken)
        .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Cremation approved by must be an array of integers`)
    })

    it('should return a error if the embalmingSelf approved is true and we still send embalmingApprovedbyContactsId', async function () {
        reqData.embalmingapprovedByContactIds = contactIds[0]
        reqData.cremationApprovedByContactIds = contactIds
        reqData.embalmingSelfApproved = true
        res = await chai.request(server)
        .put(baseUrl  +  decedentIds[0] + '/anRemainsInfo/' +  anRemainsInfo.id)
        .set("authorization", authToken)
        .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`"embalmingapprovedByContactIds" is not allowed`)
    })

    it('should return a error if the cremation self approved is true and we still send the cremation approved by contactIds ids', async function () {
        reqData.embalmingapprovedByContactIds = contactIds[0]
        reqData.cremationApprovedByContactIds = contactIds
        reqData.embalmingSelfApproved = false
        reqData.cremationSelfApproved = true
        res = await chai.request(server)
        .put(baseUrl  +  decedentIds[0] + '/anRemainsInfo/' +  anRemainsInfo.id)
        .set("authorization", authToken)
        .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal( `"cremationApprovedByContactIds" is not allowed`)
    })

    it('should return a error if the cremation self approved and embalming self approved is true and we still send the cremation approved by contactIds ids and embalming approved by ids', async function () {
        reqData.embalmingapprovedByContactIds = contactIds[0]
        reqData.cremationApprovedByContactIds = contactIds
        reqData.cremationSelfApproved = true
        reqData.embalmingSelfApproved = true
        res = await chai.request(server)
        .put(baseUrl  +  decedentIds[0] + '/anRemainsInfo/' +  anRemainsInfo.id)
        .set("authorization", authToken)
        .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal( `"embalmingapprovedByContactIds" is not allowed. "cremationApprovedByContactIds" is not allowed`)
    })

    it('should return a error if the embalmerid is not sent', async function () {
        reqData.embalmingapprovedByContactIds = contactIds[0]
        reqData.cremationApprovedByContactIds = contactIds
        reqData.cremationSelfApproved = false
        reqData.embalmingSelfApproved = false
        delete reqData.embalmerId
        res = await chai.request(server)
        .put(baseUrl  +  decedentIds[0] + '/anRemainsInfo/' +  anRemainsInfo.id)
        .set("authorization", authToken)
        .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal("Embalmer Id is required")
    })

    it('should return a error if the embalmerId is sent as a string instead as a integer', async function () {
        reqData.embalmingapprovedByContactIds = contactIds[0]
        reqData.cremationApprovedByContactIds = contactIds
        reqData.cremationSelfApproved = false
        reqData.embalmingSelfApproved = false
        reqData.embalmerId = '123'
        res = await chai.request(server)
        .put(baseUrl  +  decedentIds[0] + '/anRemainsInfo/' +  anRemainsInfo.id)
        .set("authorization", authToken)
        .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Enter valid embalmer id from [${embalmerIds}]`)
    })

    it('should return a error if the embalmerId is not present in the database', async function () {
        reqData.embalmingapprovedByContactIds = contactIds[0]
        reqData.cremationApprovedByContactIds = contactIds
        reqData.cremationSelfApproved = false
        reqData.embalmingSelfApproved = false
        reqData.embalmerId =  faker.random.number()
        res = await chai.request(server)
        .put(baseUrl  +  decedentIds[0] + '/anRemainsInfo/' +  anRemainsInfo.id)
        .set("authorization", authToken)
        .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Enter valid embalmer id from [${embalmerIds}]`)
    })

    it('should return succes after updating the anRemainsInfo', async function () {
        reqData.embalmingapprovedByContactIds = contactIds[0]
        reqData.cremationApprovedByContactIds = contactIds
        reqData.cremationSelfApproved = false
        reqData.embalmingSelfApproved = false
        reqData.embalmerId =  user.id
        res = await chai.request(server)
        .put(baseUrl  +  decedentIds[0] + '/anRemainsInfo/' +  anRemainsInfo.id)
        .set("authorization", authToken)
        .send(reqData)
        res.should.have.status(200)
    })
})

