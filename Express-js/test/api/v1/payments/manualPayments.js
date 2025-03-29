const {
    chai,
    server
} = require('../../../helper')
const faker = require('faker')
const { beforeFunctionForPayment} = require('../../../schema/payments/beforeFunction')
const { PaymentTypes } = require('../../../../config/seed').seed
let  authToken,reqData, randomNumber, randomWordsString,randomString, paymentTypes, baseUrl, statementId,payorId

baseUrl = '/api/v1/payments'

describe('POST /api/v1/payments',  () => {
    before( async () => {
        authToken = global.userToken
        paymentTypes = Object.keys(PaymentTypes).map(e => { return Number(e) })
        randomString = faker.random.word()
        randomNumber = 100  //faker.random.number()
        randomWordsString = faker.random.words()
        try {
            statementId = global.statement.id
            payorId = global.statement.payorWithPayment.personId
            reqData = {
                statementId: statementId,
                payorId: payorId,
                amount: randomNumber,
                paymentType: 1,
                remarks: randomWordsString
            }            
            return true
        } catch (error) {
            console.log(error)
        }
    })

    it('should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .post(`${baseUrl}`)
            .set('authorization', '')
        res.should.have.status(401)
    })

    it('should return an error saying statementId is required', async () => {
        delete reqData.statementId
        const res = await chai.request(server)
            .post(`${baseUrl}`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Statement Id is required')
    })

    it('should return an error saying statementId must be a number', async () => {
        reqData.statementId = randomString
        const res = await chai.request(server)
            .post(`${baseUrl}`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Statement Id must be a integer')
    })

    it('should return an error saying payorId is required', async () => {
        reqData.statementId = randomNumber
        delete reqData.payorId
        const res = await chai.request(server)
            .post(`${baseUrl}`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Payor Id is required')
    })

    it('should rerurn an error saying that payorId must be a number/ Integer', async () => {
        reqData.payorId = randomString
        const res = await chai.request(server)
            .post(`${baseUrl}`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Payor Id must be a integer')
    })

    it('should return an error saying paymentType is required', async () => {
        reqData.payorId = randomNumber
        delete reqData.paymentType
        const res = await chai.request(server)
            .post(`${baseUrl}`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Payment Type is required')
    })

    it('should return an error saying payment type must be a number', async () => {
        reqData.paymentType = randomString
        const res = await chai.request(server)
            .post(`${baseUrl}`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Payment Type must be a integer')
    })

    it('should return an error saying payment type must be a valid paymeny type', async () => {
        reqData.paymentType = randomNumber
        const res = await chai.request(server)
            .post(`${baseUrl}`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Enter valid Payment Type from [${paymentTypes}]`)
    })

    it('should return an error saying remsrks should be a string', async () => {
        reqData.paymentType = paymentTypes[0]
        reqData.remarks = randomNumber
        const res = await chai.request(server)
            .post(`${baseUrl}`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Remarks must be a string')
    })

    it('should return an error saying that remarks must be of max length 150', async () => {
        reqData.remarks = randomWordsString.repeat(200)

        const res = await chai.request(server)
            .post(`${baseUrl}`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Remarks must be of max length ${150}`)
    })

    it('should return an error saying that payer or statement is not found', async () => {
        reqData.remarks = randomWordsString

        const res = await chai.request(server)
            .post(`${baseUrl}`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(404)
        res.body.should.have.property('error').and.to.be.equal('Payor or Statement does not exists')
    })

    it('should successfully return receipt number after adding payment', async () => {
        reqData.statementId = statementId
        reqData.payorId = payorId
        const res = await chai.request(server)
            .post(`${baseUrl}`)
            .set('authorization', authToken)
            .send(reqData)        
        res.should.have.status(200)
    })

    it('should return an error saying reference number is required for payments other than cash', async () => {
        reqData.paymentType = 2

        const res = await chai.request(server)
            .post(`${baseUrl}`)
            .set('authorization', authToken)
            .send(reqData)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Reference Number is required')

    })

    it('should return an error saying reference number must be a string', async () => {
        reqData.referenceNumber = randomNumber
        const res = await chai.request(server)
        .post(`${baseUrl}`)
        .set('authorization', authToken)
        .send(reqData)
    res.should.have.status(422)
    res.body.should.have.property('error').and.to.be.equal('Reference Number must be a string')
    })

    it('should return an error saying Reference Number is required', async () => {
        reqData.referenceNumber = ''
        const res = await chai.request(server)
        .post(`${baseUrl}`)
        .set('authorization', authToken)
        .send(reqData)
    res.should.have.status(422)
    res.body.should.have.property('error').and.to.be.equal('Reference Number is required')
    })

    it('should record the payment when reference number is provided', async () => {
        reqData.referenceNumber = randomString
            const res = await chai.request(server)
            .post(`${baseUrl}`)
            .set('authorization', authToken)
            .send(reqData)        
        res.should.have.status(200)
    })
    

})