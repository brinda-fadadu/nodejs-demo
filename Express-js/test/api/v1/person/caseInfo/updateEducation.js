const {
    chai,
    server,
    addTestUser,
    genAuthToken,
} = require('../../../../helper')  //Please change the helper path if required
const models = require('../../../../../models/index')
const faker = require('faker')
const { personInfoSchema } = require('../../../../schema/personInfo')
const personSchema = require('../../../../schema/person')

const baseUrl = '/api/v1/persons'
let opi = ''
let educationUpdateReq = {
    industry: faker.random.word(),
    occupation: faker.random.word(),
    qualificationId: faker.random.number(),
    yearsOfOccupation: faker.random.number()
}
let createdPerson = {}
let updatedPersonInfo = {}

describe('PUT /api/v1/persons/:onePortalId/education-info', () => {

    before(async () => {
        try {
            user = await addTestUser()
            authToken = genAuthToken(user);
            const personObj = await personSchema()
            const personInfoObj = personInfoSchema()
            createdPerson = await models.Person.create(personObj)
            opi = createdPerson.onePortalId
            personInfoObj.PersonId = createdPerson.id
            createdPersonInfo = await models.PersonInfo.create(personInfoObj)
        } catch (error) {
            console.log(error);
        }
    })

    after(async () => {
        try {
            await models.Person.destroy({ truncate: true })
            await models.PersonInfo.destroy({ truncate: true })
        } catch (error) {
            console.log(error)
        }
    })

    it('should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/education-info`)
            .send(educationUpdateReq)
            .set('authorization', '')
        res.should.have.status(401);
    })

    it('should return error of invalid OPI', async () => {
        const randomString = faker.random.word()
        const res = await chai.request(server)
            .put(`${baseUrl}/${randomString}/education-info`)
            .send(educationUpdateReq)
            .set('authorization', authToken)
        res.should.have.status(404);
        res.body.should.have.property('error').and.to.be.equal(`OnePortalId not found`)
    })

    it('should return error of invalid qualification id when sent in negative number', async () => {
        const randomNumber = faker.random.number()
        educationUpdateReq.qualificationId = faker.random.number({ max: -1 })
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/education-info`)
            .send(educationUpdateReq)
            .set('authorization', authToken)
        educationUpdateReq.qualificationId = randomNumber
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Qualification Id is not valid`)
    })

    it('should return error of invalid yearsOfOccupation id when sent in negative number', async () => {
        const randomNumber = faker.random.number()
        educationUpdateReq.yearsOfOccupation = faker.random.number({ max: -1 })
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/education-info`)
            .send(educationUpdateReq)
            .set('authorization', authToken)
        educationUpdateReq.yearsOfOccupation = randomNumber
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`Years of occupation is not valid`)
    })

    it('should return object after the creation of the education for the first time', async () => {
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/education-info`)
            .send(educationUpdateReq)
            .set('authorization', authToken)
        updatedPersonInfo = await models.PersonInfo.findOne({
            where: {
                PersonId: createdPerson.id
            }
        })
        res.should.have.status(200);
        chai.assert.containsAllKeys(res.body, ['industry', 'occupation', 'qualificationId', 'yearsOfOccupation'])
        chai.assert.equal(updatedPersonInfo.Industry, res.body.industry, 'industry is equal to the response industry')
        chai.assert.equal(updatedPersonInfo.Occupation, res.body.occupation, 'occupation is equal to the response occupation')
        chai.assert.equal(updatedPersonInfo.QualificationId, res.body.qualificationId, 'qualificationId is equal to the response qualificationId')
        chai.assert.equal(updatedPersonInfo.YearsOfOccupation, res.body.yearsOfOccupation, 'yearsOfOccupation is equal to the response yearsOfOccupation')
    })


    it('should return success object after updating the industry', async () => {
        const randomString = faker.random.word()
        educationUpdateReq.industry = randomString
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/education-info`)
            .send(educationUpdateReq)
            .set('authorization', authToken)
        res.should.have.status(200);
        chai.assert.equal(res.body.industry, randomString, 'industry should be equal to the response industry')
    })

    it('should return success object after updating the occupation', async () => {
        const randomString = faker.random.word()
        educationUpdateReq.occupation = randomString
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/education-info`)
            .send(educationUpdateReq)
            .set('authorization', authToken)
        res.should.have.status(200);
        chai.assert.equal(res.body.occupation, randomString, 'occupation should be equal to the response occupation')
    })

    it('should return success object after updating the qualificationId', async () => {
        const randomNumber = faker.random.number()
        educationUpdateReq.qualificationId = randomNumber
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/education-info`)
            .send(educationUpdateReq)
            .set('authorization', authToken)
        res.should.have.status(200);
        chai.assert.equal(res.body.qualificationId, randomNumber, 'qualificationId should be equal to the response qualificationId')
    })

    it('should return success object after updating the yearsOfOccupation', async () => {
        const randomNumber = faker.random.number()
        educationUpdateReq.yearsOfOccupation = randomNumber
        const res = await chai.request(server)
            .put(`${baseUrl}/${opi}/education-info`)
            .send(educationUpdateReq)
            .set('authorization', authToken)
        res.should.have.status(200);
        chai.assert.equal(res.body.yearsOfOccupation, randomNumber, 'yearsOfOccupation should be equal to the response yearsOfOccupation')
    })
})