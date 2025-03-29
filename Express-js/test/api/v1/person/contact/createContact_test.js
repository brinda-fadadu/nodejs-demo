try{
const {
  chai,
  server,
  addTestUser,
  genAuthToken,
  getPersonCount,
  getRelations
} = require('../../../../helper')
const {contactHelper, getOtherContactRoles} = require('../../../../schema/personContact')
const personSchema = require('../../../../schema/person')
const faker = require('faker')
const models = require('../../../../../models')
let person, user, authToken, personData, personId, personIdNotExists, roleNotifierData, personCount, ch, relationIds
const baseUrl = '/api/v1/persons/'
console.log('Before create person')
async function createPerson (isBeneficiary) {
  const personObj = await personSchema()
  if (isBeneficiary) {
    personObj.IsAlive = true
  }
  person = await models.Person.create(personObj)
  personCount = await getPersonCount()
  return {
    person,
    personCount
  }
}

describe('/POST Create Contact', function () {  
  before(async () => {
    try {
      user = await addTestUser()
      authToken = await genAuthToken(user)
      ch = await contactHelper()
      relationIds = await getRelations()
      personData = await createPerson(false)
      personId = personData.person.id
      personIdNotExists = personData.personCount + faker.random.number()
      roleNotifierData = await models.Role.findOne({ where: { Type: 'Contact', Name: 'Notifier' } })
      return
    } catch (err) {
      console.log('Error:::::')
      console.log(err)
    }
  })

  after(async () => {
    try {
      await models.Person.destroy({ truncate: true })
      await models.ContactPerson.destroy({ truncate: true })
    } catch (error) {
      console.log('Error:::::')
      console.log(error)
    }
  })

  it('should return error message if the token is not present', async function () {
    const res = await chai.request(server)
      .post(baseUrl + personId + '/contacts')
      .set("authorization", "")
    res.should.have.status(401)
    res.body.should.have.property('message').and.to.be.equal("Token not found");
  })

  it('should return error message if a person id is passed but it is not present in database', async function () {    
    const res = await chai.request(server)
      .post(baseUrl + personIdNotExists + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)

    res.should.have.status(404)
    res.body.should.have.property('error').and.to.be.equal('PERSON_NOT_FOUND')
  })

  it('should return error message if a person id is passed and it is a string', async function () {
    const res = await chai.request(server)
      .post(baseUrl + faker.random.word() + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)

    res.should.have.status(422)
    res.body.should.have.property('error').and.to.be.equal('PersonId must be a integer')
  })

  it('should return error message if a firstName key is not passed', async function () {
    delete ch.createContactPersonObj.firstName
    const res = await chai.request(server)
      .post(baseUrl + personId + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)

    res.should.have.status(422)
    res.body.should.have.property('error').and.to.be.equal('First name is mandatory and not allows numbers')
  })

  it('should return error message if reasonId is passed which is not present in database', async function () {
    ch.createContactPersonObj.firstName = faker.name.firstName()
    ch.createContactPersonObj.relationId = faker.random.number()
    const res = await chai.request(server)
      .post(baseUrl + personId + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)

    res.should.have.status(422)
    res.body.should.have.property('error').and.to.be.equal('RelationId is required / not valid')
  })

  it('should return error message if caseRoleIds is passed which is not present in database', async function () {
    ch.createContactPersonObj.relationId = ch.relationsIds['Brother']
    ch.createContactPersonObj.caseRoleIds = [20]
    const res = await chai.request(server)
      .post(baseUrl + personId + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)

    res.should.have.status(422)
    res.body.should.have.property('error').and.to.be.equal('CaseRole is Invalid')
  })

  it('should return error message if invalid contactType is passed', async function () {
    ch.createContactPersonObj.caseRoleIds = [ch.caseRoles['Informant'], ch.caseRoles['Next of Kin']]
    ch.createContactPersonObj.contactType = 23423    
    const res = await chai.request(server)
      .post(baseUrl + personId + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)    
    res.should.have.status(422)
    res.body.should.have.property('error').and.to.be.equal('contactType must be one of [Family, CL Staff, Other]')
  })

  it('should create a contact and return success message if a valid person id and request body passed', async function () {
    ch.createContactPersonObj.contactType = 1
    const res = await chai.request(server)
      .post(baseUrl + personId + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)

    res.should.have.status(200)
    res.body.should.have.property('id').and.to.be.a('number')
  })

  it('should return error message if beneficairy person contain more than 1 notifier', async function () {
    personData = await createPerson(true)
    ch.createContactPersonObj.caseRoleIds = [roleNotifierData.id]
    await chai.request(server)
      .post(baseUrl + personData.person.id + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)
    const res = await chai.request(server)
      .post(baseUrl + personData.person.id + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)    
    res.should.have.status(404)
    res.body.should.have.property('error').and.to.be.equal('There is one contact with Notifier role')
  }) 

  it('should return error message if the person has more than 1 father', async function () {
    personData = await createPerson(true)
    ch.createContactPersonObj.relationId = relationIds['Father']
    await chai.request(server)
      .post(baseUrl + personData.person.id + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)
    const res = await chai.request(server)
      .post(baseUrl + personData.person.id + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)    
    res.should.have.status(404)
    res.body.should.have.property('error').and.to.be.equal('There is already one contact with Father relation')
  })

  it('should return error message if the person has more than 1 Mother', async function () {
    personData = await createPerson(true)
    ch.createContactPersonObj.relationId = relationIds['Mother']
    await chai.request(server)
      .post(baseUrl + personData.person.id + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)
    const res = await chai.request(server)
      .post(baseUrl + personData.person.id + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)    
    res.should.have.status(404)
    res.body.should.have.property('error').and.to.be.equal('There is already one contact with Mother relation')
  })

  it('should return error message if the person has more than 1 spouse', async function () {
    personData = await createPerson(true)
    ch.createContactPersonObj.relationId = relationIds['Spouse']
    await chai.request(server)
      .post(baseUrl + personData.person.id + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)
    const res = await chai.request(server)
      .post(baseUrl + personData.person.id + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)    
    res.should.have.status(404)
    res.body.should.have.property('error').and.to.be.equal('There is already one contact with Spouse relation')
  })

  it('should return error message if we send family contact roles to others', async () => {
    const otherContactRoles = await getOtherContactRoles(3)
    ch.createContactPersonObj.caseRoleIds = otherContactRoles
    ch.createContactPersonObj.relationId = relationIds['Aunt']
    const res = await chai.request(server)
      .post(baseUrl + personId + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)
      res.should.have.status(422)      
      res.body.should.have.property('error').and.to.be.equal('CaseRole is Invalid')

  })

  it('Create contact which is other contact type', async () => {
    const personData =  await createPerson()
    const otherContactRoles = await getOtherContactRoles(3)
    ch.createContactPersonObj.caseRoleIds = otherContactRoles
    ch.createContactPersonObj.contactType = 3    
    const res = await chai.request(server)
      .post(baseUrl + personData.person.id + '/contacts')
      .set("authorization", authToken)
      .send(ch.createContactPersonObj)      
      res.should.have.status(200)      
      

  })


});

} catch (err) {
  console.log(err)
}