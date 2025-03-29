const {
  chai,
  server,
  expect,
  addTestUser,
  genAuthToken,
  getCities,
  getStates,
  getLanguages,
  getRelations,
  getCountries,
  getDeleteActionReasons
} = require('../../../helper')
const seedData = require('../../../../config/seed').seed
const models = require('../../../../models')
const createCall = require('../../../../controllers/Calls/CreateCall/create')
const moment = require('moment')
const faker = require('faker')
const baseUrl = '/api/v1/calls/delete'

let authToken, user, cities, languages, states, countries, callReceivedLocations, relationsIds, createANCallReqData, deleteCallArr = [], schemaOfCreateCall, deleteObj, deleteObj2, deleteActionReasonsCount

async function schemaOfCreateCallFun (user) {
  cities = await getCities()
  languages = await getLanguages()
  states = await getStates()
  countries = await getCountries()
  callReceivedLocations = Object.keys(
      seedData.CallReceivedLocations
  ).map(Number)
  relationsIds = await getRelations()
  deleteActionReasonsCount = await getDeleteActionReasons()

  return createANCallReqData = {
    "call": {
      "callType": "Call",
      "caller": {
        "prefix": faker.name.prefix(),
        "firstName": faker.name.firstName(),
        "lastName": faker.name.lastName(),
        "middleName": faker.name.lastName(),
        "phone": faker.phone.phoneNumberFormat(1),
        "email": faker.internet.email(),
        "languageId": languages['English'],
        "isVerified": false,
        "address": {
          "line1": faker.address.streetName(),
          "line2": faker.address.streetAddress(),
          'city': faker.address.city(),
                        'state': faker.address.state(),
                        'county': faker.address.county(),
                        'country': faker.address.country(),
                        'zipcode': faker.address.zipCode(),
        }
      },
      "appointmentDateTime": moment().add(1, 'day').format(),
      "note": [{}],
      "reasonNote": [{}],
      "assignedToId": user.id,
      "callReceivedLocationId": callReceivedLocations[0],
      "isCallFromOrganization": false,
      "callStatus": 1,
      "reasonTypeId": 1,
      "isVerified": false,
      "reason": [{
        "decedent": {
          "prefix": faker.name.prefix(),
          "firstName": faker.name.firstName(),
          "lastName": faker.name.lastName(),
          "middleName": faker.name.lastName(),
          "dateOfBirth": moment().subtract(60, 'year').format(),
          "dateOfDeath": moment().subtract(1, 'day').format(),
          "isVerified": false
        },
        "isReadyForPickup": true,
        "isFuneralPN": false,
        "isCemeteryPN": false,
        "isNok": false,
        "informantSameAsCaller": false,
        "informant": {
          "prefix": faker.name.prefix(),
          "firstName": faker.name.firstName(),
          "middleName": faker.name.lastName(),
          "lastName": faker.name.lastName(),
          "email": faker.internet.email(),
          "phone": faker.phone.phoneNumberFormat(1),
          "relationshipId": relationsIds['Aunt'],
          "isVerified": false
        },
        "arrangerEmail": faker.internet.email(),
      }]
    }
  }
}

