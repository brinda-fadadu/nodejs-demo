const {
    chai,
    server,
    addTestUser,
    genAuthToken,
    verifyPerson
} = require('../../../helper')
const faker = require('faker')

const { someOnePassedSchema } = require('../../../schema/preNeedCall')
const models = require('../../../../models/index')

let authToken, personId
let someOnePassedObj, createdSomeOnePassed

describe('Get /persons/:personId/additionalInfo', async () => {
    before(async () => {
        const user = await addTestUser()
        authToken = await genAuthToken(user)

        someOnePassedObj = await someOnePassedSchema()
        personId = someOnePassedObj.decedentId
        createdSomeOnePassed = await models.SomeOnePassed.create(someOnePassedObj)
    })

    after(async () => {
        try {
            await models.SomeOnePassed.destroy({ truncate: true })
        } catch (error) {
            console.log(error);
        }
    })

    describe('Get /persons/:personId/additional-info', function () {
        it('Should return Token not found response without sending the authToken', async () => {
            let response = await chai.request(server)
                .get(`/api/v1/persons/${personId}/additional-info`)
                .set('authorization', '')
            response.should.have.status(401);
        })

        it('Get error message when searched with wrong personId', async () => {
            let response = await chai.request(server)
                .get(`/api/v1/persons/${faker.random.number()}/additional-info`)
                .set('Authorization', authToken)
            response.should.have.status(404)
            response.body.should.have.property('error').to.equal('Person id not found')
        })

        it('Get notifier deatails of a person with correct oneportalId', async () => {
            let response = await chai.request(server)
                .get(`/api/v1/persons/${personId}/additional-info`)
                .set('Authorization', authToken)
            response.should.have.status(200)
            response.body.should.have.property('info').and.to.be.an('object')
            chai.assert.containsAllKeys(response.body.info, ['haveFuneralPN', 'haveCemeteryPN', 'funeralHomeChoice', 'cemeteryHomeChoice'])
        })
    })
})
