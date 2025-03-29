const {
    chai,
    server,
    addTestUser,
    genAuthToken,
} = require('../../../../helper')
const faker = require('faker')
const moment = require('moment')
const models = require('../../../../../models/index')
const personSchema = require('../../../../schema/person')
const { contactHelper } = require('../../../../schema/personContact')
const baseUrl = '/api/v1/persons'
let authToken
let createdPerson
let contactSchema
let createdContactPerson
const randomString = faker.random.word();

describe('DELETE /api/v1/persons/{personId}/contact/{contactId}', () => {
    before(async () => {
        try {
            user = await addTestUser()
            authToken = genAuthToken(user);
            const personObject = await personSchema()
            createdPerson = await models.Person.create(personObject)
            contactSchema = await contactHelper()
            const res = await chai.request(server)
                .post(`${baseUrl}/${createdPerson.id}/contacts`)
                .set('Authorization', authToken)
                .send(contactSchema.createContactPersonObj)
                createdContactPerson = res.body
            return
        } catch (err) {
            process.exit()
        }
    })
    after(async () => {
        try {
            // await models.Person.destroy({ truncate: true })
            // await models.Contact.destroy({ truncate: true })
            // await models.ContactPerson.destroy({ truncate: true })
        } catch (error) {
            console.log(error)
        }
    })
    it('should return Token not found response without sending the authToken', async () => {
        const res = await chai.request(server)
            .delete(`${baseUrl}/${createdPerson.id}/contacts/${createdContactPerson.id}`)
            .set('authorization', '')
        res.should.have.status(401);
    })
    it('should respond with an error of invalid person id', async () => {        
        const res = await chai.request(server)
            .delete(`${baseUrl}/${randomString}/contacts/${createdContactPerson.id}`)
            .set('authorization', authToken)
        res.should.have.status(404);
        res.body.should.have.property('error').and.to.be.equal(`Not a valid Person ID`)
    })
    it('should respond with an error of invalid contact id', async () => {
        const res = await chai.request(server)
            .delete(`${baseUrl}/${createdPerson.id}/contacts/${randomString}`)
            .set('authorization', authToken)
        res.should.have.status(404);
        res.body.should.have.property('error').and.to.be.equal(`Not a valid Contact ID`)
    })
    it('should respond with a success for a deleted contact', async () => {        
        const res = await chai.request(server)
            .delete(`${baseUrl}/${createdPerson.id}/contacts/${createdContactPerson.id}`)
            .set('authorization', authToken)
        res.should.have.status(200);
        res.body.should.have.property('id').and.to.be.equal(createdContactPerson.id)
        res.body.should.have.property('success').and.to.be.equal(true)
    })
    it('should respond with empty array while listing the contacts', async () => {
        const res = await chai.request(server)
            .get(`${baseUrl}/${createdPerson.id}/contacts`)
            .set('authorization', authToken)
        res.should.have.status(200);        
        res.body.should.have.property('contacts').and.to.have.lengthOf(0)
    })
});