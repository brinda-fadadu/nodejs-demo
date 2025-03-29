const {
    chai,
    server,
    addTestUser,
    genAuthToken
} = require('../../../../helper')
let authToken, reqData
const models = require('../../../../../models/index')
const { getCallData } = require('../../../../schema/call')
const callerTest = require('./callerTest')


describe('POST /api/v1/calls', () => {
    before(async () => {
        const user = await addTestUser()
        authToken = genAuthToken(user);
        await callerTest(6)
        return
    })

    beforeEach(async () => {
        reqData = await getCallData(6)
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

    it('should successfully create a call for genealogy search reason', async () => {
        const res = await chai.request(server)
        .post('/api/v1/calls')
        .set('authorization', authToken)
        .send(reqData)
        res.should.have.status(201);
    })

    it ('should respond with an error saying that email is not valid', async () => {
        reqData.call.reason.forEach(e => e.email = "non-email")
        const res = await chai.request(server)
        .post('/api/v1/calls')
        .set('authorization', authToken)
        .send(reqData)
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`child \"call\" fails because [child \"reason\" fails because [\"reason\" at position 0 fails because [child \"email\" fails because [\"email\" must be a valid email]]]]`)
    })

    it ('should respond with an error saying that otherReasonFollowUps is required when isFollowUpRequired', async () => {
        reqData.call.reason.forEach(e => delete e.otherReasonFollowUps)
        const res = await chai.request(server)
        .post('/api/v1/calls')
        .set('authorization', authToken)
        .send(reqData)
        res.should.have.status(422);
        res.body.should.have.property('message').and.to.be.equal(`child \"call\" fails because [child \"reason\" fails because [\"reason\" at position 0 fails because [child \"otherReasonFollowUps\" fails because [\"Value must contain array with one item when \"IsFollowUpRequired\" is true\" is required]]]]`)
    })

})
