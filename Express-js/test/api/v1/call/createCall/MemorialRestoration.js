const {
    chai,
    server,
    addTestUser,
    genAuthToken
} = require('../../../../helper')
let authToken
const { getCallData } = require('../../../../schema/call')
const callerTest = require('./callerTest')
let reqData

describe('POST /api/v1/calls', () => {
    before(async () => {
        const user = await addTestUser()
        authToken = genAuthToken(user);
        await callerTest(4)
        return
    })

    beforeEach(async () => {
       reqData = await getCallData(4)
    })

    after(async () => {
        try {
            await models.Person.destroy({ where: {} })
            await models.Call.destroy({ where: {} })
        } catch (error) {
            console.log('Error:::::')
            console.log(error)
        }
    })

    it('should return an error saying that the grave location should be a string', async () => {
        reqData.call.reason[0].graveLocation = 123
        const res = await chai.request(server)
        .post('/api/v1/calls')
        .set('authorization', authToken)
        .send(reqData)
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`child "call" fails because [child "reason" fails because ["reason" at position 0 fails because [child "graveLocation" fails because ["graveLocation" must be a string]]]]`)
    })

    it('should return an error saying that the grave number should be a string', async () => {
        reqData.call.reason[0].graveNumber = 123
        const res = await chai.request(server)
        .post('/api/v1/calls')
        .set('authorization', authToken)
        .send(reqData)
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`child "call" fails because [child "reason" fails because ["reason" at position 0 fails because [child "graveNumber" fails because ["graveNumber" must be a string]]]]`)
    })

    it('should return an error saying that the reasons are not found', async () => {
        reqData.call.reason[0].reasons = [3,4]
        const res = await chai.request(server)
        .post('/api/v1/calls')
        .set('authorization', authToken)
        .send(reqData)
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`child "call" fails because [child "reason" fails because ["reason" at position 0 fails because [child "reasons" fails because ["reasons" at position 0 does not match any of the allowed types]]]]`)
    })

    it('should return an error saying that the reasons duplication is not allowed', async () => {
        reqData.call.reason[0].reasons = [1, 1]
        const res = await chai.request(server)
        .post('/api/v1/calls')
        .set('authorization', authToken)
        .send(reqData)
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`child "call" fails because [child "reason" fails because ["reason" at position 0 fails because [child "reasons" fails because ["reasons" position 1 contains a duplicate value]]]]`)
    })

    it('should create the call with memorial restoration successfully', async () => {
        reqData.call.reason[0].reasons = [1, 2]
        const res = await chai.request(server)
        .post('/api/v1/calls')
        .set('authorization', authToken)
        .send(reqData)
        res.should.have.status(200)
    })

})