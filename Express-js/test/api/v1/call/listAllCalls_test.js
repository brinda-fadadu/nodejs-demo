// TODO: Need to fix testcase to have determinstic behaviour 
const {
    chai,
    server,
    expect,
    addTestUser,
    genAuthToken
} = require("../../../helper")
const models = require('../../../../models/index')
const { getCallData, createCallData } = require('../../../schema/call')

let authToken, queries
let createdCall

describe('List all calls test case', () => {
    before(async () => {
        const user = await addTestUser()
        authToken = genAuthToken(user);
        for (let index = 0; index < 10; index++) {
            const responseObject = await getCallData()
            if (index === 9) {
                responseObject.call.caller.firstName = 'gTest'
                responseObject.call.caller.phone = '9876543210'
                responseObject.call.caller.email = 'g@example.com'
            }
            createdCall = await createCallData(responseObject.call)
        }
        return
    })

    after(async () => {
        try {
            await models.Call.destroy({ where: {} })
        } catch (error) {
            console.log(error);
        }
    })

    it('should return error message if the token is not present', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/calls/`)
            .set("authorization", "")
            res.body.should.have.property('message').and.to.be.equal("Token not found");
    })
    
    it('should return list of all calls without filtering', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/calls/?page=1&limit=10`)
            .set("authorization", authToken)
            res.body.should.have.property('success').and.to.be.equal(true);
            res.body.should.have.property('data').and.to.have.property('list').and.to.be.a('array').and.to.have.length(10)
    })

    it('should return list of all calls with empty array on calling page 2 and limit 10', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/calls/?page=2&limit=10`)
            .set("authorization", authToken)
            res.body.should.have.property('success').and.to.be.equal(true);
            res.body.should.have.property('data').and.to.have.property('list').and.to.be.a('array').and.to.have.length(0)
    })

    it('should return list of all calls with array of 10 items on calling status 1 and 2', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/calls/?page=1&limit=10&status[]=1&status[]=2`)
            .set("authorization", authToken)
            res.body.should.have.property('success').and.to.be.equal(true);
            res.body.should.have.property('data').and.to.have.property('list').and.to.be.a('array').and.to.have.length(10)
    })

    it('should return list of all calls with array of 0 items on calling status 2 only', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/calls/?page=1&limit=10&status[]=2`)
            .set("authorization", authToken)
            res.body.should.have.property('success').and.to.be.equal(true);
            res.body.should.have.property('data').and.to.have.property('list').and.to.be.a('array').and.to.have.length(0)
    })

    it('should return list of all calls with array of 10 items on calling reason 1 and 2', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/calls/?page=1&limit=10&reason[]=1&reason[]=2`)
            .set("authorization", authToken)
            res.body.should.have.property('success').and.to.be.equal(true);
            res.body.should.have.property('data').and.to.have.property('list').and.to.be.a('array').and.to.have.length(10)
    })

    it('should return list of all calls with array of 0 items on calling reason 2 only', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/calls/?page=1&limit=10&reason[]=2`)
            .set("authorization", authToken)
            res.body.should.have.property('success').and.to.be.equal(true);
            res.body.should.have.property('data').and.to.have.property('list').and.to.be.a('array').and.to.have.length(0)
    })

    it('should return list of all calls with array of 10 items on calling received Location 1 & 2', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/calls/?page=1&limit=10&locationIds[]=1&locationIds[]=2`)
            .set("authorization", authToken)
            res.body.should.have.property('success').and.to.be.equal(true);
            res.body.should.have.property('data').and.to.have.property('list').and.to.be.a('array').and.to.have.length(10)
    })

    it('should return list of all calls with array of 0 items on calling received Location 2 only', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/calls/?page=1&limit=10&locationIds[]=2`)
            .set("authorization", authToken)
            res.body.should.have.property('success').and.to.be.equal(true);
            res.body.should.have.property('data').and.to.have.property('list').and.to.be.a('array').and.to.have.length(0)
    })

    it('should return list of all calls with array of 1 item on calling name as Test', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/calls/?page=1&limit=10&callerName=Test`)
            .set("authorization", authToken)
            res.body.should.have.property('success').and.to.be.equal(true);
            res.body.should.have.property('data').and.to.have.property('list').and.to.be.a('array').and.to.have.length(1)
    })

    it('should return list of all calls with array of 1 item on calling phone number', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/calls/?page=1&limit=10&contactNo=9876543210`)
            .set("authorization", authToken)
            res.body.should.have.property('success').and.to.be.equal(true);
            res.body.should.have.property('data').and.to.have.property('list').and.to.be.a('array').and.to.have.length(1)
    })

    it('should return list of all calls with array of 1 item on calling call id', async function () {
        const res = await chai.request(server)
            .get(`/api/v1/calls/?page=1&limit=10&callId=${createdCall.Identifier}`)
            .set("authorization", authToken)
            res.body.should.have.property('success').and.to.be.equal(true);
            res.body.should.have.property('data').and.to.have.property('list').and.to.be.a('array').and.to.have.length(1)
    })
        
})



