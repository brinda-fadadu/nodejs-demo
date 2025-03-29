const {
    chai,
    server,
    addTestUser,
    genAuthToken,
} = require('../../../../helper')
const faker = require('faker')
const models = require('../../../../../models/index')
const personSchema = require('../../../../schema/person')
const { contactHelper } = require('../../../../schema/personContact')
const createContact = require('../../../../../controllers/persons/contact/createContact')

const baseUrl = '/api/v1/persons'

let authToken
let randomString
let createdPerson
let contactSchema

describe('GET /api/v1/persons/{personId}/contacts', () => {
    before(async () => {
        try {
            user = await addTestUser()
            authToken = genAuthToken(user);
            const personObject = await personSchema()
            createdPerson = await models.Person.create(personObject)
            contactSchema = await contactHelper()
            
            randomString = faker.random.word();
            // return
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
            .get(`${baseUrl}/${createdPerson.id}/contacts`)
            .set('authorization', '')
        res.should.have.status(401);
    })

    it('should return error message if personId is sent but is not found in database', async () => {
        res = await chai.request(server)
        .get(`${baseUrl}/${faker.random.number()}/contacts`)
        .set("authorization", authToken)
        
        res.should.have.status(200)
        res.body.should.have.property('contacts').and.to.be.an('array').and.to.have.lengthOf(0)
    })

    it('should respond with an error of integer conversion', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}/${randomString}/contacts`)
            .set('authorization', authToken)
        res.should.have.status(422);
        res.body.should.have.property('error').and.to.be.equal(`PersonId must be a integer`)
    })


    it('should return empty array and count as zero if there are no contacts available for that person', async () => {
        res = await chai.request(server)
        .get(`${baseUrl}/${createdPerson.id}/contacts`)
        .set("authorization", authToken)
        
        res.should.have.status(200)
        res.body.should.have.property('contacts').and.to.be.an('array').and.to.have.lengthOf(0)
    })

    it('should respond with a JSON array of contacts', async () => {
        
        const contactObj = contactSchema.createContactPersonObj
        contactObj.personId = createdPerson.id
        contactObj.userId = user.id
        createdContact = await createContact(contactObj)
     
        res = await chai.request(server)
            .get(`${baseUrl}/${createdPerson.id}/contacts`)
            .set('authorization', authToken)
        res.should.have.status(200);
        res.body.should.have.property('contacts').and.to.be.an('array').and.to.have.lengthOf(1)
    })

    it('should respond with a JSON array of parents contacts', async () => {
        const contactObj = contactSchema.createContactPersonObj
        contactObj.personId = createdPerson.id
        contactObj.relationId = 8 //Father RelationshipId
        contactObj.userId = user.id
        createdContact = await createContact(contactObj)

        res = await chai.request(server)
        .get(`${baseUrl}/${createdPerson.id}/contacts`)
        .set('authorization', authToken)
        .query({getParentDetails: true})

        res.should.have.status(200);
        res.body.should.have.property('contacts').and.to.be.an('array').and.to.have.lengthOf(1)
    })

    it('should respond with a JSON arrays of Employee ', async () => {
        models.ContactPerson.destroy({truncate: true}) 
        const contactObj = contactSchema.createContactPersonObj
        contactObj.personId = createdPerson.id
        contactObj.userId = user.id
        contactObj.staffId = 1
        contactObj.contactType = 2
        createdContact = await createContact(contactObj)

        res = await chai.request(server)
        .get(`${baseUrl}/${createdPerson.id}/contacts`)
        .set('authorization', authToken)
        .query({getParentDetails: true})

        res.should.have.status(200);
    })

    it('should respond with a list of contats with case role as nok', async () => {
        res = await chai.request(server)
        .get(`${baseUrl}/${createdPerson.id}/contacts`)
        .set('authorization', authToken)
        .query({getParentDetails: true, caseRoles: [1,2,3]})

        res.should.have.status(200);
        res.body.should.have.property('contacts').and.to.be.an('array').and.to.have.lengthOf(1)

    })
})
