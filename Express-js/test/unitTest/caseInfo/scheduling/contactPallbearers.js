const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const faker = require('faker')
chai.use(chaiAsPromised)
chai.should()

const models = require('../../../../models')
const { personSchema, agreementSchema } = require('../../schema')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const PersonController = require('../../../../controllers/refactorControllers/personController/personController')
const VerifiedPersonController = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')

describe('Scheduling Contact Pallbeares', () => {
  let contactData = {
    contactRoleIds: [3],
    contactType: 2
  }
  let contactId
  before(async () => {
    const person = { ...personSchema() }
    person.isAlive = false
    const createdPerson = await PersonController.createOrUpdate(person, {}, {})
    personId = createdPerson.id
    const verifiedPersonController = new VerifiedPersonController(personId)
    await verifiedPersonController.verifyPerson(createdPerson)
    const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(
      (agreementType = 1), createdPerson.isAlive ? 1: 2 
    )
    saleTypeIds = saleTypes.map(saleType => saleType.id)
    const agreementObject = {
      ...agreementSchema(createdPerson.isAlive),
      type: 1,
      saleTypeId: faker.random.arrayElement(saleTypeIds)
    }
    const agreement = await AgreementController.createOrEditAgreement(
      personId,
      agreementObject
    )
    contactData.resourceId = agreement.id
    const contacts = await verifiedPersonController.addOrUpdateContactsWithRoles(
      contactData
    )
    contactId = contacts.id
    await models.ResourcePallbearer.create({ resourcesectionId: 1, contactId })
  })

  it('Should return person not found', async () => {
    try {
      const verifiedPersonController = new VerifiedPersonController(
        personId + 1
      )
      await verifiedPersonController.deleteContact(contactId)
    } catch (error) {
      error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
    }
  })

  it('Should return contact not found', async () => {
    try {
      const verifiedPersonController = new VerifiedPersonController(personId)
      await verifiedPersonController.deleteContact(contactId + 1)
    } catch (error) {
      error.should.have.property('message').and.to.be.equal('CONTACT_NOT_FOUND')
    }
  })

  it('Should to be deleted success fully successfully with pallbearers', async () => {
    const verifiedPersonController = new VerifiedPersonController(personId)
    await verifiedPersonController.deleteContact(contactId)
    const pallbearersData = await models.ResourcePallbearer.findAll({
      where: { contactId }
    })
    pallbearersData.should.to.be.an('array').of.length(0)
  })

  it('Should to be deleted success fully successfully without pallbearers', async () => {
    const verifiedPersonController = new VerifiedPersonController(personId)
    contactData.contactRoleIds = [1]
    contactData.contactType = 1
    const contacts = await verifiedPersonController.addOrUpdateContactsWithRoles(
      contactData
    )
    await models.ResourcePallbearer.create({
      resourcesectionId: 1,
      contactId: contacts.id
    })
    await verifiedPersonController.deleteContact(contacts.id)
    const pallbearersData = await models.ResourcePallbearer.findAll({
      where: { contactId: contacts.id }
    })
    pallbearersData.should.to.be.an('array').of.length(1)
  })

  after(async () => {
    const verifiedPersonController = new VerifiedPersonController(personId)
    await verifiedPersonController.deleteContact(contactId)
  })
})
