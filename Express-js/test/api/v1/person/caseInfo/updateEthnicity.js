const {
    chai,
    server,
    addTestUser,
    genAuthToken,
} = require('../../../../helper')  //Please change the helper path if required
const models = require('../../../../../models/index')
const faker = require('faker')
const { personInfoSchema, ethnicitySchema } = require('../../../../schema/personInfo')
const personSchema = require('../../../../schema/person')
const loweringCapital = require('../../../../../utils/loweringFirstLetter')

const baseUrl = '/api/v1/persons'
let opi = ''
let ethnicityObj = {}
let createdPerson = {}
let updatedPersonInfo = {}

describe('PUT /api/v1/persons/:onePortalId/ethnicity-info', () => {

    before(async () => {
        try {
            user = await addTestUser()
            authToken = genAuthToken(user);
            const personObj = await personSchema()
            const personInfoObj = personInfoSchema()
            createdPerson = await models.Person.create(personObj)
            opi = createdPerson.onePortalId
            personInfoObj.veteranId = null
            personInfoObj.personId = createdPerson.id
            createdPersonInfo = await models.PersonInfo.create(personInfoObj)
        } catch (error) {
            console.log(error);
        }
    })

    after(async () => {
        try {
            await models.Person.destroy({ truncate: true })
            await models.PersonInfo.destroy({ truncate: true })
            await models.PersonEthnicity.destroy({ truncate: true })
        } catch (error) {
            console.log(error)
        }
    })

    it('should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/ethnicity-info`)
            .send(ethnicityObj)
            .set('authorization', '')
        res.should.have.status(401);
    })

    it('should return error of invalid OPI', async () => {
        const randomString = faker.random.word()
        const res = await chai.request(server)
            .put(`${baseUrl}/${randomString}/ethnicity-info`)
            .send(ethnicityObj)
            .set('authorization', authToken)
        res.should.have.status(404);
        res.body.should.have.property('error').and.to.be.equal(`OnePortalId not found`)
    })

    it('should return error of race one id not valid when sent as string', async () => {
        ethnicityObj = loweringCapital(ethnicitySchema())
        ethnicityObj.raceOneId = faker.random.word()
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/ethnicity-info`)
            .send(ethnicityObj)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Race one Id is not valid`)
    })

    it('should return error of race two id not valid when sent as string', async () => {
        ethnicityObj = loweringCapital(ethnicitySchema())
        ethnicityObj.raceTwoId = faker.random.word()
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/ethnicity-info`)
            .send(ethnicityObj)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Race two Id is not valid`)
    })

    it('should return error of race three id not valid when sent as string', async () => {
        ethnicityObj = loweringCapital(ethnicitySchema())
        ethnicityObj.raceThreeId = faker.random.word()
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/ethnicity-info`)
            .send(ethnicityObj)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Race three Id is not valid`)
    })

    it('should return error of hispanic id not valid when sent as string', async () => {
        ethnicityObj = loweringCapital(ethnicitySchema())
        ethnicityObj.hispanicId = faker.random.word()
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/ethnicity-info`)
            .send(ethnicityObj)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Hispanic Id is not valid`)
    })

    it('should return error of ethnicity one id not valid when sent as string', async () => {
        ethnicityObj = loweringCapital(ethnicitySchema())
        ethnicityObj.ethnicityOneId = faker.random.word()
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/ethnicity-info`)
            .send(ethnicityObj)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Ethnicity one Id is not valid`)
    })

    it('should return error of ethnicity two id not valid when sent as string', async () => {
        ethnicityObj = loweringCapital(ethnicitySchema())
        ethnicityObj.ethnicityTwoId = faker.random.word()
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/ethnicity-info`)
            .send(ethnicityObj)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Ethnicity two Id is not valid`)
    })

    it('should return error of ethnicity three id not valid when sent as string', async () => {
        ethnicityObj = loweringCapital(ethnicitySchema())
        ethnicityObj.ethnicityThreeId = faker.random.word()
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/ethnicity-info`)
            .send(ethnicityObj)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Ethnicity three Id is not valid`)
    })

    it('should return error of isHispanic not valid when sent as string', async () => {
        ethnicityObj = loweringCapital(ethnicitySchema())
        ethnicityObj.isHispanic = faker.random.word()
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/ethnicity-info`)
            .send(ethnicityObj)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Is Hispanic is not valid`)
    })
    

    it('should return success when empty object is sent', async () => {
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/ethnicity-info`)
            .send({})
            .set('authorization', authToken)
        res.should.have.status(200);
        updatedPersonInfo = await models.PersonInfo.findOne({
            where: {
                PersonId: createdPerson.id
            }
        })
        chai.assert.equal(updatedPersonInfo.EthnicityId, res.body.id, 'EthnicityId is equal to the response id')
        chai.assert.containsAllKeys(res.body, ['id'])
    })

    it('should return success when correct object is sent', async () => {
        ethnicityObj = loweringCapital(ethnicitySchema())
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/ethnicity-info`)
            .send(ethnicityObj)
            .set('authorization', authToken)
        res.should.have.status(200);
        updatedPersonInfo = await models.PersonInfo.findOne({
            where: {
                PersonId: createdPerson.id
            }
        })
        chai.assert.equal(updatedPersonInfo.EthnicityId, res.body.id, 'EthnicityId is equal to the response id')
        chai.assert.containsAllKeys(res.body, ethnicityObj)
    })

})