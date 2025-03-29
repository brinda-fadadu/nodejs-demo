const { chai, server, genAuthToken, addTestUser} = require('../../../helper')
const { getPayorDetails, getPayorById } = require('../../../schema/payments/cardPaymentsSchema')
const faker = require('faker')
let statementId, payorId, authToken, user, reqBody, payor

describe('POST /api/v1/payments/stripe/email', () => {
    before(async () => {        
        statementId = global.statementId
        payorId = global.payorId
        user = await addTestUser()
        authToken = genAuthToken(user)
        payor = await getPayorById(statementId, payorId)
        reqBody = {
            statementId : global.statementId,
            payorId: payor.personId,
            amount: 100,
            email: payor.email
        }
    })

    it('should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .post(`/api/v1/payments/stripe/email`)
            .set('authorization', '')
            .send(reqBody)
        res.should.have.status(401)
    })

    it('should return error message when not sending payorId ', async () => {
        delete reqBody.payorId
        const res = await chai.request(server)
            .post(`/api/v1/payments/stripe/email`)
            .set('authorization', authToken)
            .send(reqBody)        
        res.should.have.status(422)
        reqBody.payorId = payor.personId
    })

    it('should return Error message when not sending statementId', async () => {
        delete reqBody.statementId
        const res = await chai.request(server)
            .post(`/api/v1/payments/stripe/email`)
            .set('authorization', authToken)
            .send(reqBody)        
        res.should.have.status(422)
        reqBody.statementId = statementId        
    })

    it('should return error message when sending invalid payorId', async () => {
        reqBody.payorId = faker.random.alphaNumeric('abc')        
        const res = await chai.request(server)
            .post(`/api/v1/payments/stripe/email`)
            .set('authorization', authToken)
            .send(reqBody)
        res.should.have.status(422)
        reqBody.payorId = payor.personId
    })

    it('Should return 201 status code when sending payment link', async () => {
        reqBody.payorId = payor.personId
        const res = await chai.request(server)
            .post(`/api/v1/payments/stripe/email`)
            .set('authorization', authToken)
            .send(reqBody)
        res.should.have.status(201)
    })
    it('Should return 422 status code when sending payment as negitive number', async () => {
        reqBody.amount = -20
        const res = await chai.request(server)
            .post(`/api/v1/payments/stripe/email`)
            .set('authorization', authToken)
            .send(reqBody)
        res.should.have.status(422)        
        reqBody.amount = 100
    })
})