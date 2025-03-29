const { chai, server} = require('../../../helper')
const { generateCreateStatementReqBody } = require('../../../schema/statements/createStatementReqBody')



const faker = require('faker')
let statementId, payorId, cardToken, authToken, randomString, cardId, randomNumber, reqBody, cardPaymentReqBody, locationId

describe('Adding, listing and deleting of cards of the payor', () => {
    before(async () => {
        const addItemsToStatement = require('../../../schema/statements/addItemsSchema')
        const createPayorReqBody = require('../../../schema/statements/addPayorReqBody')

        try {
            const createStatementReqBody = await generateCreateStatementReqBody()

            authToken = createStatementReqBody.authToken
            createReqBody = createStatementReqBody.reqBody
            personId = createStatementReqBody.personId
            const createdStatement = await chai
            .request(server)
            .post(`/api/v1/statements`)
            .set('Authorization', authToken)
            .send(createReqBody)
            
            locationId = createdStatement.body.locationId
            statementId = createdStatement.body.id

            // add item to statement

            const itemCreationReqBody = await addItemsToStatement(personId, locationId)
            const statementData = await chai
              .request(server)
              .put(`/api/v1/statements/${statementId}/items`)
              .set('authorization', authToken)
              .send(itemCreationReqBody.reqBody)
            totalAmount = statementData.body.statementItems.finalAmount
            const payorObj = await createPayorReqBody()

            // add payors to statement
            const payorRes = await chai
              .request(server)
              .post(`/api/v1/statements/${statementId}/agreementPersons`)
              .set('Authorization', authToken)
              .send(payorObj.reqObj)
            ;
            payorId = payorRes.body.personId, 
            randomString = faker.random.word()
            randomNumber = faker.random.number()
            reqBody = {
                cardToken: randomString
            }

        } catch (error) {
            console.log(error)
        }
    })

    it('should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .post(`/api/v1/payments/stripe/${payorId}/cards`)
            .set('authorization', '')
        res.should.have.status(401)
    })

    it('should return an error saying payor Id must be a number', async () => {
        const res = await chai.request(server)
        .post(`/api/v1/payments/stripe/${randomString}/cards`)
        .set('authorization', authToken)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Payor Id must be a integer')
    })

    it('should return an error saying payor is not found', async () => {
        const res = await chai.request(server)
        .post(`/api/v1/payments/stripe/${randomNumber}/cards`)
        .set('authorization', authToken)
        .send(reqBody)
        res.should.have.status(404)
        res.body.should.have.property('error').and.to.be.equal('Payor not found')
    })

    it('should return an error saying cardToken must be a string', async () => {
        reqBody.cardToken = randomNumber
        const res = await chai.request(server)
            .post(`/api/v1/payments/stripe/${payorId}/cards`)
            .set('authorization', authToken)
            .send(reqBody)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Card Token must be a string')  
    })

    it('should return an error saying to enter valid cardToken', async () => {
        reqBody.cardToken = randomString
        const res = await chai.request(server)
            .post(`/api/v1/payments/stripe/${payorId}/cards`)
            .set('authorization', authToken)
            .send(reqBody)
        res.should.have.status(500)
    })

    it('should create the card for the payor', async () => {
        reqBody.cardToken = 'tok_visa'
        const res = await chai.request(server).post(`/api/v1/payments/stripe/${payorId}/cards`).set('authorization', authToken).send(reqBody)
        res.should.have.status(200)
        cardId = res.body.card.id
    })

    it('should list the cards of the payor', async () => {
        const res = await chai.request(server)
                    .get(`/api/v1/payments/stripe/${payorId}/cards`)
                    .set('authorization', authToken)
        res.should.have.status(200)
        res.body.should.have.property('cards').and.to.be.a('array').and.to.have.length(1)
    })

    it('should return an error saying cardId must be a string', async () => {
        const res = await chai.request(server)
        .delete(`/api/v1/payments/stripe/${payorId}/cards/${randomNumber}`)
        .set('authorization', authToken)
    res.should.have.status(500)
    res.body.should.have.property('error').and.to.be.equal(`No such source: ${randomNumber}`)  
    })

    it('should return an error saying card is not found', async () => {
        const res = await chai.request(server)
        .delete(`/api/v1/payments/stripe/${payorId}/cards/${randomString}`)
        .set('authorization', authToken)
    res.should.have.status(500)
    })

    it('should remove the card added for the payor', async () => {
        const res = await chai.request(server)
        .delete(`/api/v1/payments/stripe/${payorId}/cards/${cardId}`)
        .set('authorization', authToken)
        res.should.have.status(200)
        res.body.should.have.property('message').and.to.be.equal('Card removed successfully')
    })


    it('should create the card for the payor', async () => {
        reqBody.cardToken = 'tok_visa'
        const res = await chai.request(server).post(`/api/v1/payments/stripe/${payorId}/cards`).set('authorization', authToken).send(reqBody)
        res.should.have.status(200)
        cardId = res.body.card.id
    })

    it('should return an error saying amount should be greater than 0.5', async () => {
        cardPaymentReqBody = {
            statementId: statementId,
            payorId: payorId,
            cardId: cardId,
            amount: 0
        }
        const res = await chai.request(server)
                    .post(`/api/v1/payments/stripe`)
                    .set('authorization', authToken)
                    .send(cardPaymentReqBody)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Amount must be greater than 0.5')
    })

    it('should return an error saying statementId is required', async () => {
        cardPaymentReqBody.amount = 1
        delete cardPaymentReqBody.statementId
        const res = await chai.request(server)
        .post(`/api/v1/payments/stripe`)
        .set('authorization', authToken)
        .send(cardPaymentReqBody)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Statement Id is required`)  
    })

    it('should return an error saying statementId must be a number', async () => {
        cardPaymentReqBody.statementId = randomString
        const res = await chai.request(server)
        .post(`/api/v1/payments/stripe`)
        .set('authorization', authToken)
        .send(cardPaymentReqBody)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Statement Id must be a integer`)  
    })

    it('should return an error saying statement is not found', async () => {
        cardPaymentReqBody.statementId = randomNumber
        const res = await chai.request(server)
        .post(`/api/v1/payments/stripe`)
        .set('authorization', authToken)
        .send(cardPaymentReqBody)
        res.should.have.status(404)
        res.body.should.have.property('error').and.to.be.equal(`Statement not found`) 
    })

    it('should return an error saying payor id is required', async () => {
        delete cardPaymentReqBody.payorId
        cardPaymentReqBody.statementId = statementId
        const res = await chai.request(server)
        .post(`/api/v1/payments/stripe`)
        .set('authorization', authToken)
        .send(cardPaymentReqBody)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Payor Id is required`)  
    })
    it('should return an error saying payorId must be a number', async () => {
        cardPaymentReqBody.payorId = randomString
        const res = await chai.request(server)
        .post(`/api/v1/payments/stripe`)
        .set('authorization', authToken)
        .send(cardPaymentReqBody)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Payor Id must be a integer`)  
    })

    it('should return an error saying payor is not found', async () => {
        cardPaymentReqBody.payorId = randomNumber
        const res = await chai.request(server)
        .post(`/api/v1/payments/stripe`)
        .set('authorization', authToken)
        .send(cardPaymentReqBody)
        res.should.have.status(404)
        res.body.should.have.property('error').and.to.be.equal(`Payor not found`) 
    })

    it('should return an error saying card id is required', async () => {
        delete cardPaymentReqBody.cardId
        cardPaymentReqBody.payorId = payorId
        const res = await chai.request(server)
        .post(`/api/v1/payments/stripe`)
        .set('authorization', authToken)
        .send(cardPaymentReqBody)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Card Id is required`)  
    })
    it('should return an error saying cardId must be a string', async () => {
        cardPaymentReqBody.cardId = randomNumber
        const res = await chai.request(server)
        .post(`/api/v1/payments/stripe`)
        .set('authorization', authToken)
        .send(cardPaymentReqBody)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal(`Card Id must be a string`)  
    })

    it('should return an error saying card not found', async () => {
        cardPaymentReqBody.cardId = randomString
        const res = await chai.request(server)
        .post(`/api/v1/payments/stripe`)
        .set('authorization', authToken)
        .send(cardPaymentReqBody)
        res.should.have.status(500)
    })

    it('should return an error saying amount can not be greater than the total amount of statement', async () => {
        cardPaymentReqBody.cardId = cardId
        cardPaymentReqBody.amount = totalAmount + 1
        const res = await chai.request(server)
        .post(`/api/v1/payments/stripe`)
        .set('authorization', authToken)
        .send(cardPaymentReqBody)
        res.should.have.status(406)
        res.body.should.have.property('error').and.to.be.equal(`Amount can not be greater than balance amount`) 
    })

    it('should successfully create the payment', async () => {
        cardPaymentReqBody.amount = totalAmount / 2
        const res = await chai.request(server)
        .post(`/api/v1/payments/stripe`)
        .set('authorization', authToken)
        .send(cardPaymentReqBody)
        res.should.have.status(200)
        res.body.should.have.property('payment').and.to.be.a('object').and.to.have.property('status').and.to.be.equal('success')
    })

})
