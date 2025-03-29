const {
    chai,
    server,
    models
} = require('../../../helper')
const faker = require('faker')
const { generateCreateStatementReqBody } = require('../../../schema/statements/createStatementReqBody')
let token, reqBody, personId, randomString

describe('GET /api/v1/:personId/statements', () => {
    before(async () => {
        try {
            const createData = await generateCreateStatementReqBody('funeral')
            token = createData.authToken
            reqBody = createData.reqBody
            personId = createData.personId
            randomString = faker.random.word()
        } catch (error) {
            console.log(error)
        }
    })
    after(async () => {
        await models.Person.destroy({truncate: true})
        await models.Statement.destroy({truncate: true})
    })

    it('should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .get(`/api/v1/persons/${personId}/statements`)
            .set('authorization', '')
        res.should.have.status(401);
    })

    it('should return an error saying personId must be a integer', async () => {
        const res = await chai.request(server)
        .get(`/api/v1/persons/${randomString}/statements`)
        .set('authorization', token)
        res.should.have.status(422)
        res.body.should.have.property('error').and.to.be.equal('Person Id must be a integer')

    })

    it('should create a statement successfully', async () => {
        const createdStatement = await chai.request(server)
        .post(`/api/v1/statements`)
        .set("authorization", token)
        .send(reqData)
        const res = await chai.request(server)
        .get(`/api/v1/persons/${personId}/statements`)
        .set('authorization', token)
        res.should.have.status(200)
    })
})