describe('/POST Bulk Delete calls', function () {
  before(async () => {
    try{
      user = await addTestUser()
      authToken = await genAuthToken(user)
      
      // creating 10 calls
      for(let i=1;i<=10;i++) {
        schemaOfCreateCall = await schemaOfCreateCallFun(user)
        anCallResp = await createCall.createCall(schemaOfCreateCall.call)
        deleteCallArr.push({"callId": anCallResp.Identifier, "reasonId": Math.floor(Math.random() * 6) + 1})
      }
      return
    } catch (err){
      console.log('Error:::::')
      console.log(err)
      process.exit()
    }
  })

  after(async () => {
    try {
        await models.SomeOnePassed.destroy({ where: {} })
        await models.Person.destroy({ where: {} })
        await models.Call.destroy({ where: {} })
    } catch (error) {
      console.log('Error:::::')
      console.log(error)
    }
  })

  it('should return error message if the token is not present', async function () {
    const res = await chai.request(server)
        .post(`${baseUrl}`)
        .set("authorization", "")
    res.should.have.status(401)
    res.body.should.have.property('message').and.to.be.equal("Token not found")
  })

  it('should return error message if we pass callId that is not present in database', async function () {
    deleteObj = Object.assign({}, deleteCallArr[0])
    deleteObj.callId = 'CLC-123456' + faker.random.number()
    deleteObj = [deleteObj]
    const res = await chai.request(server)
        .post(`${baseUrl}`)
        .set("authorization", authToken)
        .send(deleteObj)
    res.should.have.status(422)
    res.body.should.have.property('notFoundCalls').to.be.an('array')
    res.body.should.have.property('notFoundCalls').to.have.length(deleteObj.length)
    res.body.should.have.property('success').and.to.be.equal(false)
    res.body.should.have.property('message').and.to.be.equal(`${deleteObj.length} call(s) are not found`)
  })

  it('should return error message if we didn"t pass callId in the request', async function () {
    deleteObj = Object.assign({}, deleteCallArr[0])
    delete deleteObj.callId
    deleteObj = [deleteObj]
    const res = await chai.request(server)
        .post(`${baseUrl}`)
        .set("authorization", authToken)
        .send(deleteObj)
    res.should.have.status(422)
    res.body.should.have.property('message').and.to.be.equal("Invalid request data")
  })

  it('should return error message if we pass reasonId that is not present in database', async function () {
    deleteObj = Object.assign({}, deleteCallArr[0])
    deleteObj.reasonId = deleteActionReasonsCount + 1
    deleteObj = [deleteObj]
    const res = await chai.request(server)
        .post(`${baseUrl}`)
        .set("authorization", authToken)
        .send(deleteObj)
    res.should.have.status(422)
    res.body.should.have.property('notFoundActionReasons').to.be.an('array')
    res.body.should.have.property('notFoundActionReasons').to.have.length(deleteObj.length)
    res.body.should.have.property('success').and.to.be.equal(false)
  })

  it('should "0 call(s) are deleted" message if we pass empty array as request', async function () {
    const res = await chai.request(server)
        .post(`${baseUrl}`)
        .set("authorization", authToken)
        .send([])
    res.should.have.status(200)
    res.body.should.have.property('deletedCalls').to.be.an('array')
    res.body.should.have.property('deletedCalls').to.have.length(0)
    res.body.should.have.property('success').and.to.be.equal(true)
    res.body.should.have.property('message').and.to.be.equal("0 call(s) are deleted")
  })

  it('should return error message if we pass 2 call ids with one reasonId present in database and another is not present in database', async function () {
    deleteObj = Object.assign({}, deleteCallArr[0]) // it will delete
    deleteObj2 = Object.assign({}, deleteCallArr[1]) // it won't delete
    deleteObj2.reasonId = deleteActionReasonsCount + 1
    let delObj = [deleteObj, deleteObj2]
    const res = await chai.request(server)
        .post(`${baseUrl}`)
        .set("authorization", authToken)
        .send(delObj)
    res.should.have.status(422)
    res.body.should.have.property('deletedCalls').to.be.an('array')
    res.body.should.have.property('deletedCalls').to.have.length(1)
    res.body.should.have.property('message').and.to.be.equal("1 call(s) are deleted")
    res.body.should.have.property('notFoundActionReasons').to.be.an('array')
    res.body.should.have.property('notFoundActionReasons').to.have.length(1)
    res.body.should.have.property('success').and.to.be.equal(false)
  })

  it('should return error message if we pass 2 call ids with one callId present in database and another is not present in database', async function () {
    deleteObj = Object.assign({}, deleteCallArr[2]) // it will delete
    deleteObj2 = Object.assign({}, deleteCallArr[3]) // it won't delete
    deleteObj2.callId = 'CLC-123456' + faker.random.number()
    let delObj = [deleteObj, deleteObj2]
    const res = await chai.request(server)
        .post(`${baseUrl}`)
        .set("authorization", authToken)
        .send(delObj)
    res.should.have.status(422)
    res.body.should.have.property('deletedCalls').to.be.an('array')
    res.body.should.have.property('deletedCalls').to.have.length(1)
    res.body.should.have.property('message').and.to.be.equal("1 call(s) are not found")
    res.body.should.have.property('notFoundCalls').to.be.an('array')
    res.body.should.have.property('notFoundCalls').to.have.length(1)
    res.body.should.have.property('success').and.to.be.equal(false)
  })

  it('should return success message if selected calls are deleted', async function () {
    deleteCallArr.splice(0, 1)
    deleteCallArr.splice(1, 1)
    const res = await chai.request(server)
        .post(`${baseUrl}`)
        .set("authorization", authToken)
        .send(deleteCallArr)
    res.should.have.status(200)
    res.body.should.have.property('deletedCalls').to.be.an('array')
    res.body.should.have.property('deletedCalls').to.have.length(deleteCallArr.length)
    res.body.should.have.property('success').and.to.be.equal(true)
    res.body.should.have.property('message').and.to.be.equal(`${deleteCallArr.length} call(s) are deleted`)
  })
});