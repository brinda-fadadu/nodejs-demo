const {
    chai,
    server,
    addTestUser,
    genAuthToken,
} = require('../../../../helper')
const faker = require('faker')
const moment = require('moment')
const models = require('../../../../../models/index')
const {contactHelper} = require('../../../../schema/personContact')
const createContact = require('../../../../../controllers/persons/contact/createContact')


const personSchema = require('../../../../schema/person')


const baseUrl = '/api/v1/persons'

let authToken
let createdContact
let contactReqBody
let personId
const randomString = faker.random.word();

async function createPerson (isBeneficiary) {
    const personObj = await personSchema()
    if (isBeneficiary) {
      personObj.IsAlive = true
    }
    person = await models.Person.create(personObj)
    return {
      person
    }
  }

describe('GET /api/v1/persons/{personId}/contact/{contactId}', () => {
    before(async () => {
        try {
            user = await addTestUser()
            authToken = await genAuthToken(user)
            ch = await contactHelper()
            contactReqBody = ch.createContactPersonObj
            personData = await createPerson(false)
            personId = personData.person.id
            contactReqBody.personId = personId
            createdContact = await createContact(contactReqBody)

            return
        } catch (err) {
            console.log('Error:::::')
            console.log(err)
            process.exit()
        }
    })

    after(async () => {
        try {
            await models.Person.destroy({ truncate: true })
            await models.ContactPerson.destroy({ truncate: true })
        } catch (error) {
            console.log(error)
        }
    })


    it('should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}/${personId}/contacts/${createdContact.id}`)
            .set('authorization', '')
            res.should.have.status(401);
    })

    it('should respond with an error of invalid person id', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}/${randomString}/contacts/${createdContact.id}`)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`PersonId must be a integer`)
    })

    it('should respond with an error of invalid contact id', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}/${personId}/contacts/${randomString}`)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`ContactId must be a integer`)
    })

    it('should respond with a details of contact', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}/${personId}/contacts/${createdContact.id}`)
            .set('authorization', authToken)
        res.should.have.status(200)
    })

    it('should respond with an error of invalid contact id if it is deleted', async () => {
        await models.ContactPerson.update(
            {
                deletedAt: moment().format(),
                deletedBy: faker.random.number()
            },
            {
                where: { id: createdContact.id }
            }
        )
        const res = await chai.request(server)
            .get(`${baseUrl}/${personId}/contacts/${createdContact.id}`)
            .set('authorization', authToken)
        res.should.have.status(404);
        res.body.should.have.property('error').and.to.be.equal(`Contact Not Found`)
    })
})
