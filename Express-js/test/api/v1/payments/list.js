/**
 * Returns list of payments that made for a statement. 
 * Provides filters based on payorId 
 * This list proivdes all types of payments such as Cash, Check, Moneyorder and card payments
 */
const {
    chai,
    server
} = require('../../../helper')
const faker = require('faker')
const should = require('chai').should();
let statementId, payorId, authToken, serviceUrl

describe('', () => {
    before(async () => {
        authToken = global.userToken
        statementId = global.statement.id
        payorId = global.statement.payorWithPayment.personId
        serviceUrl = '/api/v1/payments'
    })

    it('Check for authenticate token', async () => {
        const res = await chai.request(server)
            .get(`${serviceUrl}`)
            .query({ statementId: statementId})
            res.status.should.equal(401)
    })

    it('Check for statementId. Should return 422 status', async () => {
        const res = await chai.request(server)
            .get(`${serviceUrl}`)
            .set('authorization', authToken)
            .query({ })
            res.status.should.equal(422)
    })

    it('Send string value for statementId. Should return 422 status', async () => {
        const res = await chai.request(server)
            .get(`${serviceUrl}`)
            .set('authorization', authToken)
            .query({statement: faker.random.word() })
            res.status.should.equal(422)
    })

    it('Send string value for payorId. Should return 422 status', async () => {
        const res = await chai.request(server)
            .get(`${serviceUrl}`)
            .set('authorization', authToken)
            .query({statementId: statementId, payorId: faker.random.word() })
            res.status.should.equal(422)
    })

    it('Send string value for payorId. Should return 422 status', async () => {
        const res = await chai.request(server)
            .get(`${serviceUrl}`)
            .set('authorization', authToken)
            .query({statementId: statementId, payorId: faker.random.word() })
            res.status.should.equal(422)
    })
    it('Must return list of payments.', async () => {        
        const res = await chai.request(server)
            .get(`${serviceUrl}`)
            .set('authorization', authToken)
            .query({statementId: statementId, payorId: payorId })
            res.status.should.equal(200)            
    })

    it('It must return payor as null or undefined when you are sending payorId', async () => {
        const res = await chai.request(server)
            .get(`${serviceUrl}`)
            .set('authorization', authToken)
            .query({statementId: statementId, payorId: payorId })
            res.status.should.equal(200)
            should.not.exist(res.body.payments[0].payor)
    })

    it('It must return payor as object when we are not sending payorId', async () => {
        const res = await chai.request(server)
            .get(`${serviceUrl}`)
            .set('authorization', authToken)
            .query({statementId: statementId })
            res.status.should.equal(200)            
            res.body.payments[0].payor.should.be.an('object')
    })
})