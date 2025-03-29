const {
    chai, server, models
} = require('../../../../helper')
const { generateCreateStatementReqBody } = require('../../../../schema/statements/createStatementReqBody')

const faker = require('faker')

let authToken, reqBody, items, statementId, randomString, locationId, personId

describe('PUT /api/v1/statements/{statementId}/items', () => {
    before(async () => {
        const addItemsToStatement  = require('../../../../schema/statements/addItemsSchema')

        try {
            const createStatementReqBody = await generateCreateStatementReqBody()

            authToken = createStatementReqBody.authToken
            createReqBody = createStatementReqBody.reqBody
            personId = global.personId
            // const createdStatement = await chai
            // .request(server)
            // .post(`/api/v1/statements`)
            // .set('Authorization', authToken)
            // .send(createReqBody)

            statementId = global.statementId,
            locationId = global.locationId

            const generatedData = await addItemsToStatement(personId, locationId)
            reqBody = generatedData.reqBody
            randomString = faker.random.word()
        } catch (error) {
            console.log(error)
        }
    })

    // after(async () => {
    //     try {
    //         await models.Statement.destroy({})
    //         await models.StatementLocationItem.destroy({})
    //     } catch (error) {
            
    //     }
    // })

    it('should return error message if the token is not present', async function () {
        const res = await chai.request(server)
            .put(`/api/v1/statements/${statementId}/items`)
            .set("authorization", "")
            .send(reqBody)
        res.status.should.equal(401)
        res.body.should.have.property('message').and.to.be.equal("Token not found");
    })
    it('should return an error message saying statementId is required', async () => {
        const res = await chai.request(server)
        .put(`/api/v1/statements/${randomString}/items`)
            .set("authorization", authToken)
            .send(reqBody)
        res.status.should.equal(422)
        res.body.should.have.property('error').and.to.be.equal("Statement Id must be a integer");
    })
    it('should return an error saying locationId is required', async () => {        
        delete reqBody.locationId
        const res = await chai.request(server)
        .put(`/api/v1/statements/${statementId}/items`)
        .set("authorization", authToken)
        .send(reqBody)
        res.status.should.equal(422)
        res.body.should.have.property('error').and.to.be.equal('Location Id is required')
    })
    it('should return an error saying locationid must be an integer', async () => {
        reqBody.locationId = randomString
                const res = await chai.request(server)
        .put(`/api/v1/statements/${statementId}/items`)
        .set("authorization", authToken)
        .send(reqBody)
        res.status.should.equal(422)
        res.body.should.have.property('error').and.to.be.equal('Location Id must be a integer')
    })
    it('should return an error saying personId is required', async () => {
        reqBody.locationId = locationId
        delete reqBody.personId
        const res = await chai.request(server)
        .put(`/api/v1/statements/${statementId}/items`)
        .set("authorization", authToken)
        .send(reqBody)
        res.status.should.equal(422)
        res.body.should.have.property('error').and.to.be.equal('Person Id is required')
    })
    it('should return an error saying personId must be an integer', async () => {
        reqBody.personId = randomString
                const res = await chai.request(server)
        .put(`/api/v1/statements/${statementId}/items`)
        .set("authorization", authToken)
        .send(reqBody)
        res.status.should.equal(422)
        res.body.should.have.property('error').and.to.be.equal('Person Id must be a integer')
    })
    it('should return an error saying items in the location should be entered', async () => {
        reqBody.personId = personId
        reqBody.locationId = locationId + 1
        const res = await chai.request(server)
        .put(`/api/v1/statements/${statementId}/items`)
        .set("authorization", authToken)
        .send(reqBody)
        res.status.should.equal(400)
        res.body.should.have.property('error').and.to.be.equal('Enter existing items in the location')
    })
    it('should return statement contract number after adding the statements', async () => {
        console.log('Request body::::::', statementId)
        console.log(reqBody)
        reqBody.locationId = locationId
        const res = await chai.request(server)
        .put(`/api/v1/statements/${statementId}/items`)
        .set("authorization", authToken)
        .send(reqBody)
        res.status.should.equal(200)
        res.body.should.have.property('statementItems').and.to.have.property('contractNumber')
        global.finalAmount = res.body.statementItems.finalAmount                
    })
})
